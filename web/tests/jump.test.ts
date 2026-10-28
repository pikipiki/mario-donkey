import {describe,it,expect,vi} from 'vitest';
import {NativeJumpBoost,NativeFlutterInput,KONG_JUMP_VELOCITY,SQUAWKS_FLIGHT_VELOCITY,squawksFlightVelocity,PROFILE as P,writeWord,word,signed16} from '../src/profile';
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
 game.gsuBase=0x20000;game.ready=true;game.wram[P.mode]=P.gameplay;writeWord(game.gsu,P.y,180);writeWord(game.gsu,P.baby,0x8000);writeWord(game.wram,0x3b6,10);
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
  const {game,controls,simulateInput}=fixture();game.adventure.mount='squawks';airborne(game.gsu,8,0x180);controls.activate('jump',1000);game.tick(1000);
  expect(signed16(word(game.gsu,P.vy))).toBe(SQUAWKS_FLIGHT_VELOCITY);
  expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,0);
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

describe('Squawks sustained flight',()=>{
 it('launches with native B on the ground without overwriting the takeoff impulse',()=>{
  const {game,controls,simulateInput}=fixture();game.adventure.mount='squawks';controls.holdJump('keyboard',1000);game.tick(1000);
  expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,1);expect(word(game.gsu,P.vy)).toBe(0);
  airborne(game.gsu,6,-0x600);simulateInput.mockClear();game.tick(1016);
  expect(signed16(word(game.gsu,P.vy))).toBe(-0x600);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,0);
 });
 it('keeps flight available after a long hold without injecting a native flutter',()=>{
  const {game,controls,simulateInput}=fixture();game.adventure.mount='squawks';controls.holdJump('pointer:1',1000);
  airborne(game.gsu,8,0x100);game.tick(3000);
  expect(signed16(word(game.gsu,P.vy))).toBe(SQUAWKS_FLIGHT_VELOCITY);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,0);
  controls.releaseJump('pointer:1',3000);airborne(game.gsu,8,0x80);simulateInput.mockClear();game.tick(3016);
  expect(word(game.gsu,P.vy)).toBe(0x80);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,0);
 });
 it('does not start Yoshi flutter on repeated midair taps or push through a ceiling',()=>{
  const {game,controls,simulateInput}=fixture();game.adventure.mount='squawks';airborne(game.gsu,8,0x180);
  controls.activate('jump',1000);game.tick(1000);controls.activate('jump',1100);simulateInput.mockClear();game.tick(1160);
  expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,0);
  writeWord(game.gsu,0xfc,0x18);writeWord(game.gsu,P.vy,0);game.tick(1176);expect(word(game.gsu,P.vy)).toBe(0);
 });
 it('keeps map confirmation and baby rescue using their normal native controls',()=>{
  const {game,controls,simulateInput}=fixture();game.adventure.mount='squawks';airborne(game.gsu,8,0x180);
  game.wram[P.mode]=0x26;controls.holdJump('keyboard',1000);game.tick(1000);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,1);expect(word(game.gsu,P.vy)).toBe(0x180);
  game.wram[P.mode]=P.gameplay;writeWord(game.gsu,P.baby,0);simulateInput.mockClear();game.tick(1016);
  expect(game.adventure.mount).toBe('yoshi');expect(word(game.gsu,P.vy)).toBe(0x180);
 });
});

describe('Yoshi flutter versus Kong ground jumps',()=>{
 it('keeps Yoshi B held beyond the old 750ms cutoff and releases it without replacing native vertical physics',()=>{
  const {game,controls,simulateInput}=fixture();game.adventure.mount='yoshi';controls.holdJump('keyboard',1000);game.tick(1000);
  airborne(game.gsu,7,0x180);writeWord(game.gsu,0xd2,2);simulateInput.mockClear();game.tick(2500);
  expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,1);expect(word(game.gsu,P.vy)).toBe(0x180);expect(word(game.gsu,0xd2)).toBe(2);
  controls.releaseJump('keyboard',2500);simulateInput.mockClear();game.tick(2516);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,0);
 });
 it('limits both Donkey and Diddy on foot to the initial hop and denies midair flutter taps',()=>{
  for(const character of ['dk','diddy'] as const){
   const {game,controls,simulateInput}=fixture();game.adventure.select(character);game.adventure.mount='foot';
   controls.holdJump('pointer:1',1000);game.tick(1000);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,1);
   airborne(game.gsu,6,-0x480);game.tick(1016);expect(signed16(word(game.gsu,P.vy))).toBe(KONG_JUMP_VELOCITY);
   airborne(game.gsu,7,0x180);simulateInput.mockClear();game.tick(1600);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,0);
   controls.releaseJump('pointer:1',1600);controls.holdJump('pointer:1',1700);simulateInput.mockClear();game.tick(1700);
   expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,0);expect(word(game.gsu,P.vy)).toBe(0x180);
   airborne(game.gsu,0,0);controls.releaseJump('pointer:1',1900);controls.holdJump('pointer:1',2000);simulateInput.mockClear();game.tick(2000);
   expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,1);
  }
 });
 it('does not introduce a second B press during an early repeat tap in the same Kong jump',()=>{
  const {game,controls,simulateInput}=fixture();game.adventure.mount='foot';controls.activate('jump',1000);game.tick(1000);
  airborne(game.gsu,6,-0x480);game.tick(1016);controls.activate('jump',1100);game.tick(1100);
  simulateInput.mockClear();game.tick(1160);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,0);
 });
 it('allows the native flutter when either Kong rides Yoshi',()=>{
  for(const character of ['dk','diddy'] as const){
   const {game,controls,simulateInput}=fixture();game.adventure.select(character);game.adventure.mount='yoshi';
   controls.holdJump('pointer:1',1000);game.tick(1000);airborne(game.gsu,7,0x100);simulateInput.mockClear();game.tick(3000);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,0);
   simulateInput.mockClear();game.tick(3060);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,1);
  }
 });
 it('keeps a short click able to launch a Kong before its release is consumed',()=>{
  const {game,controls,simulateInput}=fixture();controls.holdJump('pointer:1',1000);controls.releaseJump('pointer:1',1010);game.tick(1016);
  expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,1);
 });
});


describe('native flutter edge for a continuous Yoshi hold',()=>{
 it('releases once at descent then lets the native flutter finish without infinite retriggers',()=>{
  const input=new NativeFlutterInput(),g=new Uint8Array(0x8000);
  expect(input.pressed(g,1000,1,true,true,true)).toBe(true);airborne(g,7,0x180);
  expect(input.pressed(g,1500,1,true,true,true)).toBe(false);expect(input.pressed(g,1559,1,true,true,true)).toBe(false);
  expect(input.pressed(g,1560,1,true,true,true)).toBe(true);writeWord(g,0xd2,2);expect(input.pressed(g,1600,1,true,true,true)).toBe(true);
  writeWord(g,0xd2,0);expect(input.pressed(g,2400,1,true,true,true)).toBe(true);
  expect(input.pressed(g,2500,1,false,false,true)).toBe(false);
 });
 it('preserves a manual flutter already started and never pulses for other mounts or scripts',()=>{
  const input=new NativeFlutterInput(),g=new Uint8Array(0x8000);airborne(g,7,0x180);writeWord(g,0xd2,2);
  expect(input.pressed(g,1000,1,true,true,true)).toBe(true);writeWord(g,0xd2,0);
  expect(input.pressed(g,1100,1,true,true,false)).toBe(true);expect(input.pressed(g,1200,1,true,false,false)).toBe(false);
 });
 it('can start a fresh cycle after landing or a new physical press',()=>{
  const input=new NativeFlutterInput(),g=new Uint8Array(0x8000);airborne(g,7,0x180);
  expect(input.pressed(g,1000,1,true,true,true)).toBe(false);expect(input.pressed(g,1100,2,true,true,true)).toBe(false);
  expect(input.pressed(g,1160,2,true,true,true)).toBe(true);airborne(g,0,0);input.pressed(g,2000,2,true,true,true);
  airborne(g,8,0x180);expect(input.pressed(g,2100,2,true,true,true)).toBe(false);
 });
});


describe('Squawks ascent near the visible top',()=>{
 it('uses a faster sustained rise and preserves stronger launches when there is headroom',()=>{
  expect(squawksFlightVelocity(0x100,180)).toBe(-0x400);
  expect(squawksFlightVelocity(-0x600,180)).toBe(-0x600);
 });
 it('brakes before the rider leaves the viewport without moving the player directly',()=>{
  expect(squawksFlightVelocity(-0x400,34)).toBe(-0x2a0);
  expect(squawksFlightVelocity(-0x400,32)).toBe(-0xa0);
  expect(squawksFlightVelocity(-0x400,20)).toBe(-0xa0);
 });
});
