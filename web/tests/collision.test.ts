import {describe,it,expect,vi} from 'vitest';
import {ROLL_TARGETS,canWriteVelocity,SQUAWKS_FLIGHT_VELOCITY,PROFILE as P,word,writeWord,signed16} from '../src/profile';
import {LiveGame} from '../src/game';
import {ANIMALS,CHARACTERS}from'../src/adventure';
import {Controls} from '../src/controls';
import {tileAddress} from '../src/terrain';
import type {Emulator} from '../src/engine';
import type {SpriteAtlas} from '../src/atlas';

vi.mock('../src/engine',async importOriginal=>({...await importOriginal<typeof import('../src/engine')>(),setNativeDrawing:vi.fn()}));

describe('respect native terrain contacts',()=>{
 it('blocks each horizontal contact only toward the wall, including head-only contacts',()=>{
  const g=new Uint8Array(0x8000);
  for(const bit of [0x100,0x80]){writeWord(g,0xfc,bit);expect(canWriteVelocity(g,'x',-0x360)).toBe(false);expect(canWriteVelocity(g,'x',0x360)).toBe(true);}
  for(const bit of [0x40,0x20]){writeWord(g,0xfc,bit);expect(canWriteVelocity(g,'x',0x360)).toBe(false);expect(canWriteVelocity(g,'x',-0x360)).toBe(true);}
  writeWord(g,0xfc,0x1e0);expect(canWriteVelocity(g,'x',0x360)).toBe(false);expect(canWriteVelocity(g,'x',-0x360)).toBe(false);
 });
 it('preserves ceiling correction for upward flight and allows movement away',()=>{
  const g=new Uint8Array(0x8000);
  for(const bit of [0x10,0x08]){writeWord(g,0xfc,bit);expect(canWriteVelocity(g,'y',-0x180)).toBe(false);expect(canWriteVelocity(g,'y',0x180)).toBe(true);expect(canWriteVelocity(g,'x',0x360)).toBe(true);}
  writeWord(g,0xfc,7);expect(canWriteVelocity(g,'x',0x360)).toBe(true);expect(canWriteVelocity(g,'y',-0x640)).toBe(true);expect(canWriteVelocity(g,'y',0x180)).toBe(false);
 });
 it('never injects velocity into locks, transformations or scripted states',()=>{
  for(const address of [0xac,0xae,0x1ae,0x1b0]){const g=new Uint8Array(0x8000);writeWord(g,address,2);expect(canWriteVelocity(g,'x',0x360)).toBe(false);expect(canWriteVelocity(g,'y',-0x180)).toBe(false);}
 });
});

function fixture(){
 const controls=new Controls();
 const emulator={Module:{HEAPU8:new Uint8Array(0x28000)},gameManager:{simulateInput:vi.fn(),toggleMainLoop:vi.fn()},setVolume:vi.fn()} as unknown as Emulator;
 const canvas={height:224,getContext:()=>({clearRect:vi.fn(),fillRect:vi.fn()})} as unknown as HTMLCanvasElement;
 const game=new LiveGame(emulator,controls,canvas,{draw:vi.fn()} as unknown as SpriteAtlas,vi.fn());
 game.gsuBase=0x20000;game.ready=true;game.wram[P.mode]=P.gameplay;writeWord(game.gsu,P.baby,0x8000);writeWord(game.wram,0x3b6,10);
 writeWord(game.gsu,P.x,100);writeWord(game.gsu,P.y,100);writeWord(game.wram,0x9f1,0xffff);
 return {game,controls};
}

describe('collision bridge integration',()=>{
 it('does not reapply roll speed after native wall resolution, on foot or on Yoshi',()=>{
  for(const mount of ['foot','yoshi'] as const){
   const {game,controls}=fixture();game.adventure.mount=mount;writeWord(game.gsu,0xfc,0x60);controls.activate('roll',1000);
   for(const now of [1000,1016,1032]){game.tick(now);expect(word(game.gsu,P.vx)).toBe(0);expect(word(game.gsu,0xa8)).toBe(0);expect(word(game.gsu,P.x)).toBe(100);}
   controls.stop();controls.facing=-1;controls.activate('roll',1100);game.tick(1100);expect(signed16(word(game.gsu,P.vx))).toBe(-0x360);
  }
 });
 it('keeps DK acceleration off a contacted wall but can turn away',()=>{
  const {game,controls}=fixture();game.adventure.mount='foot';writeWord(game.gsu,0xfc,0x60);controls.activate('right',1000);game.tick(1000);expect(word(game.gsu,P.vx)).toBe(0);
  controls.activate('left',1100);game.tick(1100);expect(signed16(word(game.gsu,P.vx))).toBe(-0x1c);
 });
 it('does not push Squawks through a ceiling and resumes flight once it is clear',()=>{
  const {game,controls}=fixture();game.adventure.mount='squawks';writeWord(game.gsu,P.y,180);writeWord(game.gsu,0xc0,6);writeWord(game.gsu,0xfc,0x18);controls.activate('jump',1000);game.tick(1000);expect(word(game.gsu,P.vy)).toBe(0);
  writeWord(game.gsu,0xfc,0);game.tick(1016);expect(signed16(word(game.gsu,P.vy))).toBe(SQUAWKS_FLIGHT_VELOCITY);
 });
 it('does not move or attack while a native instruction window is open',()=>{
  for(const mount of ['foot','yoshi','squawks'] as const){
   const {game,controls}=fixture();game.adventure.mount=mount;game.wram[0xd11]=9;
   writeWord(game.gsu,P.vx,0x123);writeWord(game.gsu,P.vy,0x123);
   writeWord(game.gsu,P.spriteState+4,0x10);writeWord(game.gsu,P.spriteId+4,0x66);writeWord(game.gsu,P.spriteX+4,112);writeWord(game.gsu,P.spriteY+4,100);
   controls.activate('roll',1000);controls.activate('jump',1000);game.tick(1000);
   expect(word(game.gsu,P.vx)).toBe(0x123);expect(word(game.gsu,P.vy)).toBe(0x123);expect(word(game.gsu,P.invincible)).toBe(0);
   expect(word(game.gsu,P.spriteState+4)).toBe(0x10);expect(game.kills).toBe(0);
  }
 });
 it('cannot destroy the Piranha carrying the player or change scripts through roll attacks',()=>{
  for(const [address,state,baby] of [[0xac,0x1a,0],[0xac,6,0x8000],[0xae,2,0x8000],[0x1b0,1,0x8000]]){
   const {game,controls}=fixture();writeWord(game.gsu,address,state);writeWord(game.gsu,P.baby,baby);game.tick(900);
   writeWord(game.gsu,P.spriteState+4,0x10);writeWord(game.gsu,P.spriteId+4,0x66);writeWord(game.gsu,P.spriteX+4,112);writeWord(game.gsu,P.spriteY+4,100);
   writeWord(game.gsu,0x1ecc,0xff);writeWord(game.gsu,P.vx,0x123);
   const wall=tileAddress(game.gsu,128,112)!;writeWord(game.wram,wall,0x7b00);
   game.adventure.pickups.push({id:'nearby-animal',room:game.room,kind:'rambi',x:100,y:100,collected:false});
   controls.activate('roll',1000);game.tick(1000);
   expect(word(game.gsu,P.spriteState+4)).toBe(0x10);expect(word(game.gsu,P.spriteId+4)).toBe(0x66);expect(word(game.gsu,0x1ecc)).toBe(0xff);
   expect(word(game.gsu,address)).toBe(state);expect(word(game.gsu,P.baby)).toBe(baby);expect(word(game.gsu,P.invincible)).toBe(0);expect(word(game.gsu,P.vx)).toBe(0x123);
   expect(word(game.wram,wall)).toBe(0x7b00);expect(word(game.wram,0x9ef)).toBe(0);expect(game.adventure.pickups[0].collected).toBe(false);expect(game.kills).toBe(0);
  }
 });
});


describe('roll damage across every hero and mount',()=>{
 for(const character of CHARACTERS)for(const mount of ['foot','yoshi',...ANIMALS]as const){
  it(`${character} on ${mount} defeats monsters and hostile flowers, preserving items`,()=>{
   for(const id of ROLL_TARGETS){
    const{game,controls}=fixture();game.adventure.active=character;game.adventure.mount=mount;writeWord(game.gsu,P.spriteState+4,0x10);writeWord(game.gsu,P.spriteId+4,id);writeWord(game.gsu,P.spriteX+4,120);writeWord(game.gsu,P.spriteY+4,100);
    writeWord(game.gsu,P.spriteState+8,0x10);writeWord(game.gsu,P.spriteId+8,0x110);writeWord(game.gsu,P.spriteX+8,120);writeWord(game.gsu,P.spriteY+8,100);
    controls.activate('roll',1000);game.tick(1000);expect(game.kills).toBe(1);expect(word(game.gsu,P.spriteState+4)).not.toBe(0x10);expect(word(game.gsu,P.spriteState+8)).toBe(0x10);
    // A 200ms render gap is ten native frames: the old four-frame shield expired.
    expect(word(game.gsu,P.invincible)).toBeGreaterThan(10);writeWord(game.gsu,P.invincible,word(game.gsu,P.invincible)-10);game.tick(1200);expect(controls.rollUntil).toBe(1580);
   }
  });
 }
 it('hits an enemy crossed between rendered frames without attacking across a teleport',()=>{
  const{game,controls}=fixture();controls.activate('roll',1000);game.tick(1000);
  writeWord(game.gsu,P.spriteState+4,0x10);writeWord(game.gsu,P.spriteId+4,0x1e);writeWord(game.gsu,P.spriteX+4,110);writeWord(game.gsu,P.spriteY+4,100);writeWord(game.gsu,P.x,170);game.tick(1200);expect(game.kills).toBe(1);
  writeWord(game.gsu,P.spriteState+4,0x10);writeWord(game.gsu,P.spriteX+4,210);writeWord(game.gsu,P.x,400);game.tick(1300);expect(game.kills).toBe(1);
 });
});
