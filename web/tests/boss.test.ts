import {describe,expect,it} from 'vitest';
import {Adventure} from '../src/adventure';
import {STAGE_BOSSES,StageBosses,bossForStage,validateGuardian} from '../src/boss';
import {PROFILE as P,queueNativeSound,word,writeWord} from '../src/profile';
function fixture(stage=0,kind:'goal'|'key'|'mini'|'final'='goal'){
 const w=new Uint8Array(0x20000),g=new Uint8Array(0x8000),boss=new StageBosses();w[P.mode]=P.gameplay;w[P.stage]=stage;w[0x379]=3;writeWord(g,P.baby,0x8000);writeWord(g,P.x,70);writeWord(g,P.y,160);writeWord(g,P.invincible,1);
 const slot=21,o=slot*4;writeWord(g,P.spriteState+o,0x10);writeWord(g,P.spriteId+o,kind==='goal'?0x0d:kind==='key'?0x14:kind==='mini'?0x13:0x134);writeWord(g,P.spriteX+o,200);writeWord(g,P.spriteY+o,176);if(kind==='final')writeWord(g,0x19d6+o,0x20);
 let frame=0;const tick=(egg=false)=>boss.update(w,g,++frame,egg);return {w,g,boss,slot,tick};
}
function win(f:ReturnType<typeof fixture>){for(let i=0;i<1800&&f.boss.state?.phase!=='exit';i++)f.tick(i%20===0);expect(f.boss.state?.phase).toBe('exit');}
describe('a guardian gates the native level exit',()=>{
 it('waits until the original goal is near the hero; walking past it cannot defeat the guardian',()=>{
  const f=fixture();writeWord(f.g,P.spriteX+f.slot*4,700);f.tick();expect(f.boss.state).toBeUndefined();
  writeWord(f.g,P.spriteX+f.slot*4,200);f.tick();expect(f.boss.state?.phase).toBe('intro');
  writeWord(f.g,P.x,225);for(let i=0;i<60;i++)f.tick();expect(f.boss.state?.hp).toBe(3);expect(f.w[P.mode]).toBe(P.gameplay);expect(f.boss.state?.phase).toBe('fight');
 });
 it.each(STAGE_BOSSES.map((spec,i)=>[spec.id,i] as const))('can beat %s with confirmed native egg hits', (id,stage)=>{
  const f=fixture(stage);f.tick();expect(f.boss.state?.id).toBe(id);expect(f.boss.eggsUnlimited).toBe(true);expect(word(f.g,0x1df6)).toBe(0);
  win(f);expect(word(f.g,0x1df6)).toBe(0);expect(f.boss.state?.hp).toBe(0);expect(f.boss.eggsUnlimited).toBe(false);
  expect(f.boss.state!.ring!.x).toBeGreaterThanOrEqual(52);expect(f.boss.state!.ring!.x).toBeLessThanOrEqual(224);expect(f.boss.state!.ring!.y).toBeLessThanOrEqual(160);
 });
 it('only confirmed native egg hits cause damage and repeated contacts respect the hit cooldown',()=>{
  const f=fixture();for(let i=0;i<45;i++)f.tick();const s=f.boss.state!,hp=s.hp;
  f.tick();expect(s.hp).toBe(hp);f.tick(true);expect(s.hp).toBe(hp-1);
  for(let i=0;i<5;i++)f.tick(true);expect(s.hp).toBe(hp-1);
  expect(s.shots.every(p=>p.kind!=='egg')).toBe(true);
 });
 it('preserves the original goal after defeat and delegates victory to the ROM',()=>{
  const f=fixture();f.tick();expect(word(f.g,P.spriteX+f.slot*4)).toBe(200);win(f);f.tick();
  const ring=f.boss.state!.ring!;expect(ring.y+48).toBe(word(f.g,P.y)); // native next Yoshi must spawn at ground height, never inside the floor
  expect(word(f.g,P.spriteX+f.slot*4)).toBe(ring.x-24);expect(word(f.g,P.spriteY+f.slot*4)).toBe(ring.y+64);
  writeWord(f.g,P.x,ring.x+1);writeWord(f.g,P.y,ring.y-16);f.tick();expect(f.boss.state?.phase).toBe('exit');
  expect(f.w[P.mode]).toBe(P.gameplay);expect(word(f.g,0x19d6+f.slot*4)).toBe(0xffff); // native handler completes next frame
 });
 it('keeps native receiver coordinates fixed through camera movement and a restored save',()=>{
  const f=fixture();f.tick();writeWord(f.w,P.cameraY,100);writeWord(f.g,P.y,260);for(let i=0;i<60;i++)f.tick();
  f.boss.restore(f.boss.state);writeWord(f.w,P.cameraY,0);writeWord(f.g,P.y,160);win(f);
  writeWord(f.w,P.cameraX,500);writeWord(f.g,P.x,570);f.tick();
  expect(f.boss.state!.ring).toEqual({x:224,y:112});
  expect(word(f.g,P.spriteX+f.slot*4)).toBe(200);expect(word(f.g,P.spriteY+f.slot*4)).toBe(176);
 });
 it('rearms rejected crossings and waits through Baby recovery for native victory',()=>{
  const f=fixture();f.tick();win(f);const ring=f.boss.state!.ring!;
  writeWord(f.g,P.x,ring.x+1);writeWord(f.g,P.y,ring.y);f.tick();expect(f.boss.state?.phase).toBe('exit');
  writeWord(f.g,0x19d6+f.slot*4,1);writeWord(f.g,P.baby,0);f.tick();expect(word(f.g,0x19d6+f.slot*4)).toBe(1);
  writeWord(f.g,P.baby,0x8000);f.tick();expect(word(f.g,0x19d6+f.slot*4)).toBe(0xffff);expect(f.boss.state?.phase).toBe('exit');
  writeWord(f.g,0xac,0x14);f.tick();expect(f.boss.state?.phase).toBe('released');
 });
 it('retries legacy released metadata if the native goal was never accepted',()=>{
  const f=fixture();f.tick();win(f);f.boss.state!.phase='released';f.boss.restore(f.boss.state);f.tick();expect(f.boss.state?.phase).toBe('exit');
  f.w[P.mode]=P.victory;f.tick();expect(f.boss.state?.phase).toBe('released');
 });
 it('cannot hurt the player on the fatal egg frame even when an enemy shot also hits',()=>{
  const f=fixture();for(let i=0;i<50;i++)f.tick();const s=f.boss.state!;s.hp=1;writeWord(f.g,P.invincible,0);
  s.shots=[{x:75,y:170,vx:0,vy:0,age:0,kind:'nut'}];
  f.tick(true);expect(s.phase).toBe('dying');expect(word(f.g,P.invincible)).toBe(0);expect(f.boss.damageEvents).toBe(0);
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
 it('serializes progress and native encounter metadata, accepts old campaigns, rejects malformed metadata',()=>{
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


describe('DKC guardians in Yoshi: melee and fixed world arenas',()=>{
 it.each(STAGE_BOSSES.map((b,i)=>[b.id,i]as const))('accepts a roll and a descending stomp against %s with one hit per grace window',(id,stage)=>{
  for(const kind of ['roll','stomp']){
   const f=fixture(stage);for(let i=0;i<45;i++)f.tick();const b=f.boss.state!,spec=STAGE_BOSSES.find(s=>s.id===id)!;b.x=150;b.y=190;b.shots=[];const hp=b.hp;
   writeWord(f.g,P.x,138);writeWord(f.g,P.y,kind==='roll'?165:190-spec.height-42);writeWord(f.g,P.vy,0x300);writeWord(f.g,0xc0,8);
   f.boss.update(f.w,f.g,100,false,224);b.x=150;b.y=190;writeWord(f.g,P.y,kind==='roll'?165:190-spec.height-30);
   const damageBefore=f.boss.damageEvents;f.boss.update(f.w,f.g,101,false,224,{rolling:kind==='roll'});expect(b.hp).toBe(hp-1);expect(f.boss.damageEvents).toBe(damageBefore);
   if(kind==='stomp')expect(word(f.g,P.vy)).toBe(0xfb00);
   f.boss.update(f.w,f.g,101,true,224,{rolling:true});expect(b.hp).toBe(hp-1);
  }
 });
 it.each(STAGE_BOSSES.map((b,i)=>[b.id,i]as const))('keeps %s at the same world location when only the camera changes',(id,stage)=>{
  const f=fixture(stage);for(let i=0;i<45;i++)f.tick();const original=structuredClone(f.boss.state!);f.boss.update(f.w,f.g,200,false,224);const a=new StageBosses(),b=new StageBosses();a.restore(original);b.restore(original);a.update(f.w,f.g,300,false,224);const w=f.w.slice();writeWord(w,P.cameraX,500);writeWord(w,P.cameraY,500);b.update(w,f.g,300,false,224);expect(b.state!.x).toBe(a.state!.x);expect(b.state!.y).toBe(a.state!.y);expect(b.state!.floor).toBe(a.state!.floor);expect(b.state!.arena).toEqual(original.arena);
 });
 it('rejects upward/side contacts without an active roll and never stomps through a pause',()=>{
  const f=fixture();for(let i=0;i<45;i++)f.tick();const s=f.boss.state!,hp=s.hp;s.x=150;s.y=190;writeWord(f.g,P.x,138);writeWord(f.g,P.y,145);writeWord(f.g,P.vy,0xfc00);writeWord(f.g,0xc0,8);f.boss.update(f.w,f.g,100,false,224);expect(s.hp).toBe(hp);f.boss.pause();writeWord(f.g,P.vy,0x300);f.boss.update(f.w,f.g,102,false,224);expect(s.hp).toBe(hp);
 });
});

it('aligns guardian feet with the actual native goal ground without the former 16px sink',()=>{const f=fixture();f.tick();expect(f.boss.state!.floor).toBe(word(f.g,P.spriteY+f.slot*4));});


describe('returning to Gnawty after native sprite streaming',()=>{
 it('keeps damage and ground when the goal slot unloads, is reused, and returns in another slot',()=>{
  const f=fixture();for(let i=0;i<45;i++)f.tick();f.tick(true);const before=structuredClone(f.boss.state!),slot=f.slot*4;writeWord(f.g,P.spriteState+slot,0);writeWord(f.w,P.cameraX,700);writeWord(f.w,P.cameraY,800);for(let i=0;i<50;i++)f.tick();expect(f.boss.state!.hp).toBe(before.hp);expect(f.boss.state!.y).toBe(before.floor);
  writeWord(f.g,P.spriteState+slot,0x10);writeWord(f.g,P.spriteId+slot,0x1e);const newSlot=12,o=newSlot*4;writeWord(f.g,P.spriteState+o,0x10);writeWord(f.g,P.spriteId+o,0x0d);writeWord(f.g,P.spriteX+o,before.nativeGoal!.x);writeWord(f.g,P.spriteY+o,before.nativeGoal!.y);f.tick();expect(f.boss.state!.slot).toBe(newSlot);expect(f.boss.state!.hp).toBe(before.hp);expect(f.boss.state!.floor).toBe(before.floor);expect(f.boss.state!.y).toBe(before.floor);expect(f.boss.state!.arena).toEqual(before.arena);
 });
 it('does not rebind to a different goal, but still resets on real room changes or death',()=>{
  const f=fixture();f.tick();const initial=f.boss.state!;writeWord(f.g,P.spriteState+f.slot*4,0);writeWord(f.g,P.spriteState+48,0x10);writeWord(f.g,P.spriteId+48,0x0d);writeWord(f.g,P.spriteX+48,1000);f.tick();expect(f.boss.state).toBe(initial);expect(f.boss.state!.slot).toBe(f.slot);writeWord(f.w,0x32,1);f.tick();expect(f.boss.state?.room).not.toBe(initial.room);
 });
 it('lands during Baby Mario rescue and resumes hopping from the ground instead of snapping into midair',()=>{
  const f=fixture();for(let i=0;i<45;i++)f.tick();const s=f.boss.state!;s.y=s.floor-30;writeWord(f.g,P.baby,0);for(let i=0;i<30;i++)f.tick();expect(s.y).toBe(s.floor);const saved=validateGuardian(s)!;expect(saved.jumpEpoch).toBe(s.elapsed);writeWord(f.g,P.baby,0x8000);f.boss.restore(saved);f.tick();expect(f.boss.state!.y).toBe(f.boss.state!.floor);
 });
 it('never lifts a goal guardian floor to fit a moved viewport, including a restored old save',()=>{
  const f=fixture();f.tick();const saved=structuredClone(f.boss.state!);delete saved.arena;saved.floor=216;saved.y=216;writeWord(f.w,P.cameraY,1000);f.boss.restore(saved);f.tick();expect(f.boss.state!.floor).toBe(saved.nativeGoal!.y);expect(f.boss.state!.y).toBeLessThanOrEqual(saved.nativeGoal!.y);
 });
});

// Exercise actual successive emissions for every imported DKC boss.
it.each(STAGE_BOSSES.map((spec,stage)=>[spec.id,stage] as const))('spaces %s projectile volleys three times farther apart', (id,stage)=>{
 const f=fixture(stage),attacks:number[]=[];
 for(let i=0;i<900;i++){const result=f.tick();if(result.sound==='attack')attacks.push(f.boss.state!.elapsed);}
 const interval=['gnawty','really-gnawty'].includes(id)?7.8:id==='necky-snr'?4.5:6.3;
 expect(attacks.length).toBeGreaterThanOrEqual(2);
 for(let i=1;i<attacks.length;i++){expect(attacks[i]-attacks[i-1]).toBeGreaterThanOrEqual(interval-.00001);expect(attacks[i]-attacks[i-1]).toBeLessThan(interval+.021);}
});
