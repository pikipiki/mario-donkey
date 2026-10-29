import runtime from'./generated/guardian-runtime.json';
const{bodyBoxes:bodies,effectCues:cues,endOffsets:offsets,timings}=runtime;
import type{YoshiGuardianId}from'./yoshi-guardian-spec';
/** Trimmed native PPU frames, sampled on the original EU 50Hz clock. */
export interface GuardianFrame{x:number;y:number;w:number;h:number;dx:number;dy:number;duration:number}
export interface GuardianClip{frames:GuardianFrame[];duration:number;loop?:boolean;scale?:number;opaque?:boolean;orientation?:{radians:number;dx:number;dy:number}}
export interface GuardianContext extends Omit<GuardianFrame,'duration'>{layer:'behind'|'front';clips:string[]}
export interface GuardianAnimationBank{presentation?:{departureLift?:{start:number;duration:number;dy:number}};context?:GuardianContext[];id:YoshiGuardianId;scale:number;clips:Record<string,GuardianClip>}
export function guardianDamageStage(hp:number,maxHp=6):number{return Math.max(0,Math.min(5,Math.round((1-hp/maxHp)*6)));}
export function guardianAnimationDuration(id:YoshiGuardianId,key:string):number{
 const clips=(timings as Record<string,Record<string,number>>)[id];return clips?.[key]??clips?.[key.startsWith('hurt')?'hurt':'dead']??.8;
}
/** One-shot clips clamp; repeated movement is the only wrapping playback. */
export function guardianFrameAt(clip:GuardianClip,seconds:number):GuardianFrame|undefined{
 if(!clip.frames.length)return;let t=Math.max(0,seconds);if(clip.loop&&clip.duration>0)t%=clip.duration;
 for(const f of clip.frames){if(t<f.duration)return f;t-=f.duration;}
 return clip.frames.at(-1);
}

export function guardianAnimationEnd(id:YoshiGuardianId,key:string):[number,number]{const offset=(offsets as Record<string,Record<string,number[]>>)[id]?.[key];const scale=id==='burt'?.78:id==='bigger-boo'?1:id==='raphael'?1:id==='tap-tap'?1.1:id==='froggy'?2:.78;return offset?[offset[0]*scale,offset[1]*scale]:[0,0];}

export function guardianDefeatCue(id:YoshiGuardianId):number{return(cues as Record<string,number>)[id]??0;}

export function guardianBodyBounds(id:YoshiGuardianId,hp:number,maxHp=6):{dx:number;dy:number;w:number;h:number}|undefined{return(bodies as Record<string,Record<string,{dx:number;dy:number;w:number;h:number}>>)[id]?.[guardianDamageStage(hp,maxHp)];}

/** The donor moon begins below the native actor. Stage it inside the fixed DKC
 * arena, rather than placing the whole lunar sequence underneath its floor. */
export function guardianCinematicAnchor(id:YoshiGuardianId,s:{x:number;y:number;floor:number;arenaLeft?:number;arenaRight?:number}):{x:number;y:number}{return id==='raphael'?{x:s.arenaLeft!==undefined&&s.arenaRight!==undefined?(s.arenaLeft+s.arenaRight)/2+37.5:s.x+37.5,y:s.floor-100}:id==='tap-tap'?{x:s.x,y:s.floor}:{x:s.x,y:s.y};}

export function guardianFrameLift(bank:GuardianAnimationBank,key:string,seconds:number):number{const lift=bank.presentation?.departureLift;return key==='dead'&&lift?lift.dy*Math.max(0,Math.min(1,(seconds-lift.start)/lift.duration)):0;}

/** Land a grounded donor injury on the actual DKC platform after an airborne hit;
 * keep its native deformation/recoil and leave flying bosses on their own path. */
export function guardianSettledY(id:YoshiGuardianId,initial:number,floor:number,age:number):number{return['burt','salvo','milde','tap-tap'].includes(id)?initial+(floor-initial)*Math.max(0,Math.min(1,age/.5)):initial;}
