import {describe,it,expect,vi} from 'vitest';
import {LiveGame} from '../src/game';
import {Controls} from '../src/controls';
import {INPUT,type Emulator} from '../src/engine';
import {PROFILE as P,writeWord} from '../src/profile';
import type {SpriteAtlas} from '../src/atlas';
vi.mock('../src/engine',async importOriginal=>({...await importOriginal<typeof import('../src/engine')>(),setNativeDrawing:vi.fn()}));
function fixture(){
 const heap=new Uint8Array(0x28000),controls=new Controls(),simulateInput=vi.fn();
 const emulator={Module:{HEAPU8:heap},gameManager:{simulateInput}} as unknown as Emulator;
 const overlay={getContext:()=>({clearRect:vi.fn()})} as unknown as HTMLCanvasElement;
 const game=new LiveGame(emulator,controls,overlay,{draw:vi.fn()} as unknown as SpriteAtlas,vi.fn());
 game.ready=true;game.gsuBase=0x20000;game.wram[P.mode]=0x26;game.wram[0x1119]=2;
 return {game,controls,simulateInput,pressed:()=>simulateInput.mock.calls.filter(c=>c[2]===1).map(c=>c[1])};
}
describe('native world-tab navigation',()=>{
 it('returns to levels once during a held Jump, then requires a new press to enter',()=>{
  const {game,controls,simulateInput,pressed}=fixture();controls.setStick(1,-1,1000);controls.holdJump('touch',1000);game.tick(1000);
  expect(pressed()).toEqual([INPUT.down]);
  game.wram[0x1119]=0;simulateInput.mockClear();game.tick(1020);expect(pressed()).toEqual([]);
  simulateInput.mockClear();game.tick(1900);expect(pressed()).toEqual([]);
  controls.releaseJump('touch',2000);game.tick(2000);controls.setStick(0,0,2100);
  controls.holdJump('touch',2100);simulateInput.mockClear();game.tick(2100);expect(pressed()).toEqual([INPUT.b]);
 });
 it('uses the confirm/egg tap to leave the current world tab without starting a level',()=>{
  const {game,controls,simulateInput,pressed}=fixture();controls.activate('egg',1000);game.tick(1000);expect(pressed()).toEqual([INPUT.down]);
  game.wram[0x1119]=0;simulateInput.mockClear();game.tick(1050);expect(pressed()).toEqual([]);
  game.tick(1200);controls.activate('egg',1300);simulateInput.mockClear();game.tick(1300);expect(pressed()).toEqual([INPUT.b]);
 });
 it('retains native confirmation when a different world tab is selected',()=>{
  const {game,controls,pressed}=fixture();game.wram[0x1119]=4;controls.activate('egg',1000);game.tick(1000);expect(pressed()).toEqual([INPUT.b]);
 });
 it('does not turn a gameplay hold into an automatic map confirmation',()=>{
  const {game,controls,simulateInput,pressed}=fixture();game.wram[P.mode]=P.gameplay;game.adventure.mount='yoshi';writeWord(game.gsu,P.baby,0x8000);
  controls.holdJump('touch',1000);game.tick(1000);game.wram[P.mode]=0x26;game.wram[0x1119]=0;
  simulateInput.mockClear();game.tick(1100);expect(pressed()).toEqual([]);
 });
});
