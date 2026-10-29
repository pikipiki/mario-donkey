import{waitingGoal,type StalledGoal}from'./goal-recovery';
/** Exact EU native exit: LDA60B0/CMP00F0/BMI +15/INC0B59 twice,
 * then despawn outgoing Yoshi and goal. Only lower its screen-edge comparison
 * after an observed stationary departure. All native cleanup/score code runs. */
export const DEPARTURE_SITE=0x12c3c;
export const DEPARTURE_SIGNATURE=new Uint8Array([0xad,0xb0,0x60,0xc9,0xf0,0,0x30,0x15,0xee,0x59,0x0b,0xee,0x59,0x0b,0xbc,0x36,0x7a,0x88,0xbb,0x22,0x1e,0xa3,3,0xa6,0x12,0x22,0x1e,0xa3,3]);
export class GoalDepartureHooks{
 private base:number;private requested=false;
 constructor(private heap:Uint8Array,drawSite:number){
  this.base=drawSite-0x27aeb;
  if(this.base<0||!DEPARTURE_SIGNATURE.every((v,i)=>heap[this.base+DEPARTURE_SITE+i]===v))throw Error('The native goal departure routine is incompatible. Your save is kept.');
 }
 request(w:Uint8Array,g:Uint8Array,expected:StalledGoal):boolean{
  const s=waitingGoal(w,g);if(expected.kind!=='departure'||s?.kind!=='departure'||s.stage!==expected.stage||s.slot!==expected.slot||s.x!==expected.x||s.y!==expected.y)return false;
  this.heap[this.base+DEPARTURE_SITE+4]=0;this.requested=true;return true;
 }
 sync(w:Uint8Array,g:Uint8Array):void{if(this.requested&&waitingGoal(w,g)?.kind!=='departure')this.restore();}
 restore():void{this.heap[this.base+DEPARTURE_SITE+4]=0xf0;this.requested=false;}
}
