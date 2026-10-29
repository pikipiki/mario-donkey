import {describe,it,expect} from 'vitest';
import {DkcGuardian,requestDkcGuardianHit} from '../src/dkc-guardian';
import {pendingBossVictory}from'../src/dkc-boss-finish';
import {DKC} from '../src/dkc-profile';
import{writeWord,word}from'../src/profile';
function fixture(){const w=new Uint8Array(0x20000),boss=new DkcGuardian();writeWord(w,DKC.height,512);writeWord(w,DKC.entrance,22);writeWord(w,DKC.id+2,1);writeWord(w,DKC.x+2,140);writeWord(w,DKC.y+2,200);writeWord(w,0x12a7,1);writeWord(w,DKC.id+6,0x6a);writeWord(w,DKC.x+6,280);writeWord(w,DKC.y+6,200);let frame=0;return{w,boss,tick:()=>boss.update(w,++frame,slot=>word(w,0x1375+slot)===0)};}
describe('Yoshi guardian before the genuine DKC map exit',()=>{
 it('never guards a bonus room door or a faraway exit',()=>{const f=fixture();writeWord(f.w,0x137b,7);f.tick();expect(f.boss.state).toBeUndefined();writeWord(f.w,0x137b,0);writeWord(f.w,DKC.x+6,900);f.tick();expect(f.boss.state).toBeUndefined();});
 it('accepts a real exit with an explicit next-level destination when the native classifier confirms it',()=>{const f=fixture();writeWord(f.w,0x137b,12);f.boss.update(f.w,1,()=>true);expect(f.boss.state?.id).toBe('burt');});
 it('waits until the real exit and hero share the visible camera, then keeps Burt anchored to the world',()=>{const f=fixture();writeWord(f.w,DKC.x+2,5000);writeWord(f.w,DKC.x+6,5200);f.tick();expect(f.boss.state).toBeUndefined();writeWord(f.w,DKC.cameraX,4800);f.tick();expect(f.boss.state).toBeUndefined();writeWord(f.w,DKC.cameraX,5000);f.tick();expect(f.boss.state).toBeDefined();const x=f.boss.state!.x,arena=f.boss.state!.arenaLeft;writeWord(f.w,DKC.cameraX,5100);f.tick();expect(f.boss.state!.x).toBe(x);expect(f.boss.state!.arenaLeft).toBe(arena);});
 it('spawns Burt without changing native exit/player coordinates or progression',()=>{const f=fixture(),before=f.w.slice();f.tick();expect(f.boss.state?.id).toBe('burt');expect(f.boss.active).toBe(true);expect(f.w).toEqual(before);expect(f.boss.target()).toBeUndefined();});
 it('takes aimed egg hits, respects hurt grace and releases the native exit after defeat',()=>{const f=fixture();for(let i=0;i<60;i++)f.tick();expect(f.boss.target()?.slot).toBe(-1);for(let n=0;n<6;n++){expect(f.boss.hit()).toBe(true);expect(f.boss.hit()).toBe(false);for(let i=0;i<700;i++)f.tick();}for(let i=0;i<700;i++)f.tick();expect(f.boss.state?.phase).toBe('released');expect(f.boss.target()).toBeUndefined();expect(word(f.w,DKC.state+6)).toBe(0);});
 it('resumes a saved fight but clears encounters at a real map or another room',()=>{const f=fixture();f.tick();const saved=f.boss.state;f.boss.restore(saved);expect(f.boss.state).toEqual(saved);writeWord(f.w,DKC.entrance,23);f.tick();expect(f.boss.state?.level).toBe(23);writeWord(f.w,0x32,1);writeWord(f.w,DKC.height,0);writeWord(f.w,DKC.id,0x10);f.tick();expect(f.boss.state).toBeUndefined();});
 it('requests only original damage and protects transitions, native invulnerability and existing hitflags',()=>{const f=fixture();writeWord(f.w,DKC.state+2,0x1b);expect(requestDkcGuardianHit(f.w)).toBe(false);writeWord(f.w,DKC.state+2,0);writeWord(f.w,0x16d1,60);expect(requestDkcGuardianHit(f.w)).toBe(false);writeWord(f.w,0x16d1,0);writeWord(f.w,DKC.hit+2,0x8000);expect(requestDkcGuardianHit(f.w)).toBe(false);writeWord(f.w,DKC.hit+2,0);expect(requestDkcGuardianHit(f.w)).toBe(true);expect(word(f.w,DKC.hit+2)).toBe(1);expect(word(f.w,DKC.state+2)).toBe(0);});
});

describe('native DKC boss before Yoshi crossover',()=>{
 it('never spawns from a door in a boss arena before native defeat',()=>{for(const arena of[0xe0,0xe1,0xe2,0xe3,0xe4,0xe5,0x68]){const f=fixture();writeWord(f.w,DKC.entrance,arena);f.boss.update(f.w,1,()=>true);expect(f.boss.state).toBeUndefined();}});
 it('waits for the hero to land, uses the arena floor rather than the airborne banana, survives a save, and releases after six eggs',()=>{const f=fixture();writeWord(f.w,DKC.entrance,0xe0);writeWord(f.w,DKC.id+6,0x74);writeWord(f.w,DKC.y+6,528);writeWord(f.w,0x12a7,0);const tick=(frame:number)=>f.boss.update(f.w,frame,()=>false,pendingBossVictory(f.w));tick(1);expect(f.boss.state).toBeUndefined();writeWord(f.w,0x12a7,1);tick(2);expect(f.boss.state?.floor).toBe(312);expect(f.boss.state?.exitKind).toBe('banana');f.boss.restore(f.boss.state);for(let i=3;i<65;i++)tick(i);for(let n=0;n<6;n++){expect(f.boss.hit()).toBe(true);for(let i=0;i<700;i++)tick(65+n*700+i);}for(let i=0;i<600;i++)tick(4265+i);expect(f.boss.state?.phase).toBe('released');expect(word(f.w,DKC.state+6)).toBe(0);});
 it('clears an interrupted post-boss fight when its native victory cue disappears',()=>{const f=fixture();writeWord(f.w,DKC.entrance,0xe0);writeWord(f.w,DKC.id+6,0x74);f.boss.update(f.w,1,()=>false,pendingBossVictory(f.w));writeWord(f.w,DKC.id+6,0x70);f.boss.update(f.w,2,()=>false,pendingBossVictory(f.w));expect(f.boss.state).toBeUndefined();});
 it('K.Rool fake defeat does not spawn Burt, real final boundary does',()=>{const f=fixture();writeWord(f.w,DKC.entrance,0x68);writeWord(f.w,DKC.id+6,0x70);writeWord(f.w,DKC.state+6,0xb);writeWord(f.w,0x152d+6,0x12);f.boss.update(f.w,1,()=>false,pendingBossVictory(f.w));expect(f.boss.state).toBeUndefined();writeWord(f.w,0x152d+6,0x13);f.boss.update(f.w,2,()=>false,pendingBossVictory(f.w));expect(f.boss.state).toBeUndefined();writeWord(f.w,DKC.id+6,0x74);writeWord(f.w,DKC.state+6,0);f.boss.update(f.w,3,()=>false,pendingBossVictory(f.w));expect(f.boss.state?.exitKind).toBe('banana');});
});

describe('Burt crossover attacks use native DKC inputs safely',()=>{
 function fight(){const f=fixture();f.tick();Object.assign(f.boss.state!,{phase:'fight',motion:'land',motionTime:0,x:184,y:312,floor:312});writeWord(f.w,DKC.x+2,184);return f;}
 it('roll damages imported Burt once, with no native player or exit state rewrite',()=>{const f=fight();const result=f.boss.update(f.w,2,()=>true,undefined,{rolling:true});expect(result.effect).toBe('hit');expect(f.boss.state?.hp).toBe(5);expect(word(f.w,DKC.hit+2)).toBe(0);expect(word(f.w,DKC.state+2)).toBe(0);f.boss.update(f.w,3,()=>true,undefined,{rolling:true});expect(f.boss.state?.hp).toBe(5);expect(word(f.w,DKC.state+6)).toBe(0);});
 it('descending top contact accepts a stomp and requests native upward recoil only',()=>{const f=fight();writeWord(f.w,0x12a7,0);writeWord(f.w,DKC.y+2,512-185);writeWord(f.w,DKC.vy+2,0xff00);f.boss.update(f.w,2,()=>true);writeWord(f.w,DKC.y+2,512-201);const result=f.boss.update(f.w,3,()=>true);expect(result.notice).toContain('Jump');expect(f.boss.state?.hp).toBe(5);expect(word(f.w,DKC.vy+2)).toBe(0x500);expect(word(f.w,DKC.state+2)).toBe(0);expect(word(f.w,DKC.hit+2)).toBe(0);});
 it('rising head contact does not count as a stomp',()=>{const f=fight();writeWord(f.w,0x12a7,0);writeWord(f.w,DKC.y+2,512-201);writeWord(f.w,DKC.vy+2,0x500);f.boss.update(f.w,2,()=>true);expect(f.boss.state?.hp).toBe(6);});
 it('normal thrown barrel and TNT use native cleanup; held barrels, DK barrels and pieces never damage',()=>{
  for(const[id,state,expected]of [[0x23,2,true],[0x27,2,true],[0x23,1,false],[0x26,2,false],[0x2a,2,false],[0x38,2,false]]as const){const f=fight();writeWord(f.w,DKC.x+2,30);writeWord(f.w,DKC.id+8,id);writeWord(f.w,DKC.state+8,state);writeWord(f.w,DKC.x+8,184);writeWord(f.w,DKC.y+8,512-260);f.boss.update(f.w,2,()=>true);expect(f.boss.state?.hp).toBe(expected?5:6);expect(word(f.w,DKC.hit+8)).toBe(expected?0x20:0);expect(word(f.w,DKC.id+8)).toBe(id);expect(word(f.w,DKC.state+8)).toBe(state);}
 });
 it('sweeps a fast barrel across the boss and consumes it once',()=>{const f=fight();writeWord(f.w,DKC.x+2,30);writeWord(f.w,DKC.id+8,0x23);writeWord(f.w,DKC.state+8,2);writeWord(f.w,DKC.x+8,100);writeWord(f.w,DKC.y+8,512-260);f.boss.update(f.w,2,()=>true);writeWord(f.w,DKC.x+8,260);f.boss.update(f.w,3,()=>true);expect(f.boss.state?.hp).toBe(5);for(let frame=4;frame<50;frame++)f.boss.update(f.w,frame,()=>true);expect(f.boss.state?.hp).toBe(5);});
 it('restores legacy three-hit saves without resetting progress, and preserves airborne world motion in new saves',()=>{const f=fight();const legacy={...f.boss.state!,hp:2};delete legacy.maxHp;delete legacy.motion;delete legacy.arenaLeft;delete legacy.arenaRight;f.boss.restore(legacy);expect(f.boss.state?.hp).toBe(2);expect(f.boss.state?.motion).toBe('windup');f.boss.state!.motion='jump';f.boss.state!.vx=-25;f.boss.state!.vy=-100;f.boss.state!.y=240;const saved=structuredClone(f.boss.state);f.boss.restore(saved);f.boss.update(f.w,600,()=>true);expect(f.boss.state?.x).toBe(saved?.x);expect(f.boss.state?.y).toBe(240);expect(f.boss.state?.vy).toBe(-100);});
});

it('never treats native exit animation as a victory over a living guardian',()=>{
 for(const state of [0x1b,0x1c,0x1d,0x1e,0x1f,0x20,0x3c,0x3d]){const f=fixture();f.tick();const hp=f.boss.state!.hp;writeWord(f.w,DKC.state+2,state);const r=f.boss.update(f.w,10,()=>true);expect(f.boss.state?.phase).toBe('intro');expect(f.boss.state?.hp).toBe(hp);expect(r.notice).toContain('still alive');}
});

it('uses the seventh guardian on Winky’s Walkway, migrates an unfinished legacy save, and retains a completed exit',()=>{
 const f=fixture();writeWord(f.w,DKC.entrance,217);f.boss.update(f.w,1,()=>true);expect(f.boss.state?.id).toBe('tap-tap');
 const save={...f.boss.state!,id:'burt' as const,hp:4};f.boss.restore(save);expect(f.boss.state?.id).toBe('tap-tap');expect(f.boss.state?.hp).toBe(4);
 f.boss.restore({...save,phase:'released',hp:0});expect(f.boss.state?.phase).toBe('released');expect(f.boss.state?.id).toBe('burt');
});

it('grounds an exit guardian on the native platform instead of its door origin16px higher',()=>{const f=fixture();writeWord(f.w,DKC.y+2,184);f.tick();expect(f.boss.state?.floor).toBe(328);const old={...f.boss.state!,floor:312,y:312};f.boss.restore(old);f.tick();expect(f.boss.state?.floor).toBe(328);expect(f.boss.state?.y).toBe(328);});


it('gives the incoming partner three playable seconds of shared boss protection and persists it',()=>{
 const f=fixture();f.tick();Object.assign(f.boss.state!,{phase:'fight',x:140,y:312,floor:312,motion:'windup',motionTime:0});
 f.boss.update(f.w,2,()=>true);expect(word(f.w,DKC.hit+2)).toBe(1);const until=f.boss.state!.heroHitUntil!;expect(until).toBeGreaterThan(3);
 // Native hurt/flee then hands control to the second Kong at the same spot.
 writeWord(f.w,DKC.hit+2,0);writeWord(f.w,DKC.id+4,2);writeWord(f.w,DKC.currentKong,2);writeWord(f.w,DKC.x+4,140);writeWord(f.w,DKC.y+4,200);
 const saved=structuredClone(f.boss.state);f.boss.restore(saved);
 f.boss.update(f.w,1000,()=>true);expect(word(f.w,DKC.hit+4)).toBe(0);expect(f.boss.state?.heroHitUntil).toBe(until);
 Object.assign(f.boss.state!,{elapsed:until-.02,x:140,y:312,motion:'windup',motionTime:0});f.boss.update(f.w,1001,()=>true);expect(word(f.w,DKC.hit+4)).toBe(0);
 Object.assign(f.boss.state!,{elapsed:until,x:140,y:312,motion:'windup',motionTime:0});f.boss.update(f.w,1002,()=>true);expect(word(f.w,DKC.hit+4)).toBe(1);
});
it('does not let rapid eggs damage the native player, exit or guard state',()=>{
 const f=fixture();f.tick();Object.assign(f.boss.state!,{phase:'fight',elapsed:1});const before=f.w.slice();
 for(let i=0;i<100;i++)f.boss.hit();expect(f.boss.state!.hp).toBe(5);expect(f.boss.state!.phase).toBe('fight');expect(f.w).toEqual(before);
});
