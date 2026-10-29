import{describe,it,expect}from'vitest';
import{DkcCombat,sweptHit,type DkcTarget}from'../src/dkc-combat';
const target:DkcTarget={slot:6,id:10,x:65,y:120,width:26,height:32},hero={x:20,y:120,facing:1};
describe('DKC tongue and egg bridge',()=>{
 it('eats one nearby enemy through its native hit request then needs Down to create an egg',()=>{const c=new DkcCombat();let hits=0;expect(c.update(1,0,hero,[target],false,true,false,()=>{hits++;return true;}).ate).toBe(true);expect(c.eggs).toBe(0);expect(c.mouth).toBe(target.id);c.update(2,16,hero,[target],false,true,false,()=>{hits++;return true;});expect(hits).toBe(1);expect(c.update(3,32,hero,[],false,false,false,()=>true,undefined,{down:true}).madeEgg).toBe(true);expect(c.eggs).toBe(1);expect(c.mouth).toBeUndefined();});
 it('does not award ammunition for a refused native hit or out of reach target',()=>{const c=new DkcCombat();c.update(1,0,hero,[target],false,true,false,()=>false);expect(c.eggs).toBe(0);c.update(2,20,hero,[{...target,x:200}],false,false,false,()=>true);c.update(3,40,hero,[{...target,x:200}],false,true,false,()=>true);expect(c.eggs).toBe(0);});
 it('throws an earned egg and hits an actual enemy only on swept collision',()=>{const c=new DkcCombat();c.eggs=1;let hits=0;c.update(1,0,hero,[target],true,false,false,()=>{hits++;return true;});expect(c.eggs).toBe(1);expect(c.aiming).toBeDefined();c.update(1,1,hero,[],false,false,false,()=>true);c.update(1,2,hero,[],true,false,false,()=>true);expect(c.eggs).toBe(0);expect(hits).toBe(0);for(let f=2;f<30;f++)c.update(f,f*16,hero,[target],false,false,false,()=>{hits++;return true;});expect(hits).toBe(1);expect(c.shots).toHaveLength(0);});
 it('cannot throw empty ammunition or repeat a held fire input',()=>{const c=new DkcCombat();c.update(1,0,hero,[],true,false,false,()=>true);expect(c.shots).toHaveLength(0);c.eggs=3;for(let f=2;f<20;f++)c.update(f,f*16,hero,[],true,false,false,()=>true);expect(c.eggs).toBe(3);});
 it('handles facing, upward tongue, misses and six egg capacity',()=>{expect(sweptHit(0,0,10,0,target)).toBe(false);const c=new DkcCombat();c.eggs=6;c.update(1,0,{x:100,y:120,facing:-1},[target],false,true,false,()=>true);expect(c.eggs).toBe(6);expect(c.tongue!.endX).toBeLessThan(c.tongue!.x);});
 it('restores valid inventory/projectiles without an elapsed pause jump',()=>{const c=new DkcCombat();c.eggs=2;c.update(1,0,hero,[],true,false,false,()=>true);const saved=c.serialize(),r=new DkcCombat();r.restore(saved);r.update(90000,1e8,hero,[],false,false,false,()=>true);expect(r.serialize()).toEqual(saved);r.restore({eggs:999,shots:[{x:NaN}]});expect(r.eggs).toBe(6);expect(r.shots).toHaveLength(0);});
});

describe('aimed eggs against a Yoshi guardian in DKC',()=>{
 const guardian:DkcTarget={slot:-1,id:0,x:180,y:120,width:55,height:70};
 it('refills six trailing eggs without eating or counting the guardian as a regular kill',()=>{
  const c=new DkcCombat();let requests=0;
  const result=c.update(1,0,hero,[],false,true,false,()=>{requests++;return true;},{...guardian,x:65});
  expect(result.ate).toBe(false);expect(result.killed).toBe(0);expect(requests).toBe(0);expect(c.eggs).toBe(6);expect(c.eggTrail).toHaveLength(6);
  for(let f=2;f<=20;f++)c.update(f,f*16,{...hero,x:20+f*3},[],false,false,false,()=>true,guardian);
  const trail=c.eggTrail;expect(trail[0].x).toBeLessThan(80);expect(trail[5].x).toBeLessThan(trail[0].x);expect(trail.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))).toBe(true);
 });
 it('first press aims, held input only moves the reticle, second press follows the chosen angle without snapping',()=>{
  const c=new DkcCombat();expect(c.update(1,0,hero,[],true,false,false,()=>true,guardian).threw).toBe(false);expect(c.shots).toHaveLength(0);const initial=c.aiming!;
  for(let f=2;f<=20;f++)c.update(f,f*16,hero,[],true,false,false,()=>true,guardian);
  expect(c.shots).toHaveLength(0);expect(c.aiming!.endY).not.toBe(initial.endY);
  c.update(21,336,hero,[],false,false,false,()=>true,guardian);const aim=c.aiming!;
  // Same native frame: angle and reticle must not advance between release/fire.
  expect(c.update(21,337,hero,[],true,false,false,()=>true,guardian).threw).toBe(true);
  const shot=c.shots[0],ratio=(aim.endY-aim.y)/(aim.endX-aim.x);expect(shot.vy/shot.vx).toBeCloseTo(ratio);expect(c.aiming).toBeUndefined();expect(c.eggs).toBe(6);
  expect(Math.abs(shot.vy)).toBeGreaterThan(10); // Guardian is straight ahead; no auto-aim correction.
 });
 it('sweeps a real projectile into the guardian callback once without increasing enemy kills',()=>{
  const c=new DkcCombat();c.shots=[{x:160,y:100,vx:300,vy:0,age:0}];let requests=0;
  c.update(1,0,hero,[],false,false,false,()=>{requests++;return false;},guardian);
  const result=c.update(2,16,hero,[],false,false,false,t=>{expect(t.slot).toBe(-1);requests++;return true;},guardian);
  expect(requests).toBe(1);expect(result.killed).toBe(0);expect(c.shots).toHaveLength(0);
 });
 it('preserves an aimed shot through save, pause and the end of a guardian',()=>{
  const c=new DkcCombat();c.update(1,0,hero,[],true,false,false,()=>true,guardian);c.update(12,200,hero,[],false,false,false,()=>true,guardian);const saved=c.serialize();
  const restored=new DkcCombat();restored.restore(saved);restored.update(90000,1e8,hero,[],false,false,false,()=>true,guardian);
  expect(restored.serialize()).toEqual(saved);const aim={...restored.aiming!};restored.resetClock();restored.update(99999,2e8,hero,[],false,false,false,()=>true,guardian);expect(restored.aiming).toEqual(aim);
  restored.update(100000,2e8+16,hero,[],false,false,false,()=>true);expect(restored.aiming).toBeDefined();expect(restored.serialize().aimPhase).toBeDefined();
 });
 it('keeps the trail near a teleported player, and keeps regular earned eggs finite',()=>{
  const c=new DkcCombat();c.update(1,0,hero,[],false,false,false,()=>true,guardian);c.update(2,16,{...hero,x:2000,y:1800},[],false,false,false,()=>true,guardian);
  expect(c.eggTrail.every(p=>p.x>1900&&p.y===1788)).toBe(true);
  c.update(3,32,{...hero,x:2000,y:1800},[],true,false,false,()=>true);expect(c.eggs).toBe(6);c.update(4,48,{...hero,x:2000,y:1800},[],false,false,false,()=>true);c.update(5,64,{...hero,x:2000,y:1800},[],true,false,false,()=>true);expect(c.eggs).toBe(5);expect(c.eggTrail).toHaveLength(5);
 });
});

describe('directional tongue and finite Yoshi-style inventory',()=>{
 it('captures above, below and diagonally without eating an enemy in another direction',()=>{for(const direction of[{x:0,y:-1},{x:0,y:1},{x:1,y:-1},{x:-1,y:1}]){const c=new DkcCombat(),start={x:hero.x+12,y:hero.y-17},enemy={...target,x:start.x+direction.x*42,y:start.y+direction.y*42+6,width:12,height:12};expect(c.update(1,0,hero,[enemy],false,true,false,()=>true,undefined,{direction}).ate).toBe(true);expect(c.eggs).toBe(0);expect(c.mouth).toBe(enemy.id);}});
 it('saves the enemy in the mouth, converts only once on Down and never exceeds six eggs',()=>{const c=new DkcCombat();c.restore({eggs:5,mouth:10,shots:[]});const r=new DkcCombat();r.restore(c.serialize());expect(r.update(1,0,hero,[],false,false,false,()=>true,undefined,{down:true}).madeEgg).toBe(true);expect(r.eggs).toBe(6);expect(r.update(2,16,hero,[],false,false,false,()=>true,undefined,{down:true}).madeEgg).toBe(false);expect(r.eggs).toBe(6);});
});

describe('original DKC bosses use eggs without becoming swallowable enemies',()=>{
 const boss={...target,nativeBoss:true};
 it('never swallows a native boss or turns it into ammunition',()=>{const c=new DkcCombat();let hits=0;expect(c.update(1,0,hero,[boss],false,true,false,()=>{hits++;return true;}).ate).toBe(false);expect(hits).toBe(0);expect(c.mouth).toBeUndefined();});
 it('refills during native invulnerability and consumes a real boss collision without an enemy kill',()=>{const c=new DkcCombat();c.update(1,0,hero,[],false,false,false,()=>true,undefined,{unlimited:true});expect(c.eggs).toBe(6);c.shots=[{x:60,y:100,vx:300,vy:0,age:0}];let hits=0;const r=c.update(2,16,hero,[boss],false,false,false,()=>{hits++;return true;},undefined,{unlimited:true});expect(hits).toBe(1);expect(r.killed).toBe(0);expect(c.shots).toEqual([]);expect(c.eggTrail).toHaveLength(6);});
});

it('collects an item by egg without eating it, making ammunition or counting an enemy kill',()=>{
 const c=new DkcCombat(),item={...target,collectible:true};let hits=0;
 expect(c.update(1,0,hero,[item],false,true,false,()=>{hits++;return true;}).ate).toBe(false);expect(hits).toBe(0);
 c.shots=[{x:60,y:100,vx:300,vy:0,age:0}];const r=c.update(2,16,hero,[item],false,false,false,()=>{hits++;return true;});
 expect(hits).toBe(1);expect(r.killed).toBe(0);expect(r.impacted).toBe(true);expect(c.mouth).toBeUndefined();expect(c.impacts).toHaveLength(1);
});
it('renders a launched egg for one frame even if an overlapping enemy accepts an immediate hit',()=>{
 const c=new DkcCombat();c.eggs=1;c.update(1,0,hero,[],true,false,false,()=>true);c.update(2,16,hero,[],false,false,false,()=>true);
 const overlap={...target,x:32,y:103};let hits=0;const r=c.update(3,32,hero,[overlap],true,false,false,()=>{hits++;return true;});
 expect(r.threw).toBe(true);expect(hits).toBe(0);expect(c.shots).toHaveLength(1);expect(c.shots[0].age).toBe(0);expect(c.launch?.until).toBe(212);
 c.update(4,48,hero,[overlap],false,false,false,()=>{hits++;return true;});expect(hits).toBe(1);expect(c.shots).toHaveLength(0);
});
