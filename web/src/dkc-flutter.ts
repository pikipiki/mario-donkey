import{DKC,readDkcScene}from'./dkc-profile';
import{word,writeWord}from'./profile';
/** One finite flutter per held-jump sequence, beginning only on descent.
 * DKC velocities point UP, unlike the screen/Yoshi coordinates. Preserve its
 * native takeoff, collisions, damage, swimming, vehicles and death scripts. */
export class DkcFlutter{
 starts=0;private used=-1;private began?:number;
 reset():void{this.used=-1;this.began=undefined;}
 get active():boolean{return this.began!==undefined;}
 update(w:Uint8Array,frame:number,sequence:number,held:boolean,enabled:boolean):boolean{
  const s=readDkcScene(w),state=word(w,DKC.state+s.playerSlot);
  if(!enabled||!s.playing||s.grounded||state>8||word(w,DKC.hit+s.playerSlot)!==0){this.reset();return false;}
  if(!held){this.began=undefined;return false;}
  let started=false;
  if(this.began===undefined&&this.used!==sequence&&s.vy>0){this.used=sequence;this.began=frame;this.starts++;started=true;}
  if(this.began===undefined)return false;
  const age=frame-this.began;if(age<0||age>=44){this.began=undefined;return false;}
  writeWord(w,DKC.vy+s.playerSlot,age<10?0x200:age<30?0x100:0x40);
  return started;
 }
}
