import { DKC, readDkcScene, type DkcEnemy } from './dkc-profile';

const word=(w:Uint8Array,p:number)=>w[p]|w[p+1]<<8;
const put=(w:Uint8Array,p:number,n:number)=>{w[p]=n&255;w[p+1]=n>>>8;};
export type DkcNativeBossAttack='egg'|'roll'|'stomp'|'barrel';
export interface DkcNativeBossTarget extends DkcEnemy { nativeBoss:true }
/** Native vulnerability windows stay intact. Dumb Drum (state7) has no native HP handler; its optional direct-hit health
 * is managed separately by DkcDrumEncounter while native waves continue. */
export function dkcNativeBossTargets(w:Uint8Array):DkcNativeBossTarget[]{
 const scene=readDkcScene(w);
 if(!scene.playing||!([0xe0,0xe1,0xe2,0xe3,0xe4,0xe5,0x68].includes(scene.level)))return[];
 const result:DkcNativeBossTarget[]=[];
 for(let slot=6;slot<0x34;slot+=2){
  if(word(w,DKC.id+slot)!==0x70||word(w,DKC.hit+slot)||!word(w,0x11a1+slot))continue;
  const state=word(w,DKC.state+slot),sub=word(w,0x152d+slot);
  const gnawty=(state===5||state===6)&&word(w,0xebd+slot)===0;
  const queen=state===8&&(sub===1||sub===2);
  const necky=state===9&&sub!==9&&!(word(w,0x109d+slot)&4);
  const krool=state===11&&sub===4;
  if(!gnawty&&!queen&&!necky&&!krool)continue;
  result.push({nativeBoss:true,slot,id:0x70,x:word(w,DKC.x+slot),y:word(w,DKC.height)-word(w,DKC.y+slot),width:state===9?48:56,height:state===9?44:56});
 }
 return result;
}
/** Submit a collision request to the original actor routine. It owns native
 * hurt animations, HP/phase changes, sounds and final victory. No death, HP,
 * unlock or player position is written. Hooks must be installed for Gnawty. */
export function hitDkcNativeBoss(w:Uint8Array,target:Pick<DkcEnemy,'slot'>,kind:DkcNativeBossAttack):boolean{
 if(!['egg','roll','stomp','barrel'].includes(kind)||!dkcNativeBossTargets(w).some(t=>t.slot===target.slot))return false;
 const state=word(w,DKC.state+target.slot);
 // $8000 is consumed only by our verified local Gnawty height guard. Native
 // AND #7 still sees its original stomp kind; ordinary requests are unchanged.
 // Queen B derives recoil direction from the collision source actor. A web
 // projectile has no SNES slot, so use the verified current hero slot.
 put(w,0x15c9+target.slot,readDkcScene(w).playerSlot);
 put(w,DKC.hit+target.slot,state===5||state===6?0x8001:0x20);
 return true;
}
const HEIGHT=0x36dbd4,SPACE=0x3bfc00,DRUM_COMPARE=0x36dd7e,DRUM_FLAG=0x3bfc3e,DRUM_SPACE=0x3bfc40;
const DRUM_ORIGINAL=[0xbd,0xf9,0x14,0xc9,5,0];
/** Evaluated only after the native final spawned wave has been cleared.
 * Preserve native wave counter and every actor register; a private ROM slot
 * request only sets carry for the original BCS into the native death script. */
export const DKC_DRUM_FINISH_GUARD=new Uint8Array([0xbd,0xf9,0x14,0x48,0xaf,0x3e,0xfc,0xfb,0xc5,0x82,0xd0,3,0x68,0x38,0x6b,0x68,0xc9,5,0,0x6b]);
const ORIGINAL=[0xb9,0xc1,0x0b,0xc9,0x3f,0x01];
/** 65816 A/X/Y are already 16-bit at this original comparison. BIT only tests
 * our collision token; both exits reproduce the original CMP carry/zero/sign.
 * X/Y/DB/DP/stack are untouched. No main-loop trampoline or shared WRAM flags. */
export const DKC_GNAWTY_HEIGHT_GUARD=new Uint8Array([
 0xbd,0x95,0x15,0x89,0x00,0x80,0xf0,0x07,
 0xa9,0x3f,0x01,0xc9,0x3f,0x01,0x6b,
 0xb9,0xc1,0x0b,0xc9,0x3f,0x01,0x6b,
]);
const PATCH=[0x22,0x00,0xfc,0xfb,0xea,0xea];
const match=(h:Uint8Array,p:number,b:readonly number[])=>p>=0&&p+b.length<=h.length&&b.every((v,i)=>h[p+i]===v);
export function locateDkcNativeBossRomBases(heap:Uint8Array):number[]{
 const bases:number[]=[];
 for(let p=heap.indexOf(0xb9);p>=0;p=heap.indexOf(0xb9,p+1)){
  if(!match(heap,p,ORIGINAL))continue;
  const base=p-HEIGHT;
  if(base<0||base+0x400000>heap.length)continue;
  if(!match(heap,base+0x3f837c,[0x5c,0x57,0xd9,0xb6])||!match(heap,p+6,[0x90,0xee,0xa9,7,0,0x9d,0x9d,0x10]))continue;
  if(!heap.subarray(base+SPACE,base+SPACE+DKC_GNAWTY_HEIGHT_GUARD.length).every(v=>v===0)||!match(heap,base+DRUM_COMPARE,[...DRUM_ORIGINAL,0xb0,0x3b,0xfe,0xf9,0x14])||!heap.subarray(base+DRUM_FLAG,base+DRUM_SPACE+DKC_DRUM_FINISH_GUARD.length).every(v=>v===0))continue;
  bases.push(base);
 }
 return bases;
}
export class DkcNativeBossHitHooks{
 readonly bases:number[];
 constructor(private heap:Uint8Array){
  this.bases=locateDkcNativeBossRomBases(heap);
  if(!this.bases.length||this.bases.length>8)throw Error('The DKC native boss collision routine is incompatible.');
  for(const base of this.bases){heap.set(DKC_GNAWTY_HEIGHT_GUARD,base+SPACE);heap.set(PATCH,base+HEIGHT);heap.set(DKC_DRUM_FINISH_GUARD,base+DRUM_SPACE);heap.set([0x22,0x40,0xfc,0xfb,0xea,0xea],base+DRUM_COMPARE);put(heap,base+DRUM_FLAG,0xffff);}
 }
 requestDrumDefeat(slot:number|null):void{
  if(slot!==null&&(!Number.isInteger(slot)||slot<6||slot>=0x34||slot%2))throw Error('Invalid native Dumb Drum actor slot');
  for(const base of this.bases)put(this.heap,base+DRUM_FLAG,slot??0xffff);
 }
 restore():void{for(const base of this.bases){this.heap.set(DRUM_ORIGINAL,base+DRUM_COMPARE);this.heap.fill(0,base+DRUM_FLAG,base+DRUM_SPACE+DKC_DRUM_FINISH_GUARD.length);this.heap.set(ORIGINAL,base+HEIGHT);this.heap.fill(0,base+SPACE,base+SPACE+DKC_GNAWTY_HEIGHT_GUARD.length);}}
}

export interface DkcDrumState {level:number;slot:number;hp:number;maxHp:number;cooldown:number;defeatRequested:boolean}
/** Five direct hits supplement, rather than replace, Dumb Drum's five native
 * enemy waves. Native progression can still finish earlier by clearing waves.
 * The ROM hook receives a request only after HP reaches zero; until its safe
 * native boundary the original falling/spawning/movement code keeps running. */
export class DkcDrumEncounter{
 private encounter:DkcDrumState|null=null;
 get state():DkcDrumState|null{return this.encounter?{...this.encounter}:null;}
 serialize():DkcDrumState|null{return this.state;}
 restore(value:unknown):void{
  this.encounter=null;
  if(!value||typeof value!=='object')return;
  const v=value as Partial<DkcDrumState>;
  if(!Number.isInteger(v.level)||!([0xe0,0xe1,0xe2,0xe3,0xe4,0xe5,0x68].includes(v.level!))||!Number.isInteger(v.slot)||v.slot!<6||v.slot!>=0x34||v.slot!%2||!Number.isInteger(v.hp)||v.hp!<0||v.hp!>5||v.maxHp!==5||!Number.isInteger(v.cooldown)||v.cooldown!<0||v.cooldown!>45||typeof v.defeatRequested!=='boolean'||v.defeatRequested!==(v.hp===0))return;
  this.encounter={level:v.level!,slot:v.slot!,hp:v.hp!,maxHp:5,cooldown:v.cooldown!,defeatRequested:v.defeatRequested};
 }
 sync(w:Uint8Array,frames=1):DkcDrumState|null{
  const scene=readDkcScene(w);
  let slot=-1;
  // Native DK death handlers set global encounter control $1929=3.
  if(scene.playing&&word(w,0x1929)!==3)for(let j=6;j<0x34;j+=2)if(word(w,DKC.id+j)===0x70&&word(w,DKC.state+j)===7){slot=j;break;}
  if(slot<0){this.encounter=null;return null;}
  if(!this.encounter||this.encounter.level!==scene.level||this.encounter.slot!==slot)this.encounter={level:scene.level,slot,hp:5,maxHp:5,cooldown:0,defeatRequested:false};
  else this.encounter.cooldown=Math.max(0,this.encounter.cooldown-Math.max(0,Math.floor(frames)));
  return this.state;
 }
 targets(w:Uint8Array):DkcNativeBossTarget[]{
  const s=this.encounter,scene=readDkcScene(w);
  if(!s||!s.hp||s.cooldown||!scene.playing||scene.level!==s.level||word(w,DKC.id+s.slot)!==0x70||word(w,DKC.state+s.slot)!==7)return[];
  const sub=word(w,0x152d+s.slot);
  if(sub<1||sub>5)return[];
  return[{nativeBoss:true,id:0x70,slot:s.slot,x:word(w,DKC.x+s.slot),y:word(w,DKC.height)-word(w,DKC.y+s.slot),width:64,height:72}];
 }
 hit(w:Uint8Array,target:Pick<DkcEnemy,'slot'>,kind:DkcNativeBossAttack):boolean{
  if(!['egg','roll','stomp','barrel'].includes(kind)||!this.targets(w).some(t=>t.slot===target.slot))return false;
  const s=this.encounter!;s.hp--;s.cooldown=45;s.defeatRequested=s.hp===0;return true;
 }
 reset():void{this.encounter=null;}
}
