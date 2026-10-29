import{describe,it,expect}from'vitest';
import{Adventure,CHARACTERS,type Character}from'../src/adventure';
import{TeamTag}from'../src/team-tag';
const p={x:100,y:200,facing:1,grounded:true};
describe('any pair can pass the relay with the goonk-country tap',()=>{
 it('migrates old saves without changing the active hero and rejects invalid pairs',()=>{const a=new Adventure({version:2,characterSet:1,active:'diddy'});expect(a.team).toEqual(['diddy','violet']);const before=a.serialize();expect(a.setTeam('dk','dk')).toBe(false);expect(a.setTeam('invalid'as Character,'pink')).toBe(false);expect(a.serialize()).toEqual(before);});
 for(let i=0;i<CHARACTERS.length;i++)for(let j=i+1;j<CHARACTERS.length;j++)it(`${CHARACTERS[i]} and ${CHARACTERS[j]} meet then exchange once`,()=>{
  const a=new Adventure(),tag=new TeamTag();a.setTeam(CHARACTERS[i],CHARACTERS[j]);tag.update(0,'r',p,a);expect(tag.begin(a,p)).toBe(true);expect(tag.begin(a,p)).toBe(false);
  for(let f=1;f<=12;f++)tag.update(f,'r',p,a);expect(a.active).toBe(CHARACTERS[i]);tag.update(13,'r',p,a);expect(a.active).toBe(CHARACTERS[j]);expect(tag.poses(p,a).contact).toBeGreaterThan(.7);
  for(let f=14;f<40;f++)tag.update(f,'r',p,a);expect(tag.swapping).toBe(false);expect(a.partner).toBe(CHARACTERS[i]);const restored=new Adventure(a.serialize());expect(restored.team).toEqual(a.team);expect(restored.active).toBe(a.active);
 });
 it('requires grounded contact and does not advance the animation on duplicate native frames',()=>{const a=new Adventure(),tag=new TeamTag();expect(tag.begin(a,{...p,grounded:false})).toBe(false);tag.update(1,'r',p,a);tag.begin(a,p);for(let i=0;i<100;i++)tag.update(1,'r',p,a);expect(a.active).toBe('violet');tag.cancel();expect(tag.swapping).toBe(false);});
 it('follows recorded native positions and clears the old trail on room changes or teleport',()=>{const a=new Adventure(),tag=new TeamTag();for(let f=0;f<40;f++)tag.update(f,'a',{...p,x:100+f*3,y:200-f},a);const back=tag.poses({...p,x:217,y:161},a).partner;expect(back.x).toBeLessThan(217);expect(back.y).toBeGreaterThan(161);tag.update(40,'a',{...p,x:2000},a);expect(tag.poses({...p,x:2000},a).partner.x).toBe(1970);tag.begin(a,p);tag.update(41,'b',p,a);expect(tag.swapping).toBe(false);});
});
