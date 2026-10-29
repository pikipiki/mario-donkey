import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {LiveGame} from '../src/game';
import {Adventure} from '../src/adventure';
import {Controls} from '../src/controls';
import {PROFILE as P,word,writeWord} from '../src/profile';
import {readCampaign,writeCampaign,backupCampaign} from '../src/campaign';
import {loadStartState} from '../src/bootstrap';
import {createRecoveryState} from '../src/recovery';
import {waitForNativeFrames,waitForNativePause,type Emulator} from '../src/engine';
import type {SpriteAtlas} from '../src/atlas';

vi.mock('../src/campaign',()=>({readCampaign:vi.fn(),writeCampaign:vi.fn(),backupCampaign:vi.fn()}));
vi.mock('../src/bootstrap',()=>({loadStartState:vi.fn()}));
vi.mock('../src/recovery',()=>({createRecoveryState:vi.fn((_clean:Uint8Array,old:Uint8Array)=>{const result=old.slice();result[P.mode]=0x26;return result;})}));
vi.mock('../src/overlay',()=>({configureOverlay:vi.fn()}));
vi.mock('../src/engine',async original=>({...await original<typeof import('../src/engine')>(),
 resolveMemory:vi.fn(async(_m,address:number)=>address===0x7e1fe0?0:0x20000),
 resolveDrawing:vi.fn(async()=>0x28000),setNativeDrawing:vi.fn(),waitForNativeFrames:vi.fn(async()=>{}),waitForNativePause:vi.fn(async()=>{})
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

beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('location',{search:''});vi.mocked(writeCampaign).mockResolvedValue();vi.mocked(waitForNativePause).mockImplementation(async manager=>{manager.toggleMainLoop(0);});});
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
 it('captures only after native pause and preserves a visibility pause requested while waiting',async()=>{
  const {game,manager}=fixture();game.ready=true;game.wram[P.mode]=P.gameplay;
  let acknowledge!:()=>void;
  vi.mocked(waitForNativePause).mockImplementationOnce(m=>{m.toggleMainLoop(0);return new Promise(resolve=>{acknowledge=resolve;});});
  writeWord(game.gsu,P.x,100);const saving=game.save();
  expect(waitForNativePause).toHaveBeenCalledOnce();expect(manager.getState).not.toHaveBeenCalled();expect(writeCampaign).not.toHaveBeenCalled();
  // The last native iteration completes after pause was requested.
  writeWord(game.gsu,P.x,104);game.setPaused(true);
  expect(waitForNativePause).toHaveBeenCalledOnce();expect(manager.getState).not.toHaveBeenCalled();
  acknowledge();await saving;
  expect(manager.getState).toHaveBeenCalledOnce();expect(writeCampaign).toHaveBeenCalledOnce();
  expect(word(vi.mocked(writeCampaign).mock.calls[0][0],0x20000+P.x)).toBe(104);
  expect(game.paused).toBe(true);expect(manager.toggleMainLoop).not.toHaveBeenCalledWith(1);
 });
 it('captures the settled paused position and writes it after the earlier autosave',async()=>{
  const {game,heap,manager,emulator}=fixture();game.ready=true;
  let finishFirst!:()=>void;vi.mocked(writeCampaign).mockImplementationOnce(()=>new Promise(resolve=>{finishFirst=resolve;}));
  writeWord(game.gsu,P.x,100);const first=game.save();
  await vi.waitFor(()=>expect(writeCampaign).toHaveBeenCalledTimes(1));
  expect(word(vi.mocked(writeCampaign).mock.calls[0][0],0x20000+P.x)).toBe(100);
  manager.toggleMainLoop.mockClear();
  writeWord(game.gsu,P.x,240);game.adventure.animals=['squawks'];game.adventure.mount='squawks';game.setPaused(true);
  await vi.waitFor(()=>expect(manager.getState).toHaveBeenCalledTimes(2));
  // Mutation after capture must not change its copied bytes or partners.
  writeWord(game.gsu,P.x,999);game.adventure.animals.push('rambi');game.adventure.mount='rambi';
  finishFirst();await first;
  expect(writeCampaign).toHaveBeenCalledTimes(2);
  const [state,adventure]=vi.mocked(writeCampaign).mock.calls[1];
  expect(state).not.toBe(heap);expect(word(state,0x20000+P.x)).toBe(240);
  expect(adventure.mount).toBe('squawks');expect(adventure.animals).toEqual(['squawks']);
  expect(game.paused).toBe(true);expect(manager.toggleMainLoop).not.toHaveBeenCalledWith(1);
  expect(emulator.setVolume).toHaveBeenLastCalledWith(0);
 });
 it('coalesces overlapping capture requests while an older disk write is pending',async()=>{
  const {game,manager}=fixture();game.ready=true;let releaseWrite!:()=>void,acknowledge!:()=>void;
  vi.mocked(writeCampaign).mockImplementationOnce(()=>new Promise(resolve=>{releaseWrite=resolve;}));
  writeWord(game.gsu,P.x,10);const first=game.save();
  await vi.waitFor(()=>expect(writeCampaign).toHaveBeenCalledTimes(1));
  vi.mocked(waitForNativePause).mockImplementationOnce(m=>{m.toggleMainLoop(0);return new Promise(resolve=>{acknowledge=resolve;});});
  writeWord(game.gsu,P.x,20);const second=game.save();
  writeWord(game.gsu,P.x,30);const third=game.save();
  expect(manager.getState).toHaveBeenCalledTimes(1);expect(waitForNativePause).toHaveBeenCalledTimes(2);
  acknowledge();await vi.waitFor(()=>expect(manager.getState).toHaveBeenCalledTimes(2));
  expect(writeCampaign).toHaveBeenCalledTimes(1);
  releaseWrite();await Promise.all([first,second,third]);
  expect(writeCampaign).toHaveBeenCalledTimes(2);expect(manager.getState).toHaveBeenCalledTimes(2);
  expect(word(vi.mocked(writeCampaign).mock.calls[1][0],0x20000+P.x)).toBe(30);
 });
 it('still attempts the final captured snapshot if the earlier write fails',async()=>{
  const {game,manager}=fixture();game.ready=true;let fail!:(error:Error)=>void;
  vi.spyOn(console,'warn').mockImplementation(()=>{});
  vi.mocked(writeCampaign).mockImplementationOnce(()=>new Promise((_resolve,reject)=>{fail=reject;}));
  const first=game.save();await vi.waitFor(()=>expect(writeCampaign).toHaveBeenCalledTimes(1));
  writeWord(game.gsu,P.x,88);const second=game.save();await vi.waitFor(()=>expect(manager.getState).toHaveBeenCalledTimes(2));
  fail(new Error('Interrupted first write'));await Promise.all([first,second]);
  expect(writeCampaign).toHaveBeenCalledTimes(2);expect(word(vi.mocked(writeCampaign).mock.calls[1][0],0x20000+P.x)).toBe(88);
 });
 it('keeps the previous disk save when native pause cannot be confirmed',async()=>{
  const {game,manager}=fixture();game.ready=true;game.paused=true;
  vi.spyOn(console,'warn').mockImplementation(()=>{});
  vi.mocked(waitForNativePause).mockRejectedValueOnce(new Error('Native core did not stop'));
  await game.save();expect(manager.getState).not.toHaveBeenCalled();expect(writeCampaign).not.toHaveBeenCalled();
  expect(manager.toggleMainLoop).not.toHaveBeenCalledWith(1);
 });
});


describe('safe display repair',()=>{
 it('rebuilds the native map with no movement, after backing up the exact previous scene',async()=>{
  const {game,controls,manager}=fixture();game.ready=true;game.wram[P.mode]=P.gameplay;
  game.wram[P.stage]=3;writeWord(game.gsu,P.x,923);game.wram[0x400]=123;
  game.adventure.animals=['squawks'];game.adventure.mount='squawks';
  controls.keyboardDirection=1;controls.holdJump('touch',100);controls.activate('roll',100);
  const prior=new Uint8Array(manager.getState());
  vi.mocked(waitForNativeFrames).mockImplementation(async()=>{
   expect(backupCampaign).toHaveBeenCalledOnce();
   expect(controls.runAxis()).toBe(0);expect(controls.jumpHeld).toBe(false);
   expect(manager.loadState).toHaveBeenCalledOnce();expect(game.paused).toBe(true);
   await game.save();expect(writeCampaign).not.toHaveBeenCalled();
   game.wram[P.mode]=0x26;
  });
  await game.repairDisplay();
  expect(vi.mocked(backupCampaign).mock.calls[0][0].state).toEqual(prior);
  expect(game.wram[P.mode]).toBe(0x26);expect(game.wram[P.stage]).toBe(3);expect(game.wram[0x400]).toBe(123);
  expect(game.adventure.mount).toBe('squawks');expect(game.paused).toBe(true);
  expect(manager.toggleMainLoop).toHaveBeenLastCalledWith(0);
 });
 it('does not change the scene or save when the recovery copy cannot be written',async()=>{
  const {game}=fixture();game.ready=true;game.wram[P.mode]=P.gameplay;
  vi.mocked(backupCampaign).mockRejectedValueOnce(new Error('Storage full'));
  await expect(game.repairDisplay()).rejects.toThrow('Storage full');
  expect(game.wram[P.mode]).toBe(P.gameplay);expect(writeCampaign).not.toHaveBeenCalled();
 });
 it('rolls back a failed native repair and never autosaves its intermediate scene',async()=>{
  const {game,manager,heap}=fixture();game.ready=true;game.wram[P.mode]=P.gameplay;
  writeWord(game.gsu,P.x,786);
  vi.mocked(waitForNativeFrames).mockRejectedValueOnce(new Error('Stopped core')).mockImplementationOnce(async()=>{
   heap.set(manager.loadState.mock.calls.at(-1)![0]);
  });
  await expect(game.repairDisplay()).rejects.toThrow('Stopped core');
  expect(manager.loadState).toHaveBeenCalledTimes(2);expect(game.wram[P.mode]).toBe(P.gameplay);
  expect(word(game.gsu,P.x)).toBe(786);expect(writeCampaign).not.toHaveBeenCalled();expect(game.paused).toBe(true);
 });
 it.each([0x10,0x14,0x23,0x27,0x55])('does not force scene initialization during mode %s',async(mode)=>{
  const {game}=fixture();game.ready=true;game.wram[P.mode]=mode;
  await expect(game.repairDisplay()).rejects.toThrow('Wait for the level or world map');
  expect(game.wram[P.mode]).toBe(mode);expect(backupCampaign).not.toHaveBeenCalled();
 });
 it('keeps read failures visible instead of replacing an unreadable campaign with the initial map',async()=>{
  const {game}=fixture();vi.mocked(readCampaign).mockRejectedValueOnce(new Error('Incomplete saved state'));
  await expect(game.prepare()).rejects.toThrow('Incomplete saved state');
  expect(loadStartState).not.toHaveBeenCalled();expect(writeCampaign).not.toHaveBeenCalled();expect(game.ready).toBe(false);
 });
});

it('blocks all future saves and resumes if the recovery rollback cannot run',async()=>{
 const {game,manager}=fixture();game.ready=true;game.wram[P.mode]=P.gameplay;
 vi.mocked(waitForNativeFrames).mockRejectedValue(new Error('Core stalled'));
 await expect(game.repairDisplay()).rejects.toThrow('Your save is kept');
 expect(game.ready).toBe(false);manager.toggleMainLoop.mockClear();
 await game.save();game.setPaused(false);
 expect(writeCampaign).not.toHaveBeenCalled();expect(manager.toggleMainLoop).not.toHaveBeenCalledWith(1);
});

it('does not overwrite the campaign with a stalled mode-zero state',async()=>{
 const {game}=fixture();game.ready=true;game.wram[P.mode]=0;await game.save();expect(writeCampaign).not.toHaveBeenCalled();
});
it('offers recovery after a structurally valid resume lands in mode zero',async()=>{
 const {game}=fixture(),state=new Uint8Array(0x30000);vi.mocked(readCampaign).mockResolvedValue({state,adventure:new Adventure().serialize()});
 await expect(game.prepare()).rejects.toThrow('Repair display');expect(game.ready).toBe(false);expect(game.canRepairDisplay).toBe(true);
 expect(writeCampaign).not.toHaveBeenCalled();
});


it('repairs a failed native resume from the retained disk bytes rather than damaged live RAM',async()=>{
 const {game,manager,heap}=fixture(),state=new Uint8Array(0x30000),adventure=new Adventure();
 state[P.mode]=0x26;state[P.stage]=3;state[0x400]=123;writeWord(state,0x20000+P.x,786);
 adventure.animals=['squawks'];adventure.mount='squawks';adventure.active='pink';
 const original=state.slice(),partners=adventure.serialize();
 vi.mocked(readCampaign).mockResolvedValue({state,adventure:partners});
 vi.mocked(waitForNativeFrames).mockImplementationOnce(async()=>{
  // A failed native load leaves a superficially writable, damaged RAM image.
  heap.fill(0);heap[0x400]=7;
 });
 await expect(game.prepare()).rejects.toThrow('Repair display');expect(game.ready).toBe(false);
 state[0x400]=99;game.adventure.active='dk';manager.getState.mockClear();
 vi.mocked(waitForNativeFrames).mockImplementation(async()=>{
  heap.set(manager.loadState.mock.calls.at(-1)![0]);heap[P.mode]=0x26;
 });
 await game.repairDisplay();
 expect(manager.getState).not.toHaveBeenCalled();
 const backup=vi.mocked(backupCampaign).mock.calls[0][0];
 expect(backup.state).toEqual(original);expect(backup.state).not.toBe(state);
 expect(backup.adventure.active).toBe('pink');expect(backup.adventure.mount).toBe('squawks');
 expect(vi.mocked(createRecoveryState).mock.calls[0][1]).toEqual(original);
 expect(game.wram[0x400]).toBe(123);expect(game.wram[P.stage]).toBe(3);expect(game.ready).toBe(true);
 expect(game.character).toBe('pink');expect(game.adventure.mount).toBe('squawks');
 expect(writeCampaign).not.toHaveBeenCalled();
});

it('uses current safely paused progress for repair after a successful resume',async()=>{
 const {game,manager,heap}=fixture(),state=new Uint8Array(0x30000);
 state[P.mode]=0x26;state[0x400]=12;
 vi.mocked(readCampaign).mockResolvedValue({state,adventure:new Adventure().serialize()});
 await game.prepare();expect(game.ready).toBe(true);
 game.wram[0x400]=96;game.adventure.active='pink';manager.getState.mockClear();
 vi.mocked(waitForNativeFrames).mockImplementation(async()=>{
  heap.set(manager.loadState.mock.calls.at(-1)![0]);heap[P.mode]=0x26;
 });
 await game.repairDisplay();
 expect(waitForNativePause).toHaveBeenCalledOnce();expect(manager.getState).toHaveBeenCalledOnce();
 expect(vi.mocked(backupCampaign).mock.calls[0][0].state[0x400]).toBe(96);
 expect(vi.mocked(createRecoveryState).mock.calls[0][1][0x400]).toBe(96);
 expect(game.wram[0x400]).toBe(96);expect(game.character).toBe('pink');
});
