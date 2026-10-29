import{DKC,readDkcScene}from'./dkc-profile';
import{word,writeWord}from'./profile';
import type{Adventure,Character}from'./adventure';
/** Observe the native hurt D/state-E takeover, never replace its physics,
 * sounds, life count or death script. Slot offsets are 2/4, not actor ordinals. */
/** Once per campaign upgrade, let the native next-stage loader start the
 * configured duo. Only on the overworld; never refill a lost partner in play. */
export function initializeDkcTeam(w:Uint8Array,initialized:boolean):boolean{if(initialized)return true;if(!readDkcScene(w).isMap)return false;writeWord(w,0x579,word(w,0x579)|1);return true;}
export class DkcTeamDamage{
 private room?:number;private pending?:{slot:number;from:Character;to:Character;committed:boolean};
 reset():void{this.room=undefined;this.pending=undefined;}
 update(w:Uint8Array,a:Adventure):boolean{
  const s=readDkcScene(w);if(!s.playing||this.room!==s.level){this.pending=undefined;this.room=s.playing?s.level:undefined;}if(!s.playing)return false;
  const state=word(w,DKC.state+s.playerSlot),other=s.playerSlot^6;
  if(!this.pending&&[0xd,0x3a].includes(state)&&word(w,DKC.state+other)===0xe)this.pending={slot:s.playerSlot,from:a.active,to:a.partner,committed:false};
  const p=this.pending;if(!p)return false;
  if(!p.committed&&s.playerSlot!==p.slot&&(state<=0xb||state===0x2b)){a.select(p.to);p.committed=true;return true;}
  if(p.committed&&word(w,DKC.state+p.slot)===0xc)this.pending=undefined;
  return false;
 }
 hasPartner(w:Uint8Array):boolean{const s=readDkcScene(w),slot=s.playerSlot^6;return s.playing&&[1,2].includes(word(w,DKC.id+slot))&&word(w,DKC.state+slot)!==0xc;}
 canTag(w:Uint8Array):boolean{const s=readDkcScene(w);return this.hasPartner(w)&&!this.pending&&![9,0xa,0xd,0xe,0x39,0x3a].includes(word(w,DKC.state+(s.playerSlot^6)));}
 nativePartner(w:Uint8Array,a:Adventure):{character:Character;x:number;y:number;facing:number;animation:'walk'|'jump'}|undefined{
  const s=readDkcScene(w),slot=s.playerSlot^6,state=word(w,DKC.state+slot);
  if(!this.hasPartner(w)||!this.pending&&![9,0xa,0xd,0xe,0x39,0x3a].includes(state))return;
  return{character:this.pending?.committed?this.pending.from:a.partner,x:word(w,DKC.x+slot),y:word(w,DKC.height)-word(w,DKC.y+slot),facing:word(w,DKC.attributes+slot)&0x4000?-1:1,animation:[9,0xa,0x39].includes(state)?'walk':'jump'};
 }
 get transitioning():boolean{return Boolean(this.pending&&!this.pending.committed);}
}
