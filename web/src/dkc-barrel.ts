import{DKC,readDkcScene}from'./dkc-profile';
import{word}from'./profile';
const BARRELS=new Set([0x22,0x23,0x24,0x26,0x27]);
/** Native BFBE5F stores the carried actor in16F5+(Kong slot-2), with
 *1375+actor pointing back to that Kong. BFCE9E state1 is Grabbed.
 * BFBC06 starts the native throw on release of Y. Never rewrite actor state,
 * position, ownership, damage, animation or native barrel collision flags. */
export function heldDkcBarrel(w:Uint8Array):{slot:number;id:number}|undefined{
 const s=readDkcScene(w);if(!s.playing)return;
 const p=s.playerSlot,state=word(w,DKC.state+p);
 if([0xc,0xd,0xe,0x39,0x3a,0x3c,0x3d].includes(state)||state>=0x1b&&state<=0x20||word(w,DKC.hit+p))return;
 const slot=word(w,0x16f5+p-2);if(slot<6||slot>=0x34||slot%2)return;
 const id=word(w,DKC.id+slot);if(!BARRELS.has(id)||word(w,0x1375+slot)!==p||word(w,DKC.state+slot)!==1)return;
 return{slot,id};
}
/** Accessibility toggle over the original Y input: tap to pick up, retain Y
 * while carried, then release on the next distinct tap until the native throw
 * has completed. A pulse still expiring must not roll/regrab after that throw. */
export class DkcBarrelControl{
 private context='';private sequence?:number;private carried?:string;private throwing=false;private consumed?:number;
 handling=false;
 get releasing():boolean{return this.throwing;}
 reset():void{this.context='';this.sequence=undefined;this.carried=undefined;this.throwing=false;this.consumed=undefined;this.handling=false;}
 update(w:Uint8Array,sequence:number,pressed:boolean):boolean{
  const s=readDkcScene(w),context=`${s.level}:${s.playerSlot}`;
  if(!s.playing){this.reset();return false;}
  if(this.context&&this.context!==context){this.reset();this.sequence=sequence;this.consumed=sequence;}
  this.context=context;const fresh=this.sequence!==undefined&&sequence!==this.sequence;this.sequence=sequence;
  const barrel=heldDkcBarrel(w),key=barrel?`${barrel.slot}:${barrel.id}`:undefined;
  if(!key){
   if(this.carried){this.consumed=sequence;this.carried=undefined;this.throwing=false;}
   this.handling=this.consumed===sequence;return pressed&&!this.handling;
  }
  if(key!==this.carried){this.carried=key;this.throwing=false;this.consumed=sequence;}
  else if(fresh){this.throwing=true;this.consumed=sequence;}
  this.handling=true;return!this.throwing;
 }
}
