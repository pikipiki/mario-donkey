import {beforeEach,describe,expect,it,vi} from 'vitest';
import {AnimalAudio} from '../src/animal-sound';
import {LiveGame} from '../src/game';
import {Controls} from '../src/controls';
import {PROFILE as P,writeWord} from '../src/profile';
import type {Emulator} from '../src/engine';
import type {SpriteAtlas} from '../src/atlas';
vi.mock('../src/engine',async original=>({...await original<typeof import('../src/engine')>(),setNativeDrawing:vi.fn()}));
function fixture(){
 const heap=new Uint8Array(0x28000),controls=new Controls();
 const emulator={Module:{HEAPU8:heap},setVolume:vi.fn(),gameManager:{simulateInput:vi.fn(),toggleMainLoop:vi.fn()}} as unknown as Emulator;
 const ctx={clearRect:vi.fn(),save:vi.fn(),restore:vi.fn(),fillRect:vi.fn()} as unknown as CanvasRenderingContext2D;
 const game=new LiveGame(emulator,controls,{height:224,getContext:()=>ctx} as unknown as HTMLCanvasElement,{draw:vi.fn()} as unknown as SpriteAtlas,vi.fn());
 game.gsuBase=0x20000;game.ready=true;game.wram[P.mode]=P.gameplay;
 game.wram[0x200]=15;writeWord(game.gsu,P.baby,0x8000);writeWord(game.wram,0x3b6,100);
 game.adventure.animals=['rambi','winky','expresso','enguarde','squawks'];
 const play=vi.spyOn(AnimalAudio.prototype,'play').mockReturnValue(true),stop=vi.spyOn(AnimalAudio.prototype,'stop');
 return {game,controls,play,stop};
}
beforeEach(()=>vi.restoreAllMocks());
describe('animal sound bridge in native gameplay',()=>{
 it('mounts once, sounds real takeoff and landing, then stops FX on pause',()=>{
  const {game,play,stop}=fixture();game.mount('rambi');expect(play).toHaveBeenLastCalledWith('animal-mount');
  game.tick(1000);play.mockClear();game.tick(1016);expect(play).not.toHaveBeenCalled();
  writeWord(game.gsu,0xc0,6);writeWord(game.gsu,P.vy,0xff00);game.tick(1032);
  expect(play).toHaveBeenCalledWith('animal-jump');play.mockClear();game.tick(1048);expect(play).not.toHaveBeenCalled();
  writeWord(game.gsu,0xc0,0);writeWord(game.gsu,P.vy,0);game.tick(1064);expect(play).toHaveBeenCalledWith('rambi-land');
  vi.spyOn(game,'save').mockResolvedValue();game.setPaused(true);expect(stop).toHaveBeenCalled();
 });
 it('plays Enguarde attack once per roll and skips map/dialogue inputs',()=>{
  const {game,play,controls}=fixture();game.mount('enguarde');game.tick(1000);play.mockClear();
  controls.activate('roll',1016);game.tick(1016);game.tick(1032);expect(play).toHaveBeenCalledExactlyOnceWith('enguarde-attack');
  play.mockClear();game.wram[P.mode]=0x26;game.tick(1100);expect(play).not.toHaveBeenCalled();
  game.wram[P.mode]=P.gameplay;game.wram[0xd11]=1;game.tick(1200);expect(play).not.toHaveBeenCalled();
 });
 it('Baby Mario escaping switches to Yoshi without continuing the old flight effects',()=>{
  const {game,play}=fixture();game.mount('squawks');game.tick(1000);play.mockClear();
  writeWord(game.gsu,P.baby,0);game.tick(1016);expect(game.adventure.mount).toBe('yoshi');expect(play).not.toHaveBeenCalled();
 });
});

it('plays the tag impact once at hand contact, never on the initial button or duplicate frames',()=>{
 const{game,controls,play}=fixture();let frame=0;(game.emulator.gameManager as unknown as{functions:unknown}).functions={getFrameNum:()=>frame};game.tick(1000);play.mockClear();expect(game.requestTeamSwap()).toBe(true);expect(play).not.toHaveBeenCalled();
 for(frame=1;frame<=12;frame++)game.tick(1000+frame*16);expect(play).not.toHaveBeenCalled();frame=13;game.tick(1210);expect(play).toHaveBeenCalledExactlyOnceWith('animal-hit');for(let i=0;i<10;i++)game.tick(1211+i);expect(play).toHaveBeenCalledTimes(1);for(frame=14;frame<40;frame++)game.tick(1000+frame*16);expect(play).toHaveBeenCalledTimes(1);
});
