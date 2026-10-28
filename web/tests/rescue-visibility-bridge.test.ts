import {describe,it,expect,vi} from 'vitest';
import {LiveGame} from '../src/game';
import {Controls} from '../src/controls';
import {PROFILE as P,writeWord,word,signed16} from '../src/profile';
import type {Emulator} from '../src/engine';
import type {SpriteAtlas} from '../src/atlas';
vi.mock('../src/engine',async importOriginal=>({...await importOriginal<typeof import('../src/engine')>(),setNativeDrawing:vi.fn()}));

describe('optional Baby Mario visibility in the running bridge',()=>{
 it.each([true,false])('respects the visibility setting %s without changing the countdown or positions',enabled=>{
  const heap=new Uint8Array(0x28000);
  const emulator={Module:{HEAPU8:heap},gameManager:{simulateInput:vi.fn()}} as unknown as Emulator;
  const overlay={getContext:()=>({clearRect:vi.fn()})} as unknown as HTMLCanvasElement;
  const game=new LiveGame(emulator,new Controls(),overlay,{draw:vi.fn()} as unknown as SpriteAtlas,vi.fn());
  game.ready=true;game.gsuBase=0x20000;game.keepBabyOnScreen=enabled;
  game.wram[P.mode]=P.gameplay;writeWord(game.wram,P.cameraY,100);writeWord(game.wram,0x3b6,50);
  writeWord(game.gsu,P.baby,0);writeWord(game.gsu,P.spriteState,0x10);writeWord(game.gsu,P.spriteId,0x61);
  writeWord(game.gsu,0x19d6,11);writeWord(game.gsu,P.spriteX,280);writeWord(game.gsu,P.spriteY,110);
  writeWord(game.gsu,0x1222,-320);writeWord(game.gsu,0x15e2,-320);
  game.tick(1000);
  expect(signed16(word(game.gsu,0x1222))).toBe(enabled?0:-320);
  expect(signed16(word(game.gsu,0x15e2))).toBe(enabled?320:-320);
  expect(word(game.gsu,P.spriteX)).toBe(280);expect(word(game.gsu,P.spriteY)).toBe(110);
  expect(word(game.wram,0x3b6)).toBe(50);expect(word(game.gsu,P.baby)).toBe(0);
 });
});
