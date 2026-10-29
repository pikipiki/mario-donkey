import {describe,expect,it} from 'vitest';
import {Adventure} from '../src/adventure';
import {STAGE_BOSSES,StageBosses,bossForStage,validateGuardian} from '../src/boss';
import {PROFILE as P,queueNativeSound,word,writeWord} from '../src/profile';
function fixture(stage=0,kind:'goal'|'key'|'mini'|'final'='goal'){
 const w=new Uint8Array(0x20000),g=new Uint8Array(0x8000),boss=new StageBosses();w[P.mode]=P.gameplay;w[P.stage]=stage;w[0x379]=3;writeWord(g,P.baby,0x8000);writeWord(g,P.x,70);writeWord(g,P.y,160);writeWord(g,P.invincible,1);
 const slot=21,o=slot*4;writeWord(g,P.spriteState+o,0x10);writeWord(g,P.spriteId+o,kind==='goal'?0x0d:kind==='key'?0x14:kind==='mini'?0x13:0x134);writeWord(g,P.spriteX+o,200);writeWord(g,P.spriteY+o,176);if(kind==='final')writeWord(g,0x19d6+o,0x20);
 let frame=0;const tick=(egg=false)=>boss.update(w,g,++frame,egg,1);return {w,g,boss,slot,tick};
}
function win(f:ReturnType<typeof fixture>){for(let i=0;i<1800&&f.boss.state?.phase!=='exit';i++)f.tick(i%20===0);expect(f.boss.state?.phase).toBe('exit');}
describe('a guardian gates the native level exit',()=>{
 it('waits until the original goal is near the hero; walking past it cannot defeat the guardian',()=>{
  const f=fixture();writeWord(f.g,P.spriteX+f.slot*4,700);f.tick();expect(f.boss.state).toBeUndefined();
  writeWord(f.g,P.spriteX+f.slot*4,200);f.tick();expect(f.boss.state?.phase).toBe('intro');
  writeWord(f.g,P.x,225);for(let i=0;i<60;i++)f.tick();expect(f.boss.state?.hp).toBe(3);expect(f.w[P.mode]).toBe(P.gameplay);expect(f.boss.state?.phase).toBe('fight');
 });
 it.each(STAGE_BOSSES.map((spec,i)=>[spec.id,i] as const))('can beat %s with repeated real egg projectiles and no native ammo', (id,stage)=>{
  const f=fixture(stage);f.tick();expect(f.boss.state?.id).toBe(id);expect(f.boss.eggsUnlimited).toBe(true);expect(word(f.g,0x1df6)).toBe(0);
  win(f);expect(word(f.g,0x1df6)).toBe(0);expect(f.boss.state?.hp).toBe(0);expect(f.boss.eggsUnlimited).toBe(false);
  expect(f.boss.state!.ring!.x).toBeGreaterThanOrEqual(52);expect(f.boss.state!.ring!.x).toBeLessThanOrEqual(208);expect(f.boss.state!.ring!.y).toBeLessThanOrEqual(160);
 });
 it('only a projectile collision causes damage; a held fire button is not repeated damage',()=>{
  const f=fixture();for(let i=0;i<45;i++)f.tick();const s=f.boss.state!,hp=s.hp;
  s.shots=[{x:5,y:5,vx:-310,vy:0,age:0,kind:'egg'}];f.tick();expect(s.hp).toBe(hp);
  s.shots=[{x:s.x,y:s.y-20,vx:0,vy:0,age:0,kind:'egg'}];f.tick();expect(s.hp).toBe(hp-1);
  for(let i=0;i<5;i++)f.tick();expect(s.hp).toBe(hp-1);expect(s.shots).toHaveLength(0);
 });
 it('restores the original goal near the hero only after defeat and delegates victory to the ROM',()=>{
  const f=fixture();f.tick();expect(word(f.g,P.spriteX+f.slot*4)).toBe(200);win(f);f.tick();
  const ring=f.boss.state!.ring!;expect(ring.y+48).toBe(word(f.g,P.y)); // native next Yoshi must spawn at ground height, never inside the floor
  expect(word(f.g,P.spriteX+f.slot*4)).toBe(ring.x-24);expect(word(f.g,P.spriteY+f.slot*4)).toBe(ring.y+64);
  writeWord(f.g,P.x,ring.x+1);writeWord(f.g,P.y,ring.y-16);f.tick();expect(f.boss.state?.phase).toBe('released');
  expect(f.w[P.mode]).toBe(P.gameplay);expect(word(f.g,0x19d6+f.slot*4)).toBe(0xffff); // native handler completes next frame
 });
 it('keeps the defeated boss exit in the hero screen after camera movement',()=>{
  const f=fixture();f.tick();win(f);writeWord(f.w,P.cameraX,500);writeWord(f.g,P.x,570);f.tick();expect(f.boss.state?.phase).toBe('exit');expect(f.boss.state!.ring!.x).toBeGreaterThanOrEqual(544);expect(f.boss.state!.ring!.x).toBeLessThanOrEqual(712);
 });
 it('never relocks a native castle ceremony when it advances stage or room',()=>{
  const f=fixture(3,'key');f.tick();win(f);const ring=f.boss.state!.ring!;writeWord(f.g,P.x,ring.x-12);writeWord(f.g,P.y,ring.y-16);f.tick();expect(f.boss.state?.phase).toBe('released');
  f.w[P.stage]=4;f.w[0x34]=88;f.tick();expect(f.boss.state?.phase).toBe('released');
 });
 it('waits for the original castle boss key, then reinitializes that real key after its new exit ring',()=>{
  const f=fixture(3,'key');writeWord(f.g,P.spriteState+f.slot*4,0);f.tick();expect(f.boss.state).toBeUndefined();
  writeWord(f.g,P.spriteState+f.slot*4,0x10);f.tick();expect(f.boss.state?.kind).toBe('key');win(f);
  const ring=f.boss.state!.ring!;writeWord(f.g,P.x,ring.x-12);writeWord(f.g,P.y,ring.y-16);f.tick();expect(f.boss.state?.phase).toBe('released');expect(word(f.g,P.spriteState+f.slot*4)).toBe(2);
 });
 it('adds the guardian after a no-key fortress defeat, then resumes its real explosion',()=>{
  const f=fixture(3,'mini');writeWord(f.g,0xac,2);writeWord(f.g,0x1ae,1);f.tick();expect(f.boss.state?.kind).toBe('mini');expect(word(f.g,0xac)).toBe(0);expect(word(f.g,0x1ae)).toBe(0);
  win(f);const ring=f.boss.state!.ring!;writeWord(f.g,P.x,ring.x-12);writeWord(f.g,P.y,ring.y);f.tick();expect(f.boss.state?.phase).toBe('released');expect(word(f.g,0xac)).toBe(2);expect(word(f.g,0x1ae)).toBe(1);expect(f.w[P.mode]).toBe(P.gameplay);
 });
 it('lets key-producing castle explosions run before the extra guardian',()=>{
  const f=fixture(7,'mini');writeWord(f.g,0x1900+f.slot*4,1);f.tick();expect(f.boss.state).toBeUndefined();
 });
 it('does not interrupt Bowser until his original fight reaches the post-defeat state20',()=>{
  const f=fixture(67,'final');writeWord(f.g,0x19d6+f.slot*4,0x19);f.tick();expect(f.boss.state).toBeUndefined();
  writeWord(f.g,0x19d6+f.slot*4,0x1f);f.tick();expect(f.boss.state).toBeUndefined();
  writeWord(f.g,0x19d6+f.slot*4,0x20);f.tick();expect(f.boss.state?.kind).toBe('final');
 });
 it('freezes the encounter during Baby Mario recovery and clears it on a real death/new attempt',()=>{
  const f=fixture();for(let i=0;i<60;i++)f.tick();writeWord(f.g,P.baby,0);const time=f.boss.state!.elapsed,hp=f.boss.state!.hp;
  for(let i=0;i<100;i++)f.tick(true);expect(f.boss.state!.elapsed).toBe(time);expect(f.boss.state!.hp).toBe(hp);
  f.w[P.mode]=0x15;f.tick();expect(f.boss.state).toBeUndefined();expect(f.boss.eggsUnlimited).toBe(false);
 });
 it('requests native damage and allows its Baby Mario detachment to run before unstunning',()=>{
  const f=fixture();for(let i=0;i<50;i++)f.tick();const s=f.boss.state!;writeWord(f.g,P.invincible,0);
  s.shots=[{x:75,y:170,vx:0,vy:0,age:0,kind:'nut'}];const result=f.tick();expect(result.sound).toBe('hurt');expect(word(f.g,P.invincible)).toBe(0xa0);expect(f.boss.nativeHitPending).toBe(true);
 });
 it('serializes progress and in-flight eggs, accepts old campaigns, rejects malformed metadata',()=>{
  const f=fixture();for(let i=0;i<50;i++)f.tick();f.tick(true);const a=new Adventure();a.guardian=f.boss.state;
  const saved=JSON.parse(JSON.stringify(a.serialize())),restored=new Adventure(saved),manager=new StageBosses();manager.restore(restored.guardian);
  expect(manager.state).toEqual(f.boss.state);expect(new Adventure({version:2}).guardian).toBeUndefined();
  expect(validateGuardian({...f.boss.state,hp:-1})).toBeUndefined();expect(validateGuardian({...f.boss.state,shots:[{x:NaN}]})).toBeUndefined();
 });
 it('has seven alternate bosses and scales HP through world6 without affecting bonus menus',()=>{
  expect(new Set(STAGE_BOSSES.map(b=>b.id)).size).toBe(7);expect(bossForStage(0).id).not.toBe(bossForStage(1).id);
  const f=fixture(60);f.tick();expect(f.boss.state!.maxHp).toBe(8);
  const menu=fixture(9);menu.tick();expect(menu.boss.state).toBeUndefined();
 });
});
describe('native egg sound queue',()=>{
 it('queues a byte in the verified native queue and refuses overflow',()=>{const w=new Uint8Array(0x20000);expect(queueNativeSound(w,0x20)).toBe(true);expect(w[0x59]).toBe(0x20);expect(word(w,0x57)).toBe(1);writeWord(w,0x57,7);expect(queueNativeSound(w,0x20)).toBe(false);});
});
