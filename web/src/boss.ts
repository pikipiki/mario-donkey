import {PROFILE as P,ROLL_TARGETS,freeSpriteGraphics,babyIsLost,canModifyJump,inGoal,signed16,word,writeWord} from './profile';
import type {BossExitKind} from './boss-rom';
export const STAGE_BOSSES=[
 {id:'gnawty',name:'Very Gnawty',width:58,height:52},
 {id:'necky',name:'Master Necky',width:68,height:66},
 {id:'queen-b',name:'Queen B.',width:62,height:54},
 {id:'really-gnawty',name:'Really Gnawty',width:58,height:52},
 {id:'dumb-drum',name:'Dumb Drum',width:58,height:86},
 {id:'necky-snr',name:'Master Necky Snr.',width:68,height:66},
 {id:'k-rool',name:'King K. Rool',width:76,height:92},
] as const;
export type BossId=typeof STAGE_BOSSES[number]['id'];
export type BossPhase='intro'|'fight'|'dying'|'exit'|'released';
export interface Shot{x:number;y:number;vx:number;vy:number;age:number;kind:'egg'|'nut'|'crown'|'shock'}
export interface GuardianSave {version:1;stage:number;room:string;id:BossId;kind:BossExitKind;slot:number;phase:BossPhase;hp:number;maxHp:number;x:number;y:number;floor:number;elapsed:number;phaseTime:number;nextAttack:number;hitUntil:number;facing:number;ring?:{x:number;y:number};nativeGoal?:{x:number;y:number};shots:Shot[]}
export function bossForStage(stage:number){return STAGE_BOSSES[Math.max(0,stage)%STAGE_BOSSES.length];}
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
/** Reject malformed encounter metadata without invalidating an older campaign. */
export function validateGuardian(value:unknown):GuardianSave|undefined{
 if(!value||typeof value!=='object')return;
 const s=value as GuardianSave;
 if(s.version!==1||!Number.isInteger(s.stage)||s.stage<0||s.stage>=72||s.stage%12>8||typeof s.room!=='string'||s.room.length>100||!STAGE_BOSSES.some(b=>b.id===s.id)||!['goal','key','mini','final'].includes(s.kind)||!['intro','fight','dying','exit','released'].includes(s.phase))return;
 if(!Number.isInteger(s.slot)||s.slot<6||s.slot>=24||!Number.isInteger(s.hp)||!Number.isInteger(s.maxHp)||s.maxHp<1||s.maxHp>12||s.hp<0||s.hp>s.maxHp)return;
 if(![s.x,s.y,s.floor,s.elapsed,s.phaseTime,s.nextAttack,s.hitUntil,s.facing].every(finite)||s.x<0||s.x>4096||s.y<0||s.y>2304||s.floor<0||s.floor>2304||s.elapsed<0||s.elapsed>36000||s.phaseTime<0||s.phaseTime>36000)return;
 if(s.nativeGoal&&(!finite(s.nativeGoal.x)||!finite(s.nativeGoal.y)||s.nativeGoal.x<0||s.nativeGoal.x>4096||s.nativeGoal.y<0||s.nativeGoal.y>2304))return;
 if(s.ring&&(!finite(s.ring.x)||!finite(s.ring.y)||s.ring.x<0||s.ring.x>4096||s.ring.y<0||s.ring.y>2304))return;
 if(!Array.isArray(s.shots)||s.shots.length>24||s.shots.some(p=>!p||!['egg','nut','crown','shock'].includes(p.kind)||![p.x,p.y,p.vx,p.vy,p.age].every(finite)||p.age<0||p.age>8||Math.abs(p.vx)>1000||Math.abs(p.vy)>1000))return;
 return structuredClone(s);
}
function activeSlot(g:Uint8Array,id:number):number|undefined{
 for(let slot=6;slot<24;slot++)if(word(g,P.spriteState+slot*4)===0x10&&word(g,P.spriteId+slot*4)===id)return slot;
}
function segmentHits(x0:number,y0:number,x1:number,y1:number,left:number,top:number,right:number,bottom:number):boolean{
 let lo=0,hi=1;
 for(const [p,d,min,max]of [[x0,x1-x0,left,right],[y0,y1-y0,top,bottom]]){
  if(Math.abs(d)<1e-9){if(p<min||p>max)return false;continue;}
  const a=(min-p)/d,b=(max-p)/d;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return false;
 }
 return true;
}
export class StageBosses {
 state?:GuardianSave;damageEvents=0;
 private previousMode=0;private frame?:number;private eggDown=false;private hurtFrame=-Infinity;private lastLives?:number;
 restore(value:unknown):void{this.state=validateGuardian(value);this.frame=undefined;this.eggDown=false;this.lastLives=undefined;this.hurtFrame=-Infinity;}
 clear():void{this.state=undefined;this.hurtFrame=-Infinity;this.lastLives=undefined;this.pause();}
 pause():void{this.frame=undefined;this.eggDown=false;}
 get eggsUnlimited():boolean{return this.state?.phase==='intro'||this.state?.phase==='fight';}
 get nativeHitPending():boolean{return this.frame!==undefined&&this.frame-this.hurtFrame<2;}
 update(w:Uint8Array,g:Uint8Array,nativeFrame:number,eggPressed:boolean,facing:number,videoHeight=224):{sound?:'hit'|'victory'|'throw'|'hurt';notice?:string}{
  const mode=w[P.mode],stage=w[P.stage],room=`${w[0x218]}:${stage}:${word(w,0x32).toString(16)}:${w[0x34]}`;
  const oldMode=this.previousMode;this.previousMode=mode;
  if(mode!==P.gameplay){
   // The native ceremony already owns completion. Never freeze a legacy save
   // that was made after crossing its goal, or bypass normal native scoring.
   if(mode===P.victory&&this.state)this.state.phase='released';
   else if(mode===0x26||mode===0x15||mode===0x16)this.clear();
   this.pause();return{};
  }
  if(stage%12>8)return{};
  // Some native endings set the player goal state before changing game mode.
  if(this.state&&inGoal(g)){this.state.phase='released';this.pause();return{};}
  // Older versions consumed a crossing before the ROM had accepted it.
  if(this.state?.kind==='goal'&&this.state.phase==='released')this.state.phase='exit';
  if(this.state&&(oldMode===0x26||this.state.phase!=='released'&&(this.state.stage!==stage||this.state.room!==room||this.lastLives!==undefined&&w[0x379]<this.lastLives)))this.clear();
  if(this.state&&this.state.phase!=='released'){
   const expected=this.state.kind==='goal'?0x0d:this.state.kind==='key'?0x14:this.state.kind==='mini'?0x13:0x134;
   if(word(g,P.spriteId+this.state.slot*4)!==expected||word(g,P.spriteState+this.state.slot*4)!==0x10)this.clear();
  }
  this.lastLives=w[0x379];
  let notice:string|undefined,sound:'hit'|'victory'|'throw'|'hurt'|undefined;
  const playerX=word(g,P.x),playerY=word(g,P.y),cx=word(w,P.cameraX),cy=word(w,P.cameraY);
  if(!this.state){
   const goal=activeSlot(g,0x0d),key=activeSlot(g,0x14),final=stage===67?activeSlot(g,0x134):undefined;
   const explosion=activeSlot(g,0x13),mini=explosion!==undefined&&word(g,0x1900+explosion*4)===0?explosion:undefined;
   const finalReady=final!==undefined&&g[0x19d6+final*4]===0x20;
   const kind:BossExitKind|undefined=goal!==undefined?'goal':key!==undefined?'key':mini!==undefined?'mini':finalReady?'final':undefined;
   const slot=kind==='goal'?goal:kind==='key'?key:kind==='mini'?mini:final;
   if(kind&&slot!==undefined){
    const near=kind!=='goal'||Math.abs(signed16(word(g,P.spriteX+slot*4)-playerX))<270&&Math.abs(signed16(word(g,P.spriteY+slot*4)-playerY))<200;
    if(near&&!babyIsLost(g)&&word(g,0xae)===0){
     const spec=bossForStage(stage),floor=kind==='goal'?word(g,P.spriteY+slot*4)+16:playerY+32;
     const maxHp=3+Math.floor(stage/12);
     const spawnX=playerX-cx<128?playerX-cx+100:playerX-cx-100;
     this.state={version:1,stage,room,id:spec.id,kind,slot,phase:'intro',hp:maxHp,maxHp,x:cx+clamp(spawnX,48,208),y:clamp(floor,cy+90,cy+videoHeight-8),floor:clamp(floor,cy+90,cy+videoHeight-8),elapsed:0,phaseTime:0,nextAttack:1.8,hitUntil:0,facing:-1,shots:[]};
     if(kind==='goal')this.state.nativeGoal={x:word(g,P.spriteX+slot*4),y:word(g,P.spriteY+slot*4)};
     if(kind!=='goal'){
      // This is the held post-boss key / Bowser exit, after the original fight.
      // Its init has not run, so restore control only for the extra encounter.
      if([0,0x1a,...(kind==='mini'?[2]:[])].includes(word(g,0xac))){writeWord(g,0xac,0);writeWord(g,0x1ae,0);writeWord(g,0x1b0,0);}
      if(kind==='final')w[0x200]=15;
     }
     // Standard end-of-level foes must not interrupt the added boss fight.
     // Use only verified ordinary-enemy IDs; goals, keys and native bosses stay.
     for(let i=6;i<24;i++){
      const o=i*4,id=word(g,P.spriteId+o),sx=signed16(word(g,P.spriteX+o)-cx),sy=signed16(word(g,P.spriteY+o)-cy);
      if(word(g,P.spriteState+o)===0x10&&ROLL_TARGETS.has(id)&&sx>=-32&&sx<288&&sy>=-32&&sy<videoHeight+32)freeSpriteGraphics(g,i);
     }
     notice=`${spec.name} · Defeat the guardian · Eggs ∞`;
    }
   }
  }
  const s=this.state;
  if(!s){this.frame=nativeFrame;this.eggDown=eggPressed;return{};}
  const dt=this.frame===undefined?0:clamp((nativeFrame-this.frame)/50,0,.06);this.frame=nativeFrame;
  const freshEgg=eggPressed&&!this.eggDown;this.eggDown=eggPressed;
  const spec=STAGE_BOSSES.find(b=>b.id===s.id)!;
  if(s.phase==='released')return{};
  if(s.phase==='exit'){
   if(s.kind==='goal'){
    // Preserve the native receiver's ground and landing area. Camera-following
    // coordinates can leave the end-of-stage Baby Mario handoff waiting forever.
    s.nativeGoal??={x:word(g,P.spriteX+s.slot*4),y:word(g,P.spriteY+s.slot*4)};
    s.ring={x:s.nativeGoal.x+24,y:s.nativeGoal.y-64};
   }else if(!s.ring||s.ring.x<cx+44||s.ring.x>cx+212||s.ring.y<cy+56||s.ring.y>cy+videoHeight-56)s.ring=this.exitPoint(playerX,playerY,cx,cy,videoHeight);
   if(s.kind==='goal'){
    writeWord(g,P.spriteX+s.slot*4,s.ring.x-24);writeWord(g,P.spriteY+s.slot*4,s.ring.y+64);
   }
   const touching=s.kind==='goal'?playerX>=s.ring.x&&playerX-s.ring.x<24&&playerY-s.ring.y>=-48&&playerY-s.ring.y<32:Math.abs(playerX+12-s.ring.x)<30&&Math.abs(playerY+16-s.ring.y)<52;
   if(touching&&!babyIsLost(g)&&canModifyJump(g)){
    if(s.kind==='goal'){
     // Let the original sign-crossing handler perform the real victory.
     writeWord(g,0x19d6+s.slot*4,0xffff);
     // A ROM frame can still reject this overlap. Retry until its real goal
     // state / victory mode acknowledges the handoff.
     return{};
    }else if(s.kind==='mini'){writeWord(g,0xac,2);writeWord(g,0x1ae,1);}
    else if(s.kind==='key')writeWord(g,P.spriteState+s.slot*4,2); // original init, then native castle ceremony
    s.phase='released';s.shots=[];notice='Guardian defeated · Stage complete';
   }
   return{notice};
  }
  if(babyIsLost(g)||!canModifyJump(g)||w[0xd11]){s.shots=[];return{notice};}
  s.elapsed+=dt;s.phaseTime+=dt;
  if(s.phase==='intro'){if(s.phaseTime>=.8){s.phase='fight';s.phaseTime=0;}else return{notice};}
  if(s.phase==='dying'){
   s.shots=[];
   if(s.phaseTime>=.8){s.phase='exit';s.phaseTime=0;s.ring=s.kind==='goal'&&s.nativeGoal?{x:s.nativeGoal.x+24,y:s.nativeGoal.y-64}:this.exitPoint(playerX,playerY,cx,cy,videoHeight);notice='Guardian defeated · Go through the exit ring';sound='victory';}
   return{notice,sound};
  }
  if(s.phase==='fight'&&freshEgg&&s.shots.filter(p=>p.kind==='egg').length<8){
   const x=playerX+12+Math.sign(s.x-playerX||facing)*14,y=playerY+12;
   const dx=s.x-x,dy=s.y-spec.height*.55-y,length=Math.hypot(dx,dy)||1;
   s.shots.push({x,y,vx:dx/length*310,vy:dy/length*310,age:0,kind:'egg'});sound='throw';
  }
  const left=cx+spec.width/2+8,right=cx+256-spec.width/2-8;
  s.floor=clamp(s.floor,cy+90,cy+videoHeight-8);
  s.facing=s.x>playerX?-1:1;
  const t=s.elapsed;
  switch(s.id){
   case 'gnawty':case 'really-gnawty':{
    const fast=s.id==='really-gnawty';s.x=clamp(s.x+s.facing*(fast?48:32)*dt,left,right);s.y=s.floor-Math.abs(Math.sin(t*(fast?4.5:3)))*(fast?55:33);break;
   }
   case 'necky':case 'necky-snr':s.x=clamp(cx+175+Math.sin(t*1.3)*35,left,right);s.y=cy+104+Math.sin(t*2.1)*24;break;
   case 'queen-b':s.x=clamp(cx+145+Math.cos(t*1.8)*55,left,right);s.y=cy+110+Math.sin(t*2.4)*35;break;
   case 'dumb-drum':s.x=clamp(cx+150+Math.sin(t*.9)*45,left,right);s.y=s.floor-(Math.sin(t*2.4)>.4?62:8);break;
   case 'k-rool':s.x=clamp(s.x+s.facing*(Math.sin(t*2)>0?65:15)*dt,left,right);s.y=s.floor-Math.max(0,Math.sin(t*2))*52;break;
  }
  s.y=clamp(s.y,cy+spec.height+36,cy+videoHeight-8);
  if(s.phase==='fight'&&t>=s.nextAttack){
   const flying=['necky','necky-snr','queen-b'].includes(s.id),kind:Shot['kind']=s.id==='k-rool'?'crown':flying?'nut':'shock';
   const x=s.x,y=s.y-spec.height*.45,dx=playerX+12-x,dy=playerY+15-y,length=Math.hypot(dx,dy)||1;
   const speed=s.id==='necky-snr'?125:95;
   s.shots.push({x,y,vx:dx/length*speed,vy:dy/length*speed,age:0,kind});
   if(s.id==='necky-snr')s.shots.push({x,y:y-18,vx:dx/length*speed,vy:dy/length*speed+12,age:0,kind});
   s.nextAttack=t+(['gnawty','really-gnawty'].includes(s.id)?2.6:s.id==='necky-snr'?1.5:2.1);
  }
  const remaining:Shot[]=[];let playerHit=false;
  for(const shot of s.shots){
   const ox=shot.x,oy=shot.y;shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.age+=dt;
   if(shot.age>4||shot.x<cx-32||shot.x>cx+288||shot.y<cy-32||shot.y>cy+videoHeight+32)continue;
   if(shot.kind==='egg'&&s.phase==='fight'&&segmentHits(ox,oy,shot.x,shot.y,s.x-spec.width/2-4,s.y-spec.height-4,s.x+spec.width/2+4,s.y+4)){
    if(t>=s.hitUntil){s.hp--;s.hitUntil=t+.3;sound='hit';if(s.hp===0){s.phase='dying';s.phaseTime=0;s.shots=[];notice=`${spec.name} defeated`;}}
    continue;
   }
   if(shot.kind!=='egg'&&segmentHits(ox,oy,shot.x,shot.y,playerX-3,playerY-2,playerX+27,playerY+33)){playerHit=true;continue;}
   remaining.push(shot);
  }
  if(s.phase==='fight')s.shots=remaining.slice(-20);else s.shots=[];
  if(s.phase==='fight'&&Math.abs(playerX+12-s.x)<spec.width/2+9&&playerY+28>s.y-spec.height&&playerY<s.y)playerHit=true;
  if(s.phase==='fight'&&playerHit&&word(g,P.invincible)===0){
   // The native Baby Mario routine watches the $9f damage frame after $a0
   // invincibility is decremented. Keep its own bubble/timer/recovery code.
   writeWord(g,P.invincible,0xa0);writeWord(g,0xc0,8);writeWord(g,P.vy,0xfc00);writeWord(g,P.vx,s.x<playerX?0x200:0xfe00);this.hurtFrame=nativeFrame;this.damageEvents++;sound='hurt';
  }
  return{notice,sound};
 }
 private exitPoint(x:number,y:number,cx:number,cy:number,height:number){return{x:cx+clamp(x-cx+76,52,208),y:cy+clamp(y-cy-48,56,height-80)};}
}
