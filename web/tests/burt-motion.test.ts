import{describe,it,expect}from'vitest';
import{advanceBurt,burtPose,BURT_NATIVE,type BurtBody}from'../src/burt-motion';
function body():BurtBody{return{x:200,y:312,floor:312,hp:6,maxHp:6,arenaLeft:80,arenaRight:250};}
describe('source-grounded Burt world motion',()=>{
 it('starts with original 0080 horizontal and FB40 vertical speed, then accelerates through all six hit stages',()=>{
  for(let damage=0;damage<6;damage++){const s=body();s.hp-=damage;expect(advanceBurt(s,BURT_NATIVE.windup,100)).toBe('attack');expect(s.vx).toBe(-BURT_NATIVE.speeds[damage]);expect(s.vy).toBe(BURT_NATIVE.jumps[damage]);}
 });
 it('locks each airborne launch direction, bounces off its world wall and lands before winding up',()=>{
  const s=body();advanceBurt(s,.32,100);advanceBurt(s,.1,1000);expect(s.vx).toBe(-25);expect(s.x).toBeCloseTo(197.5);expect(s.y).toBeLessThan(s.floor);
  s.x=80.1;advanceBurt(s,.02,0);expect(s.x).toBe(80);expect(s.vx).toBe(25);
  let landed=false;for(let i=0;i<300;i++)if(advanceBurt(s,1/60,0)==='land'){landed=true;break;}
  expect(landed).toBe(true);expect(s.y).toBe(s.floor);expect(s.motion).toBe('land');expect(s.vx).toBe(0);advanceBurt(s,.16,0);expect(s.motion).toBe('windup');
 });
 it('selects distinct native windup, launch, descent and landing captures without double-squashing',()=>{const s=body();advanceBurt(s,.16,100);expect(burtPose(s).state).toBe('windup');expect(burtPose(s).sx).toBe(1);expect(burtPose(s).sy).toBe(1);advanceBurt(s,.16,100);expect(burtPose(s).state).toBe('rise');s.vy=100;expect(burtPose(s).state).toBe('fall');s.motion='land';expect(burtPose(s).state).toBe('land');});
});
