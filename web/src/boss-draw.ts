import type {SpriteAtlas} from './atlas';
import {STAGE_BOSSES,type GuardianSave} from './boss';
export function drawStageBoss(ctx:CanvasRenderingContext2D,atlas:SpriteAtlas,s:GuardianSave|undefined,cameraX:number,cameraY:number,topPadding:number):void{
 if(!s||s.phase==='released')return;
 const x=s.x-cameraX,y=s.y-cameraY+topPadding,spec=STAGE_BOSSES.find(b=>b.id===s.id)!;
 ctx.save();
 if(s.phase==='exit'){
  if(s.kind!=='goal'&&s.ring){
   const rx=s.ring.x-cameraX,ry=s.ring.y-cameraY+topPadding;
   ctx.strokeStyle='#fcf2a4';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(rx,ry,27,43,0,0,Math.PI*2);ctx.stroke();
   for(let i=0;i<10;i++){const a=i*Math.PI/5;ctx.fillStyle=i%2?'#c7ed95':'#9e97f5';ctx.fillRect(Math.round(rx+Math.cos(a)*27)-3,Math.round(ry+Math.sin(a)*43)-3,6,6);}
   ctx.fillStyle='#fff';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText('EXIT',rx,ry-48);
  }
  ctx.restore();return;
 }
 const dying=s.phase==='dying';ctx.globalAlpha=dying?Math.max(0,1-s.phaseTime/.8):1;
 const pose=dying?'dead':s.elapsed<s.hitUntil?'hurt':s.phase==='intro'?'idle':'attack';
 atlas.drawBoss(ctx,s.id,pose,x,y,s.elapsed*1000,s.facing);
 for(const p of s.shots){
  const px=Math.round(p.x-cameraX),py=Math.round(p.y-cameraY+topPadding);
  if(p.kind==='egg'){
   ctx.fillStyle='#fff8dc';ctx.beginPath();ctx.ellipse(px,py,5,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#68a845';ctx.fillRect(px-3,py-3,3,3);ctx.fillRect(px+1,py+1,3,3);
  }else{
   ctx.fillStyle=p.kind==='crown'?'#f5d957':'#c58b55';ctx.strokeStyle='#34241f';ctx.lineWidth=1;
   if(p.kind==='crown'){ctx.beginPath();ctx.moveTo(px-7,py+4);ctx.lineTo(px-8,py-6);ctx.lineTo(px-2,py-1);ctx.lineTo(px+1,py-8);ctx.lineTo(px+4,py-1);ctx.lineTo(px+9,py-5);ctx.lineTo(px+7,py+4);ctx.closePath();ctx.fill();ctx.stroke();}
   else {ctx.beginPath();ctx.arc(px,py,p.kind==='shock'?7:5,0,Math.PI*2);ctx.fill();ctx.stroke();}
  }
 }
 ctx.globalAlpha=1;ctx.fillStyle='#101d25ed';ctx.fillRect(5,5,246,26);ctx.fillStyle='#fff5d6';ctx.font='bold 9px sans-serif';ctx.textAlign='left';ctx.fillText(spec.name,10,16);
 ctx.textAlign='right';ctx.fillText('EGGS ∞',245,16);ctx.fillStyle='#4c4b4b';ctx.fillRect(10,21,235,5);ctx.fillStyle=s.elapsed<s.hitUntil?'#fff':'#d3ed8c';ctx.fillRect(10,21,235*s.hp/s.maxHp,5);
 ctx.restore();
}
