import{isDkcMinecartStage}from'./dkc-levels';
import{guardianAnimationDuration,guardianDamageStage,guardianAnimationEnd,guardianDefeatCue,guardianBodyBounds,guardianCinematicAnchor}from'./guardian-animation';
import{guardianForEntrance,YOSHI_GUARDIANS,type YoshiGuardianId}from'./yoshi-guardian-spec';
import{advanceYoshiGuardian}from'./yoshi-guardian-motion';
import {hydrateBurtMotion,type BurtMotion}from'./burt-motion';
import {sweptHit}from'./dkc-combat';
import {DKC,readDkcScene,dkcEnemies,killDkcEnemy} from './dkc-profile';
import {word,writeWord} from './profile';
import type{DkcBossVictory}from'./dkc-boss-finish';
import type{DkcTarget}from'./dkc-combat';
export interface DkcGuardianSave extends BurtMotion{version:1;level:number;slot:number;id:YoshiGuardianId;phase:'intro'|'fight'|'dying'|'released';hp:number;maxHp?:number;x:number;y:number;floor:number;elapsed:number;phaseTime:number;hitUntil:number;cameraX:number;cameraY:number;animationX?:number;animationY?:number;animationMirror?:1|-1;defeatFx?:boolean;music?:number;heroHitUntil?:number;exitKind?:'banana'|'krool'}
export function validateDkcGuardian(value:unknown):DkcGuardianSave|undefined{
 const s=value as DkcGuardianSave|undefined;if(s&&isDkcMinecartStage(s.level))return;
 if(!s||s.version!==1||!YOSHI_GUARDIANS.some(spec=>spec.id===s.id)||!['intro','fight','dying','released'].includes(s.phase)||!Number.isInteger(s.level)||s.level<1||(s.level>0xe5&&s.level!==0xea)||!Number.isInteger(s.slot)||s.slot<6||s.slot>=0x34||s.slot%2||!Number.isInteger(s.hp)||s.hp<0||s.hp>6)return;
 if(s.animationMirror!==undefined&&s.animationMirror!==1&&s.animationMirror!==-1)return;
 if(s.defeatFx!==undefined&&typeof s.defeatFx!=='boolean')return;
 if(s.maxHp!==undefined&&s.maxHp!==3&&s.maxHp!==6)return;
 if(s.hp>(s.maxHp??3))return;
 if(s.heroHitUntil!==undefined&&(!Number.isFinite(s.heroHitUntil)||s.heroHitUntil<0||s.heroHitUntil>36003))return;
 if(s.exitKind!==undefined&&!['banana','krool'].includes(s.exitKind))return;
 if(s.music!==undefined&&(!Number.isInteger(s.music)||s.music<0||s.music>255))return;
 if(![s.x,s.y,s.floor,s.elapsed,s.phaseTime,s.hitUntil,s.cameraX,s.cameraY].every(Number.isFinite)||s.x<0||s.x>65535||Math.abs(s.y)>65535||s.elapsed<0||s.elapsed>36000||s.phaseTime<0||s.phaseTime>36000)return;
 if(s.motion!==undefined&&!['windup','jump','land'].includes(s.motion))return;
 for(const v of[s.arenaLeft,s.arenaRight,s.direction,s.vx,s.vy,s.motionTime,s.animationX,s.animationY])if(v!==undefined&&(!Number.isFinite(v)||Math.abs(v)>65535))return;
 const copy={...s},spec=guardianForEntrance(copy.level);
 // Rebind old region-based encounters without healing the boss or replaying a
 // completed victory. An already-running death cinematic keeps its own bank.
 if(spec&&copy.id!==spec.id&&(copy.phase==='intro'||copy.phase==='fight')){copy.id=spec.id;copy.y=copy.floor-(spec.id==='bigger-boo'?90:0);copy.hitUntil=copy.elapsed;copy.animationX=copy.animationY=undefined;copy.animationMirror=undefined;copy.vx=copy.vy=0;copy.motion='windup';copy.motionTime=0;}
 hydrateBurtMotion(copy);return copy;
}
/** Request native damage, never replace death/partner/dismount/progression states. */
export function requestDkcGuardianHit(w:Uint8Array):boolean{
 const s=readDkcScene(w),p=s.playerSlot,state=word(w,DKC.state+p);
 if(!s.playing||state>0x08||word(w,DKC.hit+p)!==0||word(w,0x16d1+p-2)!==0)return false;
 writeWord(w,DKC.hit+p,1);return true;
}
/** Burt guards the existing map exit; its coordinates and completion remain native. */
export class DkcGuardian{
 state?:DkcGuardianSave;private frame?:number;private previousHero?:{x:number;y:number};private barrels=new Map<number,{id:number;x:number;y:number;used:boolean}>();
 restore(value:unknown):void{this.state=validateDkcGuardian(value);this.pause();}
 pause():void{this.frame=undefined;this.previousHero=undefined;this.barrels.clear();}
 clear():void{this.state=undefined;this.pause();}
 get active():boolean{return this.state?.phase==='intro'||this.state?.phase==='fight';}
 target():DkcTarget|undefined{
  const s=this.state;if(s?.phase!=='fight')return;const body=guardianBodyBounds(s.id,s.hp,s.maxHp??3),spec=YOSHI_GUARDIANS.find(p=>p.id===s.id)!;
  return body?{slot:-1,id:0x146,x:s.x+body.dx+body.w/2,y:s.y+body.dy+body.h*.95,width:body.w*.9,height:body.h*.9}:{slot:-1,id:0x146,x:s.x,y:s.y,width:spec.width,height:spec.height};
 }
 hit(originX?:number):boolean{
  const s=this.state;if(!s||s.phase!=='fight'||s.elapsed<s.hitUntil)return false;
  s.hp--;s.animationX=s.x;s.animationY=s.y;
  const key=s.hp?'hurt-'+guardianDamageStage(s.hp,s.maxHp??3):'dead';
  s.hitUntil=s.elapsed+guardianAnimationDuration(s.id,key);
  const [nativeRecoil]=guardianAnimationEnd(s.id,key),away=originX===undefined?-(s.direction??-1):Math.sign(s.x-originX)||1;s.animationMirror=s.id==='burt'&&s.hp&&nativeRecoil?((away*Math.sign(nativeRecoil))as 1|-1):1;
  hydrateBurtMotion(s);s.motion='windup';s.motionTime=0;s.vx=s.vy=0;
  if(!s.hp){const anchor=guardianCinematicAnchor(s.id,s);s.animationX=anchor.x;s.animationY=anchor.y;s.phase='dying';s.phaseTime=0;}return true;
 }
 update(w:Uint8Array,frame:number,isMapExit:(slot:number)=>boolean,victory?:DkcBossVictory,attack:{rolling?:boolean;visualReady?:boolean}={}):{notice?:string;effect?:'attack'|'land'|'defeat'|'hit'}{
  const scene=readDkcScene(w),previous=this.state;
  if(scene.isMap||isDkcMinecartStage(scene.level)){this.clear();return{};}
  if(previous&&previous.level!==scene.level)this.clear();
  if(this.state&&this.state.phase!=='released'){const saved=this.state;if(saved.exitKind?(word(w,DKC.id+saved.slot)!==0x74):![0x6a,0x6b].includes(word(w,DKC.id+saved.slot)))this.clear();}
  if(!scene.playing){this.pause();return{};}
  const playerState=word(w,DKC.state+scene.playerSlot),spec=this.state?YOSHI_GUARDIANS.find(p=>p.id===this.state!.id):guardianForEntrance(scene.level);
  if(!spec){this.pause();return{};}
  if(this.state&&this.state.phase!=='released'&&((playerState>=0x1b&&playerState<=0x20)||[0x3c,0x3d].includes(playerState))){this.pause();return{notice:'Saved exit interrupted · The boss is still alive. Options → World map restores the last map checkpoint.'};}
  if(!this.state&&victory&&scene.grounded){
   const floor=scene.y;
   this.state={version:1,level:scene.level,slot:victory.slot,exitKind:victory.kind,id:spec.id,phase:'intro',hp:6,maxHp:6,x:scene.cameraX+184,y:spec.id==='bigger-boo'?floor-90:floor,floor,elapsed:0,phaseTime:0,hitUntil:0,cameraX:scene.cameraX,cameraY:scene.cameraY,arenaLeft:scene.cameraX+40,arenaRight:scene.cameraX+216,direction:-1,vx:0,vy:0,motion:'windup',motionTime:0};
   this.frame=frame;this.previousHero=undefined;
   return{notice:`DKC boss defeated · ${spec.name} · Eggs ∞`};
  }
  if(!this.state){
   // Boss arenas must finish their original fight before any crossover.
   if(scene.level===0x68||(scene.level>=0xe0&&scene.level<=0xe5)){this.frame=frame;return{};}
   for(let slot=6;slot<0x34;slot+=2){
    const id=word(w,DKC.id+slot),x=word(w,DKC.x+slot),y=word(w,DKC.height)-word(w,DKC.y+slot);
    if((id!==0x6a&&id!==0x6b)||!isMapExit(slot)||word(w,DKC.state+slot)!==0||Math.abs(x-scene.x)>260||Math.abs(y-scene.y)>190||x-scene.cameraX< -32||x-scene.cameraX>288||scene.x-scene.cameraX< -32||scene.x-scene.cameraX>288)continue;
    const floor=scene.grounded&&Math.abs(scene.y-y)<32?scene.y:y+16;
    this.state={version:1,level:scene.level,slot,id:spec.id,phase:'intro',hp:6,maxHp:6,x:Math.max(24,x-96),y:spec.id==='bigger-boo'?floor-90:floor,floor,elapsed:0,phaseTime:0,hitUntil:0,cameraX:scene.cameraX,cameraY:scene.cameraY,arenaLeft:Math.max(24,x-240),arenaRight:Math.max(96,x-48),direction:-1,vx:0,vy:0,motion:'windup',motionTime:0};
    this.frame=frame;this.previousHero=undefined;
    for(const e of dkcEnemies(w))if(Math.abs(e.x-scene.x)<260&&Math.abs(e.y-scene.y)<180)killDkcEnemy(w,e.slot);
    return{notice:`${spec.name} · Aim, then throw · Eggs ∞`};
   }
   this.frame=frame;return{};
  }
  const s=this.state;
  s.cameraX=scene.cameraX;s.cameraY=scene.cameraY;hydrateBurtMotion(s);
  // Legacy door guards used the door origin16px above its actual platform.
  // Calibrate only that old origin against a nearby grounded hero, once.
  if(!s.exitKind&&s.floor===word(w,DKC.height)-word(w,DKC.y+s.slot)&&scene.grounded&&Math.abs(scene.y-s.floor)<32&&Math.abs(scene.x-s.x)<96){const delta=scene.y-s.floor;s.floor=scene.y;if(s.phase==='intro'||s.motion!=='jump')s.y+=delta;}
  const dt=this.frame===undefined?0:Math.max(0,Math.min(.06,(frame-this.frame)/60));this.frame=frame;
  if(s.phase==='released')return{};
  // Native damage/cutscenes must finish without an advancing encounter clock.
  if([0x09,0x0a,0x0b,0x0d,0x0e,0x11,0x1b,0x1d,0x3c,0x3d].includes(playerState))return{};
  // Keep the full cinematic when a lazy animation bank is still downloading.
  // Native DKC continues; only the crossover actor clock waits.
  if(attack.visualReady===false)return{};
  s.elapsed+=dt;s.phaseTime+=dt;
  if(s.phase==='intro'){if(s.phaseTime<.8)return{};s.phase='fight';s.phaseTime=0;}
  if(s.phase==='dying'){const effect=!s.defeatFx&&s.phaseTime>=guardianDefeatCue(s.id)?'defeat':undefined;if(effect)s.defeatFx=true;if(s.phaseTime>=guardianAnimationDuration(s.id,'dead')){s.phase='released';return{notice:s.exitKind==='banana'?`${spec.name} defeated · Collect the giant banana`:s.exitKind==='krool'?`${spec.name} defeated · Adventure complete`:`${spec.name} defeated · Take the original stage exit`,effect};}return{effect};}
  // Native injury sequences include recoil, trousers deformation and recovery;
  // don't run the unrelated hop controller underneath a recorded injury.
  if(s.elapsed<s.hitUntil)return{};
  if(s.animationX!==undefined){const [dx]=guardianAnimationEnd(s.id,`hurt-${guardianDamageStage(s.hp,s.maxHp??3)}`);s.x=Math.max(s.arenaLeft!,Math.min(s.arenaRight!,s.animationX+dx*(s.animationMirror??1)));}
  s.animationX=s.animationY=undefined;s.animationMirror=undefined;
  const effect=advanceYoshiGuardian(s,dt,scene.x,scene.facing);
  const target=this.target()!,playerX=scene.x,playerY=scene.y,top=target.y-target.height,prior=this.previousHero;
  this.previousHero={x:playerX,y:playerY};
  const nativeState=word(w,DKC.state+scene.playerSlot),canAttack=nativeState<=0x08&&word(w,DKC.hit+scene.playerSlot)===0;
  const overlap=Math.abs(playerX-target.x)<target.width/2+14&&playerY>target.y-target.height&&playerY-30<target.y;
  const stomp=canAttack&&prior&&!scene.grounded&&scene.vy>0&&Math.abs(playerX-target.x)<target.width/2+12&&prior.y<=top+12&&playerY>=top-8&&playerY<=top+24;
  if((stomp||canAttack&&attack.rolling&&overlap)&&this.hit(playerX)){
   if(stomp)writeWord(w,DKC.vy+scene.playerSlot,0x500); // Native upward recoil; no state/progression rewrite.
   return{effect:'hit',notice:stomp?`${spec.name} hit · Jump`:`${spec.name} hit · Roll`};
  }
  const live=new Set<number>();
  for(let slot=6;slot<0x34;slot+=2){
   const id=word(w,DKC.id+slot);if(![0x23,0x27].includes(id)||word(w,DKC.state+slot)!==2)continue;
   live.add(slot);const x=word(w,DKC.x+slot),y=word(w,DKC.height)-word(w,DKC.y+slot),old=this.barrels.get(slot);
   const record=old&&old.id===id?old:{id,x,y,used:false};
   if(!record.used&&sweptHit(record.x,record.y,x,y,target)&&this.hit(x)){
    record.used=true;writeWord(w,DKC.hit+slot,0x20); // BFCD16→CD29 native thrown-barrel cleanup.
    record.x=x;record.y=y;this.barrels.set(slot,record);return{effect:'hit',notice:`${spec.name} hit · Barrel`};
   }
   record.x=x;record.y=y;this.barrels.set(slot,record);
  }
  for(const slot of this.barrels.keys())if(!live.has(slot))this.barrels.delete(slot);
  if(overlap&&s.elapsed>=(s.heroHitUntil??0)&&requestDkcGuardianHit(w)){s.heroHitUntil=s.elapsed+3;return{effect,notice:`${spec.name} · Hero hit · Move away!`};}
  return{effect};
 }
}
