import {describe,expect,it,vi} from 'vitest';
import {bossSparks,drawStageBoss} from '../src/boss-draw';
import type{GuardianSave}from'../src/boss';
import type{SpriteAtlas}from'../src/atlas';
function encounter(overrides:Partial<GuardianSave>={}):GuardianSave{return{version:1,stage:1,room:'room',id:'necky',kind:'goal',slot:21,phase:'fight',hp:2,maxHp:3,x:222,y:104,floor:190,elapsed:2,phaseTime:0,nextAttack:3,hitUntil:0,facing:-1,shots:[],...overrides};}
function drawing(){
 const events:string[]=[];const ctx={save:vi.fn(),restore:vi.fn(),translate:vi.fn(),scale:vi.fn(),fillRect:vi.fn(()=>events.push('prop')),fillText:vi.fn(),beginPath:vi.fn(),ellipse:vi.fn(),stroke:vi.fn(),arc:vi.fn(),fill:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),closePath:vi.fn()} as unknown as CanvasRenderingContext2D;
 const drawBoss=vi.fn(()=>events.push('boss'));return{ctx,atlas:{drawBoss}as unknown as SpriteAtlas,drawBoss,events};
}
describe('original Necky arena presentation',()=>{
 it.each(['necky','necky-snr']as const)('places %s neck recess and supports at the screen edge, behind the real sprite',id=>{
  const f=drawing();drawStageBoss(f.ctx,f.atlas,encounter({id,x:722,y:804,floor:890}),500,700,8);
  expect(f.ctx.translate).toHaveBeenCalledWith(256,0);expect(f.ctx.scale).toHaveBeenCalledWith(1,1);
  expect(f.events[0]).toBe('prop');expect(f.events).toContain('boss');expect(f.drawBoss).toHaveBeenCalledWith(f.ctx,id,'attack',222,112,2000,-1);
 });
 it('mirrors the arena for the opposite screen edge and never adds scenery to Queen B',()=>{
  const left=drawing();drawStageBoss(left.ctx,left.atlas,encounter({x:34,facing:1}),0,0,0);expect(left.ctx.translate).toHaveBeenCalledWith(0,0);expect(left.ctx.scale).toHaveBeenCalledWith(-1,1);
  const queen=drawing();drawStageBoss(queen.ctx,queen.atlas,encounter({id:'queen-b'}),0,0,0);expect(queen.ctx.translate).not.toHaveBeenCalled();expect(queen.events[0]).toBe('boss');
 });
 it('removes arena props at exit and released rather than obstructing native victory',()=>{
  for(const phase of ['exit','released']as const){const f=drawing();drawStageBoss(f.ctx,f.atlas,encounter({phase}),0,0,0);expect(f.ctx.translate).not.toHaveBeenCalled();expect(f.drawBoss).not.toHaveBeenCalled();}
 });
});
describe('bounded boss impact and defeat effects',()=>{
 it('shows impact sparks only during the collision grace window',()=>{
  expect(bossSparks(encounter())).toEqual([]);const sparks=bossSparks(encounter({elapsed:2,hitUntil:2.2}));expect(sparks).toHaveLength(7);expect(sparks.every(p=>p.alpha>0&&p.alpha<1&&Number.isFinite(p.x)&&Number.isFinite(p.y))).toBe(true);
  expect(bossSparks(encounter({elapsed:2.4,hitUntil:2.2}))).toEqual([]);expect(bossSparks(encounter({phase:'intro',hitUntil:2.2}))).toEqual([]);
 });
 it('defeat particles spread, fade and expire without a permanent frame loop',()=>{
  const first=bossSparks(encounter({phase:'dying',phaseTime:0})),last=bossSparks(encounter({phase:'dying',phaseTime:.7}));expect(first).toHaveLength(12);expect(last).toHaveLength(12);expect(last[0].x).toBeGreaterThan(first[0].x);expect(last[0].alpha).toBeLessThan(first[0].alpha);expect(bossSparks(encounter({phase:'dying',phaseTime:.9}))).toEqual([]);
 });
});

it('keeps Necky scenery in the saved arena when the camera scrolls',()=>{const f=drawing();drawStageBoss(f.ctx,f.atlas,encounter({x:722,y:804,floor:890,arena:{x:500,y:700,height:224}}),600,750,8);expect(f.ctx.translate).toHaveBeenCalledWith(156,0);expect(f.drawBoss).toHaveBeenCalledWith(f.ctx,'necky','attack',122,62,2000,-1);});
