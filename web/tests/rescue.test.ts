import {describe,it,expect,vi} from 'vitest';
import {LiveGame} from '../src/game';
import {Controls} from '../src/controls';
import {PROFILE as P,writeWord,word} from '../src/profile';
import {setNativeDrawing,type Emulator,INPUT} from '../src/engine';
import type {SpriteAtlas} from '../src/atlas';
vi.mock('../src/engine',async importOriginal=>({...await importOriginal<typeof import('../src/engine')>(),setNativeDrawing:vi.fn()}));
function fixture(){
 const heap=new Uint8Array(0x28000),controls=new Controls();
 const simulateInput=vi.fn();const emulator={Module:{HEAPU8:heap},setVolume:vi.fn(),gameManager:{simulateInput,toggleMainLoop:vi.fn()}} as unknown as Emulator;
 const ctx={clearRect:vi.fn()} as unknown as CanvasRenderingContext2D;
 const overlay={height:224,getContext:()=>ctx} as unknown as HTMLCanvasElement;
 const game=new LiveGame(emulator,controls,overlay,{draw:vi.fn()} as unknown as SpriteAtlas,vi.fn());game.gsuBase=0x20000;game.ready=true;game.wram[P.mode]=P.gameplay;
 writeWord(game.gsu,P.baby,0x8000);writeWord(game.wram,0x3b6,10);
 return {game,controls,simulateInput};
}
describe('native Baby Mario rescue bridge',()=>{
 it.each([
  ['contact',1,0,1,1],
  ['tongue',11,8,0x8000,8],
 ] as const)('keeps native %s recovery locked until Mario is back on Yoshi',(_name,mode,captured,playerLock,spriteLock)=>{
  const {game,controls}=fixture();controls.setStick(1,0,1000);
  writeWord(game.gsu,P.baby,0);writeWord(game.gsu,P.invincible,24);
  writeWord(game.gsu,0x1ae,playerLock);writeWord(game.gsu,0x1b0,spriteLock);
  writeWord(game.gsu,0x19d6,mode);writeWord(game.wram,0xd9c,captured);
  writeWord(game.wram,0xd9e,1);writeWord(game.wram,0x3b6,50);
  for(const now of [1000,1016,1032]){
   game.tick(now);
   expect(word(game.gsu,0x1ae)).toBe(playerLock);expect(word(game.gsu,0x1b0)).toBe(spriteLock);
   expect(word(game.gsu,P.baby)).toBe(0);expect(word(game.gsu,P.invincible)).toBe(24);
   expect(word(game.gsu,0x19d6)).toBe(mode);expect(word(game.wram,0xd9c)).toBe(captured);
   expect(word(game.wram,0xd9e)).toBe(1);expect(word(game.wram,0x3b6)).toBe(50);
  }
  // The core finishes the return and releases its own locks.
  writeWord(game.gsu,P.baby,0x8000);writeWord(game.gsu,0x1ae,0);writeWord(game.gsu,0x1b0,0);
  writeWord(game.gsu,0x19d6,0);writeWord(game.wram,0xd9c,0);writeWord(game.wram,0xd9e,0);
  writeWord(game.gsu,P.invincible,23);game.tick(1048);
  expect(word(game.gsu,P.baby)).toBe(0x8000);expect(word(game.gsu,P.invincible)).toBe(23);
  expect(word(game.gsu,0x1ae)).toBe(0);expect(word(game.gsu,0x1b0)).toBe(0);
  expect(word(game.wram,0x3b6)).toBe(50);
 });
 it('switches before the current frame inputs, restores Yoshi and cancels the roll',()=>{
 const {game,controls,simulateInput}=fixture();game.adventure.mount='foot';controls.rollUntil=1600;controls.jumpUntil=1300;controls.jumpSequence=1;
 writeWord(game.gsu,P.baby,0);writeWord(game.gsu,0x1ae,1);game.tick(1000);
 expect(game.adventure.mount).toBe('yoshi');expect(controls.rollUntil).toBe(0);expect(setNativeDrawing).toHaveBeenLastCalledWith(game.emulator.Module.HEAPU8,0,false);
 expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,1);expect(word(game.gsu,P.vy)).toBe(0);expect(word(game.gsu,P.baby)).toBe(0);expect(word(game.gsu,0x1ae)).toBe(0);
 });
 it('keeps the selected mount when Mario is safe and never changes his native recovery flag',()=>{
 const {game}=fixture();game.adventure.mount='foot';game.tick(1000);expect(game.adventure.mount).toBe('foot');expect(word(game.gsu,P.baby)).toBe(0x8000);
 });
 it('does not reset the chosen character when Mario is recovered',()=>{
 const {game}=fixture();game.adventure.select('pink');writeWord(game.gsu,P.baby,0);game.tick(1000);writeWord(game.gsu,P.baby,0x8000);game.tick(1100);expect(game.character).toBe('pink');expect(game.adventure.mount).toBe('yoshi');
 });
});

describe('pause audio routing',()=>{
 it('mutes without suspending the context, avoiding an async suspend/resume race',()=>{
 const {game}=fixture();game.ready=false;const audioCtx={state:'running',resume:vi.fn().mockResolvedValue(undefined),suspend:vi.fn()} as unknown as AudioContext;
 game.emulator.Module.AL={currentCtx:{audioCtx}};game.setPaused(true);expect(game.emulator.setVolume).toHaveBeenCalledWith(0);expect(audioCtx.suspend).not.toHaveBeenCalled();
 });
});

describe('original SNES rescue counter',()=>{
 it('never refills or replaces the native star reserve on damage, including five remaining stars',()=>{
  for(const stars of [0,1,50,100,109,300]){
   const {game}=fixture();writeWord(game.wram,0x3b6,stars);writeWord(game.gsu,P.baby,0);
   game.tick(1000);expect(game.adventure.mount).toBe('yoshi');expect(word(game.wram,0x3b6)).toBe(stars);
   game.tick(6000);game.tick(11000);expect(word(game.wram,0x3b6)).toBe(stars);
  }
 });
 it('preserves native depletion, gradual recovery and a second hit before reaching ten',()=>{
  const {game}=fixture();writeWord(game.gsu,P.baby,0);writeWord(game.wram,0x3b6,100);game.tick(1000);
  writeWord(game.wram,0x3b6,40);game.tick(5000);expect(word(game.wram,0x3b6)).toBe(40);
  writeWord(game.gsu,P.baby,0x8000);game.tick(5100);writeWord(game.wram,0x3b6,50);game.tick(6000);
  writeWord(game.gsu,P.baby,0);game.tick(6100);expect(word(game.wram,0x3b6)).toBe(50);
  writeWord(game.wram,0x3b6,0);game.tick(10000);expect(word(game.wram,0x3b6)).toBe(0);
 });
 it('does not change native timer values across pause and resume',()=>{
  const {game}=fixture();vi.spyOn(game,'save').mockResolvedValue();vi.spyOn(game,'unlockAudio').mockResolvedValue();
  writeWord(game.gsu,P.baby,0);writeWord(game.wram,0x3b6,70);game.tick(1000);
  game.setPaused(true);game.tick(14000);game.setPaused(false);game.tick(15000);expect(word(game.wram,0x3b6)).toBe(70);
 });
});

it('transmet Haut + Langue après un geste mobile relâché, sans changer bébé ou son compteur',()=>{
 const {game,controls,simulateInput}=fixture();writeWord(game.gsu,P.baby,0);writeWord(game.wram,0x3b6,50);game.tick(1000);
 controls.setStick(0,-1,1100);controls.releaseStick();controls.activate('tongue',1200);simulateInput.mockClear();game.tick(1200);
 expect(simulateInput).toHaveBeenCalledWith(0,INPUT.up,1);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.y,1);
 expect(simulateInput).toHaveBeenCalledWith(0,INPUT.left,0);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.right,0);
 expect(word(game.gsu,P.baby)).toBe(0);expect(word(game.wram,0x3b6)).toBe(50);
 simulateInput.mockClear();game.tick(1400);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.up,0);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.y,0);
});
