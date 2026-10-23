import {describe,it,expect,vi} from 'vitest';
import {LiveGame} from '../src/game';
import {Controls} from '../src/controls';
import {PROFILE as P,writeWord,word} from '../src/profile';
import {setNativeDrawing,type Emulator,INPUT} from '../src/engine';
import type {SpriteAtlas} from '../src/atlas';
vi.mock('../src/engine',async importOriginal=>({...await importOriginal<typeof import('../src/engine')>(),setNativeDrawing:vi.fn()}));
function fixture(){
 const heap=new Uint8Array(0x28000),controls=new Controls();
 const simulateInput=vi.fn();const emulator={Module:{HEAPU8:heap},gameManager:{simulateInput}} as unknown as Emulator;
 const ctx={clearRect:vi.fn()} as unknown as CanvasRenderingContext2D;
 const overlay={height:224,getContext:()=>ctx} as unknown as HTMLCanvasElement;
 const game=new LiveGame(emulator,controls,overlay,{draw:vi.fn()} as unknown as SpriteAtlas,vi.fn());game.gsuBase=0x20000;game.ready=true;game.wram[P.mode]=P.gameplay;
 writeWord(game.gsu,P.baby,0x8000);writeWord(game.wram,0x3b6,10);
 return {game,controls,simulateInput};
}
describe('native Baby Mario rescue bridge',()=>{
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
