import{describe,it,expect}from'vitest';
import{readFileSync}from'node:fs';
import{guardianAnimationDuration,guardianDefeatCue,guardianFrameLift,guardianCinematicAnchor,guardianSettledY,guardianFrameAt,guardianDamageStage,type GuardianAnimationBank}from'../src/guardian-animation';
import{YOSHI_GUARDIANS}from'../src/yoshi-guardian-spec';
import{DkcGuardian}from'../src/dkc-guardian';
import{DKC}from'../src/dkc-profile';
import{writeWord}from'../src/profile';
const bank=(id:string)=>JSON.parse(readFileSync(new URL(`../public/art/guardian-sequences/${id}.json`,import.meta.url),'utf8'))as GuardianAnimationBank;
describe('original Yoshi guardian animation playback',()=>{
 it('clamps injury/death at the last native frame, while movement loops',()=>{
  const first={x:0,y:0,w:8,h:8,dx:0,dy:0,duration:.12},last={...first,x:8,dx:40,dy:-60};
  const clip={frames:[first,last],duration:.24};expect(guardianFrameAt(clip,0)).toBe(first);expect(guardianFrameAt(clip,.12)).toBe(last);expect(guardianFrameAt(clip,20)).toBe(last);expect(guardianFrameAt({...clip,loop:true},.25)).toBe(first);
 });
 it('retains six progressive damage tiers and maps existing three-hit saves monotonically',()=>{expect([6,5,4,3,2,1].map(h=>guardianDamageStage(h,6))).toEqual([0,1,2,3,4,5]);expect([3,2,1].map(h=>guardianDamageStage(h,3))).toEqual([0,2,4]);});
 it('ships separate decoded native damage/death clips for every selected boss inside mobile texture limits',()=>{
  for(const {id}of YOSHI_GUARDIANS){const m=bank(id),png=readFileSync(new URL(`../public/art/guardian-sequences/${id}.png`,import.meta.url)),width=png.readUInt32BE(16),height=png.readUInt32BE(20);
   expect(width,id).toBeLessThanOrEqual(4096);expect(height,id).toBeLessThanOrEqual(4096);
   for(const key of['idle-0','idle-1','idle-2','idle-3','idle-4','idle-5','hurt-1','hurt-2','hurt-3','hurt-4','hurt-5','dead']){const clip=m.clips[key];expect(clip,id+key).toBeDefined();expect(clip.frames.length,id+key).toBeGreaterThan(0);expect(clip.duration,id+key).toBeGreaterThan(0);for(const f of clip.frames){expect(f.x+f.w).toBeLessThanOrEqual(width);expect(f.y+f.h).toBeLessThanOrEqual(height);expect(f.duration).toBeGreaterThan(0);}}
   expect(m.clips.dead.loop,id).toBe(false);expect(m.clips.dead.frames.length,id).toBeGreaterThan(1);
  }
 });
 it('keeps Burt native trousers tiers distinct and plays his full fly/shrink sequence',()=>{const m=bank('burt'),tiers=[0,1,2,3,4,5].map(n=>m.clips[`idle-${n}`].frames[0]);expect(new Set(tiers.map(f=>`${f.x},${f.y}`)).size).toBe(6);expect(m.clips.dead.duration).toBeGreaterThan(9);expect(new Set(m.clips.dead.frames.map(f=>f.w)).size).toBeGreaterThan(8);expect(m.clips.dead.frames.some(f=>f.dy< -150)).toBe(true);});
 it('holds the native exit through death, a paused restore and a slow animation load',()=>{
  const w=new Uint8Array(0x20000);for(const[p,v]of[[DKC.height,512],[DKC.entrance,22],[DKC.id+2,1],[DKC.x+2,20],[DKC.y+2,200],[0x12a7,1],[DKC.id+6,0x6a],[DKC.x+6,200],[DKC.y+6,200]])writeWord(w,p,v);
  const g=new DkcGuardian();g.update(w,0,()=>true);Object.assign(g.state!,{phase:'fight',hp:1,hitUntil:0});expect(g.hit()).toBe(true);
  for(let frame=1;frame<=60;frame++)g.update(w,frame,()=>true);expect(g.state?.phase).toBe('dying');const elapsed=g.state!.phaseTime;
  g.restore(structuredClone(g.state));g.update(w,600,()=>true);expect(g.state!.phaseTime).toBe(elapsed);
  for(let frame=601;frame<1200;frame++)g.update(w,frame,()=>true,undefined,{visualReady:false});expect(g.state!.phaseTime).toBe(elapsed);
  for(let frame=1200;frame<1800;frame++)g.update(w,frame,()=>true);expect(g.state?.phase).toBe('released');
 });
});

it('keeps every boss exit closed for the whole donor defeat and never repeats its FX after resume',()=>{
 for(const {id}of YOSHI_GUARDIANS){
  const w=new Uint8Array(0x20000);for(const[p,v]of[[DKC.height,512],[DKC.entrance,22],[DKC.id+2,1],[DKC.x+2,20],[DKC.y+2,200],[0x12a7,1],[DKC.id+6,0x6a],[DKC.x+6,200],[DKC.y+6,200]])writeWord(w,p,v);
  const g=new DkcGuardian();g.update(w,0,()=>true);Object.assign(g.state!,{id,phase:'fight',hp:1,hitUntil:0});g.hit();let cues=0,frame=0;
  while(g.state!.phaseTime<guardianDefeatCue(id)+.1){if(g.update(w,++frame,()=>true).effect==='defeat')cues++;}
  expect(cues,id).toBe(1);const checkpoint=structuredClone(g.state);g.restore(checkpoint);g.update(w,++frame,()=>true);expect(g.state!.phaseTime).toBe(checkpoint!.phaseTime);
  while(g.state!.phaseTime<guardianAnimationDuration(id,'dead')-.1){if(g.update(w,++frame,()=>true).effect==='defeat')cues++;expect(g.state!.phase,id).toBe('dying');}
  for(let i=0;i<10;i++)if(g.update(w,++frame,()=>true).effect==='defeat')cues++;
  expect(g.state!.phase,id).toBe('released');expect(cues,id).toBe(1);
 }
});

it('matches Bigger Boo collision growth to native visible art without magnifying it beyond the viewport',()=>{
 const m=bank('bigger-boo'),g=new DkcGuardian();g.state={version:1,level:101,slot:6,id:'bigger-boo',phase:'fight',hp:6,maxHp:6,x:150,y:100,floor:190,elapsed:0,phaseTime:0,hitUntil:0,cameraX:0,cameraY:0};
 const widths:number[]=[];for(let hp=6;hp>=1;hp--){g.state.hp=hp;const t=g.target()!;widths.push(t.width);const native=m.clips[`idle-${6-hp}`].frames[0];expect(t.width).toBeCloseTo(native.w*m.scale*.9);expect(native.w*m.scale).toBeLessThan(256);expect(t.y-t.height).toBeGreaterThanOrEqual(0);}
 expect(widths).toEqual([...widths].sort((a,b)=>a-b));expect(widths.at(-1)).toBeGreaterThan(widths[0]*3);
});

it('stages Raphael moon and final constellation above the DKC floor',()=>{
 const m=bank('raphael'),floor=190,anchor=guardianCinematicAnchor('raphael',{x:145,y:160,floor,arenaLeft:40,arenaRight:216}),frame=guardianFrameAt(m.clips.dead,13.5)!;
 expect(anchor.y+frame.dy*m.scale+guardianFrameLift(m,'dead',13.5)*m.scale+frame.h*m.scale).toBeLessThan(floor);
 const moon=m.context!.find(c=>c.layer==='behind')!;expect(anchor.y+(moon.dy+moon.h)*m.scale).toBeLessThan(floor);expect(guardianFrameLift(m,'hurt-1',13.5)).toBe(0);
});

it('keeps the native Froggy throat view opaque despite the unused zero alpha byte in Mesen BGRA',()=>{const m=bank('froggy');for(let n=1;n<=5;n++){expect(m.clips[`hurt-${n}`].opaque).toBe(true);expect(m.clips[`hurt-${n}`].scale).toBe(.5);}});

it('recoils Burt away from the actual attack and preserves that native-animation direction in a save',()=>{
 for(const originX of[0,300]){
  const w=new Uint8Array(0x20000);for(const[p,v]of[[DKC.height,512],[DKC.entrance,22],[DKC.id+2,1],[DKC.x+2,20],[DKC.y+2,200],[0x12a7,1],[DKC.id+6,0x6a],[DKC.x+6,200],[DKC.y+6,200]])writeWord(w,p,v);
  const g=new DkcGuardian();g.state={version:1,level:22,slot:6,id:'burt',phase:'fight',hp:6,maxHp:6,x:150,y:190,floor:190,elapsed:0,phaseTime:0,hitUntil:0,cameraX:0,cameraY:0,arenaLeft:40,arenaRight:216,direction:-1};
  expect(g.hit(originX)).toBe(true);expect(g.state.animationMirror).toBe(originX===0?1:-1);g.restore(structuredClone(g.state));expect(g.state!.animationMirror).toBe(originX===0?1:-1);
  let frame=0;while(g.state!.elapsed<g.state!.hitUntil)g.update(w,++frame,()=>true);
  expect(originX===0?g.state!.x>150:g.state!.x<150).toBe(true);
 }
});

it('retains Burt complete high stretch and airborne head instead of importing donor viewport cuts',()=>{
 const m=bank('burt'),stretch=m.clips['hurt-1'].frames,flight=guardianFrameAt(m.clips.dead,6.4)!;
 expect(Math.max(...stretch.map(f=>f.h))).toBeGreaterThan(230);
 expect(flight.h).toBeGreaterThan(flight.w);
});

it('anchors Tap-Tap lava to the arena floor even if the last blow lands during a jump',()=>{expect(guardianCinematicAnchor('tap-tap',{x:150,y:80,floor:190})).toEqual({x:150,y:190});});

it('settles a grounded boss injury after an airborne hit while leaving Boo and the lunar flight unchanged',()=>{
 for(const id of['burt','salvo','milde','tap-tap']as const){expect(guardianSettledY(id,120,190,0)).toBe(120);expect(guardianSettledY(id,120,190,.25)).toBe(155);expect(guardianSettledY(id,120,190,1)).toBe(190);}
 expect(guardianSettledY('bigger-boo',120,190,1)).toBe(120);expect(guardianSettledY('raphael',90,190,10)).toBe(90);
});

it('counter-rotates only Raphael idle tiers and keeps original native injury/death frames',()=>{const m=bank('raphael'),idle=m.clips['idle-0'];expect(idle.orientation?.radians).toBeCloseTo(-26*Math.PI*2/256);for(let i=0;i<6;i++)expect(m.clips[`idle-${i}`]).toEqual(idle);for(const key of['hurt-1','hurt-2','hurt-3','hurt-4','hurt-5','dead'])expect(m.clips[key].orientation).toBeUndefined();});
