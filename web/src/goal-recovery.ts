import{PROFILE as P,word,writeWord,babyIsLost,signed16}from'./profile';
export interface StalledGoal{stage:number;slot:number;x:number;y:number;kind?:'departure'}
/** EU goal phase3 waits for the native Baby Mario carried flag while resetting
 * timer1 to $180. Request Baby's existing return routine only after 300 native
 * frames of this exact wait. Never award a clear, score, life or carried flag. */
export function waitingGoal(w:Uint8Array,g:Uint8Array):StalledGoal|undefined{
 if(w[P.mode]!==P.victory||word(g,0xac)!==2||word(w,0xb59)===0)return;
 for(let slot=6;slot<24;slot++){
  const o=slot*4;if(word(g,P.spriteId+o)!==0xd||word(g,P.spriteState+o)!==0x10||word(g,0x1978+o)!==3)continue;
  const goal={stage:w[P.stage],slot,x:word(g,P.spriteX+o),y:word(g,P.spriteY+o)},timer=word(g,0x1a96+o);
  if(babyIsLost(g)&&word(g,P.spriteId)===0x61&&word(g,P.spriteState)===0x10&&[0,11].includes(word(g,0x19d6))&&timer>=0x17e)return goal;
  const screenX=signed16(word(g,0xb0));
  if(!babyIsLost(g)&&timer===0&&screenX>=0&&screenX<240)return{...goal,kind:'departure'};
 }
}

export function requestGoalReturn(w:Uint8Array,g:Uint8Array,expected:StalledGoal):boolean{
 const s=waitingGoal(w,g);if(!s||s.kind==='departure'||s.stage!==expected.stage||s.slot!==expected.slot||s.x!==expected.x||s.y!==expected.y)return false;
 // Verified exact EU file34399: LDY0B59/BNE -> native C42A recovery. The
 // original routine owns attaching Mario and resuming the goal countdown.
 writeWord(g,0x19d6,1);return true;
}
export class GoalHandoffRecovery{
 private anchorX=0;private anchorCamera=0;
 private key='';private began?:number;private last?:number;private requested=false;
 reset():void{this.key='';this.began=undefined;this.last=undefined;this.requested=false;}
 update(w:Uint8Array,g:Uint8Array,frame:number):StalledGoal|undefined{
  const s=waitingGoal(w,g);if(!s||!Number.isFinite(frame)){this.reset();return;}
  const key=`${s.kind??'baby'}:${s.stage}:${word(w,0x32)}:${w[0x34]}:${s.slot}:${s.x}:${s.y}`;
  if(key!==this.key||this.last!==undefined&&frame<this.last||s.kind==='departure'&&(Math.abs(signed16(word(g,P.x)-this.anchorX))>8||Math.abs(signed16(word(w,P.cameraX)-this.anchorCamera))>8)){this.reset();this.key=key;this.began=frame;this.anchorX=word(g,P.x);this.anchorCamera=word(w,P.cameraX);}this.last=frame;
  if(!this.requested&&this.began!==undefined&&frame-this.began>=(s.kind==='departure'?150:300)){this.requested=true;return s;}
 }
}
