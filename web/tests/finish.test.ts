import {beforeEach,describe,expect,it,vi} from 'vitest';
import {LiveGame} from '../src/game';
import {Controls} from '../src/controls';
import {PROFILE as P,inGoal,writeWord,word} from '../src/profile';
import {INPUT,setNativeDrawing,type Emulator} from '../src/engine';
import type {SpriteAtlas} from '../src/atlas';

vi.mock('../src/engine',async importOriginal=>({...await importOriginal<typeof import('../src/engine')>(),setNativeDrawing:vi.fn()}));

function fixture(){
 const heap=new Uint8Array(0x28000),controls=new Controls();
 const simulateInput=vi.fn(),draw=vi.fn(),clearRect=vi.fn();
 const emulator={Module:{HEAPU8:heap},setVolume:vi.fn(),gameManager:{simulateInput,toggleMainLoop:vi.fn()}} as unknown as Emulator;
 const ctx={clearRect} as unknown as CanvasRenderingContext2D;
 const overlay={height:224,getContext:()=>ctx} as unknown as HTMLCanvasElement;
 const game=new LiveGame(emulator,controls,overlay,{draw} as unknown as SpriteAtlas,vi.fn());
 game.gsuBase=0x20000;game.ready=true;game.adventure.mount='foot';game.wram[P.mode]=P.gameplay;
 game.wram[0x200]=15;writeWord(game.gsu,P.baby,0x8000);writeWord(game.wram,0x3b6,10);
 return {game,controls,simulateInput,draw,clearRect};
}

beforeEach(()=>vi.clearAllMocks());

describe('native goal handoff',()=>{
 it('recognizes the actual even player state, without treating an idle nearby ring as a finish',()=>{
  const g=new Uint8Array(0x8000);
  writeWord(g,0xac,0x14);expect(inGoal(g)).toBe(true);
  writeWord(g,0xac,0x15);expect(inGoal(g)).toBe(false);
  writeWord(g,0xac,0);writeWord(g,P.baby,0x8000);writeWord(g,P.spriteId,0x0d);writeWord(g,P.spriteState,0x10);
  expect(inGoal(g)).toBe(false);
  writeWord(g,0x1ae,1);expect(inGoal(g)).toBe(false);
 });

 it('restores native Yoshi and removes the canvas character before the gameplay handoff returns',()=>{
  const {game,controls,draw,clearRect}=fixture();game.tick(1000);
  expect(setNativeDrawing).toHaveBeenLastCalledWith(game.emulator.Module.HEAPU8,0,true);expect(draw).toHaveBeenCalled();
  writeWord(game.gsu,0xac,0x14);writeWord(game.gsu,0x1ae,1);writeWord(game.gsu,0x1b0,1);
  writeWord(game.gsu,P.vx,0x120);writeWord(game.gsu,P.vy,0xff80);
  controls.activate('right',1100);controls.activate('roll',1100);controls.activate('jump',1100);
  const nativeBefore=game.gsu.slice();draw.mockClear();clearRect.mockClear();game.tick(1100);
  expect(setNativeDrawing).toHaveBeenLastCalledWith(game.emulator.Module.HEAPU8,0,false);
  expect(clearRect).toHaveBeenCalled();expect(draw).not.toHaveBeenCalled();
  expect(game.gsu).toEqual(nativeBefore);expect(controls.direction).toBe(0);expect(controls.rollUntil).toBe(0);
 });

 it('does not mistake a hit beside the circle for a victory or block Baby Mario rescue',()=>{
  const {game,draw,controls}=fixture();game.tick(1000);draw.mockClear();controls.activate('right',1100);
  writeWord(game.gsu,P.spriteId,0x0d);writeWord(game.gsu,P.spriteState,0x10);
  writeWord(game.gsu,0x1ae,1);writeWord(game.gsu,0x1b0,1);writeWord(game.gsu,P.invincible,0xa0);
  game.tick(1100);
  expect(setNativeDrawing).toHaveBeenLastCalledWith(game.emulator.Module.HEAPU8,0,true);expect(draw).toHaveBeenCalled();
  expect(word(game.gsu,0x1ae)).toBe(0);expect(word(game.gsu,0x1b0)).toBe(0);expect(controls.direction).toBe(1);
  expect(word(game.gsu,P.baby)).toBe(0x8000);expect(word(game.gsu,P.spriteId)).toBe(0x0d);expect(word(game.gsu,P.spriteState)).toBe(0x10);
 });

 it('clears inherited controls once on native victory, preserves game data and accepts later confirmation',()=>{
  const {game,controls,simulateInput,draw}=fixture();game.tick(1000);draw.mockClear();
  controls.activate('right',1100);controls.activate('roll',1100);controls.activate('jump',1100);
  game.wram[P.mode]=P.victory;writeWord(game.gsu,0xac,0x14);writeWord(game.gsu,P.spriteId,0x0d);writeWord(game.gsu,P.spriteState,0x10);
  writeWord(game.gsu,0x1ecc,0x00ff);writeWord(game.gsu,0xde,6);
  const nativeBefore=game.gsu.slice();game.tick(1100);
  expect(game.gsu).toEqual(nativeBefore);expect(draw).not.toHaveBeenCalled();
  expect(setNativeDrawing).toHaveBeenLastCalledWith(game.emulator.Module.HEAPU8,0,false);
  expect(controls.direction).toBe(0);expect(controls.rollUntil).toBe(0);expect(controls.jumpUntil).toBe(0);
  controls.pulse(INPUT.a,1200);simulateInput.mockClear();game.tick(1200);
  expect(simulateInput).toHaveBeenCalledWith(0,INPUT.a,1);
  game.wram[P.mode]=0x26;controls.activate('egg',1500);simulateInput.mockClear();game.tick(1500);
  expect(simulateInput).toHaveBeenCalledWith(0,INPUT.b,1);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.right,0);
 });

 it('restores the selected character after the next stage starts, without a delayed custom jump',()=>{
  const {game,controls,draw}=fixture();game.wram[P.mode]=P.victory;controls.activate('jump',1000);game.tick(1000);
  game.wram[P.mode]=P.gameplay;writeWord(game.gsu,0xac,0);writeWord(game.gsu,P.vy,0);draw.mockClear();game.tick(2000);
  expect(setNativeDrawing).toHaveBeenLastCalledWith(game.emulator.Module.HEAPU8,0,true);expect(draw).toHaveBeenCalled();
  expect(word(game.gsu,P.vy)).toBe(0);expect(game.adventure.mount).toBe('foot');
 });
});


it('keeps the character below a native instruction window by restoring native drawing',()=>{
 const {game,draw}=fixture();game.tick(1000);draw.mockClear();game.wram[0xd11]=9;game.tick(1100);
 expect(setNativeDrawing).toHaveBeenLastCalledWith(game.emulator.Module.HEAPU8,0,false);expect(draw).not.toHaveBeenCalled();
 game.wram[0xd11]=0;game.tick(1200);expect(setNativeDrawing).toHaveBeenLastCalledWith(game.emulator.Module.HEAPU8,0,true);expect(draw).toHaveBeenCalled();
});
