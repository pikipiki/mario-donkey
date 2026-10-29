import {DKC,readDkcScene,dkcEnemies,killDkcEnemy} from './dkc-profile';
import {word,writeWord} from './profile';
import type{DkcTarget}from'./dkc-combat';
export interface DkcGuardianSave{version:1;level:number;slot:number;id:'burt';phase:'intro'|'fight'|'dying'|'released';hp:number;x:number;y:number;floor:number;elapsed:number;phaseTime:number;hitUntil:number;cameraX:number;cameraY:number;music?:number}
export function validateDkcGuardian(value:unknown):DkcGuardianSave|undefined{
 const s=value as DkcGuardianSave|undefined;
 if(!s||s.version!==1||s.id!=='burt'||!['intro','fight','dying','released'].includes(s.phase)||!Number.isInteger(s.level)||s.level<1||(s.level>0xe5&&s.level!==0xea)||!Number.isInteger(s.slot)||s.slot<6||s.slot>=0x34||s.slot%2||!Number.isInteger(s.hp)||s.hp<0||s.hp>3)return;
 if(s.music!==undefined&&(!Number.isInteger(s.music)||s.music<0||s.music>255))return;
 if(![s.x,s.y,s.floor,s.elapsed,s.phaseTime,s.hitUntil,s.cameraX,s.cameraY].every(Number.isFinite)||s.x<0||s.x>65535||Math.abs(s.y)>65535||s.elapsed<0||s.elapsed>36000||s.phaseTime<0||s.phaseTime>36000)return;
 return{...s};
}
/** Request native damage, never replace death/partner/dismount/progression states. */
export function requestDkcGuardianHit(w:Uint8Array):boolean{
 const s=readDkcScene(w),p=s.playerSlot,state=word(w,DKC.state+p);
 if(!s.playing||state>0x0b||word(w,DKC.hit+p)!==0||word(w,0x16d1+p-2)!==0)return false;
 writeWord(w,DKC.hit+p,1);return true;
}
/** Burt guards the existing map exit; its coordinates and completion remain native. */
export class DkcGuardian{
 state?:DkcGuardianSave;private frame?:number;private lastBounce=0;
 restore(value:unknown):void{this.state=validateDkcGuardian(value);this.pause();}
 pause():void{this.frame=undefined;}
 clear():void{this.state=undefined;this.pause();}
 get active():boolean{return this.state?.phase==='intro'||this.state?.phase==='fight';}
 target():DkcTarget|undefined{const s=this.state;return s?.phase==='fight'?{slot:-1,id:0x146,x:s.x,y:s.y,width:88,height:112}:undefined;}
 hit():boolean{const s=this.state;if(!s||s.phase!=='fight'||s.elapsed<s.hitUntil)return false;s.hp--;s.hitUntil=s.elapsed+.5;if(!s.hp){s.phase='dying';s.phaseTime=0;}return true;}
 update(w:Uint8Array,frame:number,isMapExit:(slot:number)=>boolean):{notice?:string;effect?:'attack'|'land'|'defeat'|'hit'}{
  const scene=readDkcScene(w),previous=this.state;
  if(scene.isMap){this.clear();return{};}
  if(previous&&previous.level!==scene.level)this.clear();
  if(this.state&&this.state.phase!=='released'&&![0x6a,0x6b].includes(word(w,DKC.id+this.state.slot)))this.clear();
  if(!scene.playing){this.pause();return{};}
  const playerState=word(w,DKC.state+scene.playerSlot);
  if(this.state&&[0x1b,0x1d,0x3c,0x3d].includes(playerState)){this.state.phase='released';this.pause();return{};}
  if(!this.state){
   for(let slot=6;slot<0x34;slot+=2){
    const id=word(w,DKC.id+slot),x=word(w,DKC.x+slot),y=word(w,DKC.height)-word(w,DKC.y+slot);
    if((id!==0x6a&&id!==0x6b)||!isMapExit(slot)||word(w,DKC.state+slot)!==0||Math.abs(x-scene.x)>260||Math.abs(y-scene.y)>190||x-scene.cameraX< -32||x-scene.cameraX>288||scene.x-scene.cameraX< -32||scene.x-scene.cameraX>288)continue;
    const floor=y;
    this.state={version:1,level:scene.level,slot,id:'burt',phase:'intro',hp:3,x:scene.cameraX+184,y:floor,floor,elapsed:0,phaseTime:0,hitUntil:0,cameraX:scene.cameraX,cameraY:scene.cameraY};
    this.frame=frame;this.lastBounce=0;
    for(const e of dkcEnemies(w))if(Math.abs(e.x-scene.x)<260&&Math.abs(e.y-scene.y)<180)killDkcEnemy(w,e.slot);
    return{notice:'Burt the Bashful · Aim, then throw · Eggs ∞'};
   }
   this.frame=frame;return{};
  }
  const s=this.state;
  s.cameraX=scene.cameraX;s.x=Math.max(scene.cameraX+48,Math.min(scene.cameraX+208,s.x));
  const dt=this.frame===undefined?0:Math.max(0,Math.min(.06,(frame-this.frame)/60));this.frame=frame;
  if(s.phase==='released')return{};
  // Native damage/cutscenes must finish without an advancing encounter clock.
  if([0x0d,0x0e,0x1b,0x1d,0x3c,0x3d].includes(playerState))return{};
  s.elapsed+=dt;s.phaseTime+=dt;
  if(s.phase==='intro'){if(s.phaseTime<.8)return{};s.phase='fight';s.phaseTime=0;}
  if(s.phase==='dying'){if(s.phaseTime>=.8){s.phase='released';return{notice:'Burt defeated · Take the original stage exit',effect:'defeat'};}return{};}
  const bounce=Math.floor(s.phaseTime/1.65),cycle=s.phaseTime/1.65-bounce;
  s.x=Math.max(s.cameraX+48,Math.min(s.cameraX+208,s.x+Math.sign(scene.x-s.x)*28*dt));
  s.y=s.floor-Math.sin(cycle*Math.PI)*64;
  let effect:'attack'|'land'|undefined;
  if(bounce!==this.lastBounce){this.lastBounce=bounce;effect='land';}
  else if(cycle<.04)effect='attack';
  if(Math.abs(scene.x-s.x)<56&&scene.y>s.y-112&&scene.y-30<s.y)requestDkcGuardianHit(w);
  return{effect};
 }
}
