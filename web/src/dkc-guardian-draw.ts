import type{SpriteAtlas}from'./atlas';
import type{DkcGuardianSave}from'./dkc-guardian';
export function drawDkcEgg(c:CanvasRenderingContext2D,x:number,y:number):void{
 x=Math.round(x);y=Math.round(y);c.fillStyle='#25432a';c.beginPath();c.ellipse(x,y,5,7,0,0,Math.PI*2);c.fill();c.fillStyle='#fffbe3';c.beginPath();c.ellipse(x,y,4,6,0,0,Math.PI*2);c.fill();c.fillStyle='#63a74c';c.fillRect(x-3,y-2,3,3);c.fillRect(x,y+2,3,3);
}
export function drawDkcGuardian(c:CanvasRenderingContext2D,atlas:SpriteAtlas,s:DkcGuardianSave|undefined,cameraX:number,cameraY:number,pad:number):void{
 if(!s||s.phase==='released')return;
 c.save();c.globalAlpha=s.phase==='dying'?Math.max(0,1-s.phaseTime/.8):1;
 atlas.drawYoshiBoss(c,s.phase==='dying'?'dead':s.elapsed<s.hitUntil?'hurt':s.phase==='intro'?'idle':'attack',s.x-cameraX,s.y-cameraY+pad,s.elapsed*1000);
 const age=s.phase==='dying'?s.phaseTime:s.elapsed-(s.hitUntil-.5);
 if(age>=0&&age<.5){for(let i=0;i<10;i++){const a=i*Math.PI/5;c.fillStyle=i%2?'#fff2b2':'#f3b949';c.fillRect(Math.round(s.x-cameraX+Math.cos(a)*(8+age*55)),Math.round(s.y-cameraY+pad-55+Math.sin(a)*(8+age*55)),3,3);}}
 c.globalAlpha=1;c.fillStyle='#101d25ed';c.fillRect(5,pad+5,246,26);c.fillStyle='#fff5d6';c.font='bold 9px sans-serif';c.textAlign='left';c.fillText('Burt the Bashful',10,pad+16);c.textAlign='right';c.fillText('EGGS ∞',245,pad+16);c.fillStyle='#4c4b4b';c.fillRect(10,pad+21,235,5);c.fillStyle=s.elapsed<s.hitUntil?'#fff':'#d3ed8c';c.fillRect(10,pad+21,235*s.hp/3,5);c.restore();
}
