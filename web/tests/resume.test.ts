import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {LiveGame} from '../src/game';
import {Adventure} from '../src/adventure';
import {Controls} from '../src/controls';
import {PROFILE as P,word,writeWord} from '../src/profile';
import {readCampaign,writeCampaign} from '../src/campaign';
import {loadStartState} from '../src/bootstrap';
import {waitForNativeFrames,type Emulator} from '../src/engine';
import type {SpriteAtlas} from '../src/atlas';

vi.mock('../src/campaign',()=>({readCampaign:vi.fn(),writeCampaign:vi.fn()}));
vi.mock('../src/bootstrap',()=>({loadStartState:vi.fn()}));
vi.mock('../src/overlay',()=>({configureOverlay:vi.fn()}));
vi.mock('../src/engine',async original=>({...await original<typeof import('../src/engine')>(),
 resolveMemory:vi.fn(async(_m,address:number)=>address===0x7e1fe0?0:0x20000),
 resolveDrawing:vi.fn(async()=>0x28000),setNativeDrawing:vi.fn(),waitForNativeFrames:vi.fn(async()=>{})
}));

function fixture(){
 const heap=new Uint8Array(0x30000),controls=new Controls();let pendingState:Uint8Array|undefined;
 heap[P.mode]=0x55; // Title mode before the asynchronous native load task runs.
 const manager={simulateInput:vi.fn(),toggleMainLoop:vi.fn(),getState:vi.fn(()=>heap.slice()),
  loadState:vi.fn((state:Uint8Array)=>{pendingState=state;}),functions:{getFrameNum:()=>10,getVideoDimensions:()=>239,toggleFastForward:vi.fn()}};
 // The real C wrapper enqueues a RetroArch task: loadState returning does not
 // mean the native memory has been restored. It needs the loop to run first.
 vi.mocked(waitForNativeFrames).mockImplementation(async(m)=>{
  expect(m).toBe(manager);expect(manager.toggleMainLoop).toHaveBeenLastCalledWith(1);
  if(pendingState){heap.set(pendingState);pendingState=undefined;}
 });
 const emulator={Module:{HEAPU8:heap},gameManager:manager,setVolume:vi.fn()} as unknown as Emulator;
 const game=new LiveGame(emulator,controls,{} as HTMLCanvasElement,{} as SpriteAtlas,vi.fn());
 vi.spyOn(game,'unlockAudio').mockResolvedValue();
 game.gsuBase=0x20000;
 return {game,controls,manager,heap,emulator};
}

beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('location',{search:''});vi.mocked(writeCampaign).mockResolvedValue();});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('resume the saved native scene',()=>{
 it('rejects an invalid restored mode without falling back to a new campaign or overwriting the save',async()=>{
  const {game}=fixture(),state=new Uint8Array(0x30000);
  state[P.mode]=0x55;
  vi.mocked(readCampaign).mockResolvedValue({state,adventure:new Adventure().serialize()});
  await expect(game.prepare()).rejects.toThrow('Your saved game could not be restored.');
  expect(waitForNativeFrames).toHaveBeenCalledTimes(1);
  expect(game.wram[P.mode]).toBe(0x55);expect(game.ready).toBe(false);
  expect(loadStartState).not.toHaveBeenCalled();expect(writeCampaign).not.toHaveBeenCalled();
 });
 it.each([0x13,0x14,0x26])('keeps mode %s, room, position and partners instead of forcing the map',async(mode)=>{
  const {game,controls,manager}=fixture(),state=new Uint8Array(0x30000),a=new Adventure();
  state[P.mode]=mode;state[P.stage]=3;state[0x34]=7;writeWord(state,0x32,0x152);
  writeWord(state,0x20000+P.x,1234);writeWord(state,0x20000+P.y,567);writeWord(state,0x20000+P.baby,0x8000);
  a.animals=['squawks'];a.mount='squawks';a.active='pink';
  vi.mocked(readCampaign).mockResolvedValue({state,adventure:a.serialize()});
  controls.holdJump('keyboard',1000);controls.keyboardDirection=1;controls.activate('roll',1000);
  const goToMap=vi.spyOn(game,'goToMap');await game.prepare();
  expect(game.ready).toBe(true);expect(game.wram[P.mode]).toBe(mode);expect(game.wram[P.stage]).toBe(3);
  expect(word(game.wram,0x32)).toBe(0x152);expect(game.wram[0x34]).toBe(7);
  expect(word(game.gsu,P.x)).toBe(1234);expect(word(game.gsu,P.y)).toBe(567);
  expect(game.adventure.mount).toBe('squawks');expect(game.character).toBe('pink');
  expect(goToMap).not.toHaveBeenCalled();expect(loadStartState).not.toHaveBeenCalled();expect(waitForNativeFrames).toHaveBeenCalledTimes(1);
  expect(controls.jumpHeld).toBe(false);expect(controls.runAxis()).toBe(0);expect(controls.rollUntil).toBe(0);
  for(let button=0;button<12;button++)expect(manager.simulateInput).toHaveBeenCalledWith(0,button,0);
  expect(manager.toggleMainLoop).toHaveBeenLastCalledWith(1);
 });
});

describe('latest position wins when leaving during an autosave',()=>{
 it('captures the paused position immediately and writes it after the earlier autosave',async()=>{
  const {game,heap,manager,emulator}=fixture();game.ready=true;
  let finishFirst!:()=>void;vi.mocked(writeCampaign).mockImplementationOnce(()=>new Promise(resolve=>{finishFirst=resolve;}));
  writeWord(game.gsu,P.x,100);const first=game.save();
  expect(writeCampaign).toHaveBeenCalledTimes(1);expect(word(vi.mocked(writeCampaign).mock.calls[0][0],0x20000+P.x)).toBe(100);
  writeWord(game.gsu,P.x,240);game.adventure.animals=['squawks'];game.adventure.mount='squawks';game.setPaused(true);
  // Later mutation must not corrupt the position or companions captured on hide.
  writeWord(game.gsu,P.x,999);game.adventure.animals.push('rambi');game.adventure.mount='rambi';
  manager.toggleMainLoop.mockClear();finishFirst();await first;
  expect(writeCampaign).toHaveBeenCalledTimes(2);
  const [state,adventure]=vi.mocked(writeCampaign).mock.calls[1];
  expect(state).not.toBe(heap);expect(word(state,0x20000+P.x)).toBe(240);
  expect(adventure.mount).toBe('squawks');expect(adventure.animals).toEqual(['squawks']);
  expect(game.paused).toBe(true);expect(manager.toggleMainLoop).not.toHaveBeenCalledWith(1);
  expect(emulator.setVolume).toHaveBeenLastCalledWith(0);
 });
 it('keeps the newest queued snapshot when visibilitychange and pagehide follow each other',async()=>{
  const {game}=fixture();game.ready=true;let release!:()=>void;
  vi.mocked(writeCampaign).mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
  writeWord(game.gsu,P.x,10);const saving=game.save();
  writeWord(game.gsu,P.x,20);game.save();writeWord(game.gsu,P.x,30);game.save();release();await saving;
  expect(writeCampaign).toHaveBeenCalledTimes(2);expect(word(vi.mocked(writeCampaign).mock.calls[1][0],0x20000+P.x)).toBe(30);
 });
 it('still attempts the final snapshot if the earlier write fails',async()=>{
  const {game}=fixture();game.ready=true;let fail!:(error:Error)=>void;
  vi.spyOn(console,'warn').mockImplementation(()=>{});
  vi.mocked(writeCampaign).mockImplementationOnce(()=>new Promise((_resolve,reject)=>{fail=reject;}));
  const saving=game.save();writeWord(game.gsu,P.x,88);game.save();fail(new Error('Interrupted first write'));await saving;
  expect(writeCampaign).toHaveBeenCalledTimes(2);expect(word(vi.mocked(writeCampaign).mock.calls[1][0],0x20000+P.x)).toBe(88);
 });
});
