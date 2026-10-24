import {beforeEach,describe,expect,it,vi} from 'vitest';
import {LiveGame} from '../src/game';
import {Controls} from '../src/controls';
import {PROFILE as P,writeWord} from '../src/profile';
import {breakTerrain} from '../src/terrain';
import type {Emulator} from '../src/engine';
import type {SpriteAtlas} from '../src/atlas';
import type {Mount} from '../src/adventure';

vi.mock('../src/engine',async importOriginal=>({...await importOriginal<typeof import('../src/engine')>(),setNativeDrawing:vi.fn()}));
vi.mock('../src/terrain',async importOriginal=>({...await importOriginal<typeof import('../src/terrain')>(),breakTerrain:vi.fn(()=>[])}));

function fixture(){
 const heap=new Uint8Array(0x28000),controls=new Controls();
 const emulator={Module:{HEAPU8:heap},setVolume:vi.fn(),gameManager:{simulateInput:vi.fn(),toggleMainLoop:vi.fn()}} as unknown as Emulator;
 const ctx={clearRect:vi.fn()} as unknown as CanvasRenderingContext2D;
 const overlay={height:224,getContext:()=>ctx} as unknown as HTMLCanvasElement;
 const game=new LiveGame(emulator,controls,overlay,{draw:vi.fn()} as unknown as SpriteAtlas,vi.fn());
 game.gsuBase=0x20000;game.ready=true;game.adventure.mount='foot';game.wram[P.mode]=P.gameplay;
 writeWord(game.gsu,P.baby,0x8000);writeWord(game.wram,0x3b6,10);
 return {game,controls};
}

const mounts:Mount[]=['foot','yoshi','rambi','winky','expresso','enguarde','squawks'];
beforeEach(()=>vi.clearAllMocks());

describe('live roll-to-terrain bridge',()=>{
 it.each(mounts)('allows %s to attack breakable terrain while rolling',mount=>{
  const {game,controls}=fixture();game.adventure.mount=mount;controls.facing=-1;controls.activate('roll',1000);
  game.tick(1100);
  expect(game.adventure.mount).toBe(mount);
  expect(breakTerrain).toHaveBeenCalledOnce();
  const [wram,gsu,direction,attacking]=vi.mocked(breakTerrain).mock.calls[0];
  expect(wram.buffer).toBe(game.wram.buffer);expect(wram.byteOffset).toBe(game.wram.byteOffset);
  expect(gsu.buffer).toBe(game.gsu.buffer);expect(gsu.byteOffset).toBe(game.gsu.byteOffset);
  expect(direction).toBe(-1);expect(attacking).toBe(true);
 });

 it.each(['idle','disabled','transformed','lost'] as const)('disables terrain attacks when %s',reason=>{
  const {game,controls}=fixture();
  if(reason==='lost'){
   // First let the real rescue transition switch to Yoshi and clear the old roll.
   // The next user-initiated roll must still leave the rescue terrain untouched.
   writeWord(game.gsu,P.baby,0);game.tick(1000);vi.mocked(breakTerrain).mockClear();
  }
  if(reason!=='idle')controls.activate('roll',1100);
  if(reason==='disabled')writeWord(game.gsu,0x1ae,1);
  if(reason==='transformed')writeWord(game.gsu,0xae,2);
  game.tick(1200);
  expect(breakTerrain).toHaveBeenCalledOnce();
  expect(vi.mocked(breakTerrain).mock.calls[0][3]).toBe(false);
  if(reason!=='idle')expect(controls.rollUntil).toBeGreaterThan(1200);
 });
});
