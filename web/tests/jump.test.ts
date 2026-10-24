import {describe,it,expect,vi} from 'vitest';
import {NativeJumpBoost,KONG_JUMP_VELOCITY,PROFILE as P,writeWord,word,signed16} from '../src/profile';
import {LiveGame} from '../src/game';
import {Controls} from '../src/controls';
import {INPUT,type Emulator} from '../src/engine';
import type {SpriteAtlas} from '../src/atlas';

vi.mock('../src/engine',async importOriginal=>({...await importOriginal<typeof import('../src/engine')>(),setNativeDrawing:vi.fn()}));
function airborne(g:Uint8Array,state:number,vy:number){writeWord(g,0xc0,state);writeWord(g,P.vy,vy);}

describe('one boost per native ground jump',()=>{
 it('waits for native takeoff, then ignores repeated presses until landing',()=>{
  const boost=new NativeJumpBoost(),g=new Uint8Array(0x8000);
  expect(boost.update(g,'foot',1000,true)).toBeUndefined();
  airborne(g,6,-0x480);expect(boost.update(g,'foot',1016,false)).toBe(KONG_JUMP_VELOCITY);
  airborne(g,6,-0x300);expect(boost.update(g,'foot',1032,true)).toBeUndefined();
  airborne(g,6,0);expect(boost.update(g,'foot',1100,true)).toBeUndefined();
  airborne(g,8,0x180);expect(boost.update(g,'foot',1200,true)).toBeUndefined();
  airborne(g,0,0);expect(boost.update(g,'foot',1500,true)).toBeUndefined();
  airborne(g,6,-0x480);expect(boost.update(g,'foot',1516,false)).toBe(KONG_JUMP_VELOCITY);
 });
 it('accepts a native takeoff that happened just before the bridge saw the press',()=>{
  const boost=new NativeJumpBoost(),g=new Uint8Array(0x8000);boost.update(g,'foot',1000,false);
  airborne(g,6,-0x480);expect(boost.update(g,'foot',1016,true)).toBe(KONG_JUMP_VELOCITY);
 });
 it('does not turn a ledge fall, an unknown airborne state or an expired request into a jump',()=>{
  for(const state of [6,8]){const boost=new NativeJumpBoost(),g=new Uint8Array(0x8000);airborne(g,state,-0x200);expect(boost.update(g,'foot',1000,true)).toBeUndefined();}
  const boost=new NativeJumpBoost(),g=new Uint8Array(0x8000);boost.update(g,'foot',1000,true);
  airborne(g,8,0x100);expect(boost.update(g,'foot',1016,true)).toBeUndefined();
  airborne(g,6,-0x200);expect(boost.update(g,'foot',1300,false)).toBeUndefined();
 });
 it('does not boost a jump that hit a ceiling before the next bridge tick',()=>{
  const boost=new NativeJumpBoost(),g=new Uint8Array(0x8000);boost.update(g,'foot',1000,true);
  airborne(g,6,0);expect(boost.update(g,'foot',1016,false)).toBeUndefined();
 });
 it('preserves Winky height and any stronger native launch',()=>{
  for(const [mount,vy,expected] of [['winky',-0x480,-0x700],['foot',-0x900,-0x900]] as const){
   const boost=new NativeJumpBoost(),g=new Uint8Array(0x8000);boost.update(g,mount,1000,true);
   airborne(g,6,vy);expect(boost.update(g,mount,1016,false)).toBe(expected);
  }
 });
 it('cancels pending boosts for locks, morphs, scripts, mount changes and non-gameplay',()=>{
  for(const address of [0xac,0xae,0x1ae,0x1b0]){
   const boost=new NativeJumpBoost(),g=new Uint8Array(0x8000);boost.update(g,'foot',1000,true);
   writeWord(g,address,2);airborne(g,6,-0x480);expect(boost.update(g,'foot',1016,false)).toBeUndefined();
   writeWord(g,address,0);expect(boost.update(g,'foot',1032,true)).toBeUndefined();
  }
  const boost=new NativeJumpBoost(),g=new Uint8Array(0x8000);boost.update(g,'foot',1000,true);
  airborne(g,6,-0x480);expect(boost.update(g,'winky',1016,false)).toBeUndefined();
  airborne(g,0,0);boost.update(g,'winky',1100,true);boost.update(g,'winky',1116,false,false);
  airborne(g,6,-0x480);expect(boost.update(g,'winky',1132,true)).toBeUndefined();
 });
});

function fixture(){
 const controls=new Controls(),simulateInput=vi.fn();
 const emulator={Module:{HEAPU8:new Uint8Array(0x28000)},gameManager:{simulateInput,toggleMainLoop:vi.fn()},setVolume:vi.fn()} as unknown as Emulator;
 const canvas={height:224,getContext:()=>({clearRect:vi.fn()})} as unknown as HTMLCanvasElement;
 const game=new LiveGame(emulator,controls,canvas,{draw:vi.fn()} as unknown as SpriteAtlas,vi.fn());
 game.gsuBase=0x20000;game.ready=true;game.wram[P.mode]=P.gameplay;writeWord(game.gsu,P.baby,0x8000);writeWord(game.wram,0x3b6,10);
 return {game,controls,simulateInput};
}
describe('jump bridge integration',()=>{
 it('keeps the native B input and applies the extra impulse only once after takeoff',()=>{
  const {game,controls,simulateInput}=fixture();game.adventure.mount='foot';controls.activate('jump',1000);game.tick(1000);
  expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,1);expect(word(game.gsu,P.vy)).toBe(0);
  airborne(game.gsu,6,-0x480);game.tick(1016);expect(signed16(word(game.gsu,P.vy))).toBe(KONG_JUMP_VELOCITY);
  airborne(game.gsu,6,0);controls.activate('jump',1300);game.tick(1300);expect(word(game.gsu,P.vy)).toBe(0);
 });
 it('keeps Squawks flight available in midair while respecting native locks and transformations',()=>{
  const {game,controls}=fixture();game.adventure.mount='squawks';airborne(game.gsu,8,0x180);controls.activate('jump',1000);game.tick(1000);
  expect(signed16(word(game.gsu,P.vy))).toBe(-0x180);
  for(const address of [0xac,0xae,0x1ae,0x1b0]){writeWord(game.gsu,address,2);writeWord(game.gsu,P.vy,0x180);game.tick(1100);expect(word(game.gsu,P.vy)).toBe(0x180);writeWord(game.gsu,address,0);}
 });
 it('does not replay a map confirmation jump when the next stage appears',()=>{
  const {game,controls}=fixture();game.adventure.mount='foot';game.wram[P.mode]=0x26;controls.activate('jump',1000);game.tick(1000);
  game.wram[P.mode]=P.gameplay;airborne(game.gsu,6,-0x300);game.tick(1100);expect(signed16(word(game.gsu,P.vy))).toBe(-0x300);
 });
 it('cancels an armed boost when movement is stopped',()=>{
  const {game,controls}=fixture();game.adventure.mount='foot';controls.activate('jump',1000);game.tick(1000);game.stop();
  airborne(game.gsu,6,-0x480);game.tick(1016);expect(signed16(word(game.gsu,P.vy))).toBe(-0x480);
 });
});
