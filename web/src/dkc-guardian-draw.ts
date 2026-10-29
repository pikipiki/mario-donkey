import{guardianAnimationDuration,guardianDamageStage,guardianSettledY}from'./guardian-animation';
import{YOSHI_GUARDIANS}from'./yoshi-guardian-spec';
import {burtPose}from'./burt-motion';
import type{SpriteAtlas}from'./atlas';
import type{DkcGuardianSave}from'./dkc-guardian';
export function drawDkcEgg(c:CanvasRenderingContext2D,x:number,y:number):void{
 x=Math.round(x);y=Math.round(y);c.fillStyle='#25432a';c.beginPath();c.ellipse(x,y,5,7,0,0,Math.PI*2);c.fill();c.fillStyle='#fffbe3';c.beginPath();c.ellipse(x,y,4,6,0,0,Math.PI*2);c.fill();c.fillStyle='#63a74c';c.fillRect(x-3,y-2,3,3);c.fillRect(x,y+2,3,3);
}
export function drawDkcGuardian(c:CanvasRenderingContext2D,atlas:SpriteAtlas,s:DkcGuardianSave|undefined,cameraX:number,cameraY:number,pad:number,heroes?:number):void{
 if(!s||s.phase==='released')return;
 c.save();
 const pose=burtPose(s),stage=guardianDamageStage(s.hp,s.maxHp??3),hurt=s.phase==='fight'&&s.elapsed<s.hitUntil;
 const key=s.phase==='dying'?'dead':hurt?`hurt-${stage}`:`${s.id==='burt'?pose.state:'idle'}-${stage}`;
 const age=s.phase==='dying'?s.phaseTime:hurt?Math.max(0,s.elapsed-s.hitUntil+guardianAnimationDuration(s.id,key)):pose.time/1000;
 const anchorX=(hurt||s.phase==='dying')?(s.animationX??s.x):s.x,anchorY=(hurt||s.phase==='dying')?guardianSettledY(s.id,s.animationY??s.y,s.floor,age):s.y;
 if(s.id==='froggy'&&hurt)atlas.drawYoshiBoss(c,'idle',Math.round(s.x-cameraX),Math.round(s.y-cameraY+pad),s.elapsed*1000,s.id);
 const native=atlas.drawGuardianSequence(c,s.id,key,anchorX-cameraX,anchorY-cameraY+pad,age,(hurt||s.phase==='dying')?(s.animationMirror??1):s.id==='burt'?-(s.direction??-1):1);
 if(!native){
  // The donor movement bank stays visible while the encounter's own bank loads.
  atlas.drawYoshiBoss(c,s.phase==='intro'?'idle':pose.state,Math.round(s.x-cameraX),Math.round(s.y-cameraY+pad),pose.time,s.id);
 }
 c.globalAlpha=1;c.fillStyle='#101d25ed';c.fillRect(5,pad+5,246,26);c.fillStyle='#fff5d6';c.font='bold 9px sans-serif';c.textAlign='left';c.fillText(YOSHI_GUARDIANS.find(p=>p.id===s.id)?.name??s.id,10,pad+16);if(heroes!==undefined){c.textAlign='center';c.fillText(`HEROES ${heroes}`,172,pad+16);}c.textAlign='right';c.fillText('EGGS ∞',245,pad+16);c.fillStyle='#4c4b4b';c.fillRect(10,pad+21,235,5);c.fillStyle=s.elapsed<s.hitUntil?'#fff':'#d3ed8c';c.fillRect(10,pad+21,235*s.hp/(s.maxHp??3),5);c.restore();
}
