import type {SpriteAtlas} from './atlas';
import {STAGE_BOSSES,type GuardianSave} from './boss';
/** Scenery stays at the arena edge, so Necky's original neck ends off-screen
 * rather than leaving an unexplained severed head in the middle of the stage.
 * These small props are presentation only; native terrain is never changed. */
function drawNeckyArena(ctx:CanvasRenderingContext2D,s:GuardianSave,x:number,y:number,floor:number,top:number,cameraX:number,cameraY:number):void{
 const right=s.facing<0,edge=(s.arena?s.arena.x-cameraX:0)+(right?256:0);
 ctx.save();ctx.translate(edge,0);ctx.scale(right?1:-1,1);
 const ground=Math.min((s.arena?s.arena.y-cameraY+s.arena.height-2:222)+top,Math.max(y+23,floor)),ceiling=(s.arena?s.arena.y-cameraY:0)+top+35;
 ctx.fillStyle='#342c36';ctx.fillRect(-18,ceiling,18,ground-ceiling);
 ctx.fillStyle='#645554';
 for(let row=0;row<12;row++){
  const sy=ceiling+row*16;if(sy>=ground)break;
  ctx.fillRect(-18+(row%2)*3,sy,17,13);ctx.fillStyle='#8c7464';ctx.fillRect(-17+(row%2)*3,sy,13,3);ctx.fillStyle='#645554';
 }
 // Dark recess hides the end of the original short neck in the rock wall.
 const localX=(x-edge)*(right?1:-1),mouth=Math.min(-16,Math.round(localX+23));
 ctx.fillStyle='#151c22';ctx.fillRect(mouth,y-24,-mouth+2,38);
 ctx.fillStyle='#a48151';ctx.fillRect(-25,y-29,27,5);ctx.fillRect(-25,y+14,27,5);
 ctx.fillStyle='#5a3c27';ctx.fillRect(-23,y+19,5,Math.max(0,ground-y-19));
 ctx.fillStyle='#b18b55';ctx.fillRect(-37,ground-6,39,7);
 ctx.fillStyle='#493d29';ctx.fillRect(-35,ground+1,37,4);
 // Light moss connects the rock frame to the island's vegetation.
 ctx.fillStyle='#58734a';ctx.fillRect(-24,ceiling,24,4);ctx.fillRect(-29,ground-8,30,3);
 ctx.restore();
}
export interface BossSpark{x:number;y:number;size:number;alpha:number;color:string}
/** Bounded deterministic particles; no allocations persist across saved games. */
export function bossSparks(s:GuardianSave):BossSpark[]{
 if(s.phase!=='fight'&&s.phase!=='dying')return[];
 const dying=s.phase==='dying',age=dying?s.phaseTime:s.elapsed-(s.hitUntil-.3);
 if((!dying&&(age<0||age>=.3))||(dying&&age>.8))return[];
 const duration=dying?.8:.3,count=dying?12:7,t=Math.max(0,age),alpha=Math.max(0,1-t/duration),spec=STAGE_BOSSES.find(b=>b.id===s.id)!;
 return Array.from({length:count},(_,i)=>{
  const angle=i*Math.PI*2/count+(dying?.2:0),speed=dying?28+i%3*12:26+i%2*8;
  return{x:s.x+Math.cos(angle)*(8+t*speed),y:s.y-spec.height*.5+Math.sin(angle)*(8+t*speed)+t*t*22,size:dying?3:2,alpha,color:i%2?'#fff4bb':'#edb744'};
 });
}
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
 if(s.id==='necky'||s.id==='necky-snr')drawNeckyArena(ctx,s,x,y,s.floor-cameraY+topPadding,topPadding,cameraX,cameraY);
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
 for(const spark of bossSparks(s)){ctx.globalAlpha=spark.alpha;ctx.fillStyle=spark.color;ctx.fillRect(Math.round(spark.x-cameraX)-spark.size/2,Math.round(spark.y-cameraY+topPadding)-spark.size/2,spark.size,spark.size);}
 ctx.globalAlpha=1;ctx.fillStyle='#101d25ed';ctx.fillRect(5,5,246,26);ctx.fillStyle='#fff5d6';ctx.font='bold 9px sans-serif';ctx.textAlign='left';ctx.fillText(spec.name,10,16);
 ctx.textAlign='right';ctx.fillText('EGGS ∞',245,16);ctx.fillStyle='#4c4b4b';ctx.fillRect(10,21,235,5);ctx.fillStyle=s.elapsed<s.hitUntil?'#fff':'#d3ed8c';ctx.fillRect(10,21,235*s.hp/s.maxHp,5);
 ctx.restore();
}
