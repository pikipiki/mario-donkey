/** Native stars are tenths of the displayed counter, not wall-clock seconds.
 * Give every rescue at least ten active seconds; keep pauses and instructions
 * outside that budget, and preserve extra stars collected during the rescue. */
export class RescueTimer {
 private remainingMs:number|undefined;
 private previousNow:number|undefined;
 private writtenStars=0;
 reset():void{this.remainingMs=undefined;this.previousNow=undefined;this.writtenStars=0;}
 pause():void{this.previousNow=undefined;}
 update(now:number,lost:boolean,stars:number,counting=true):number|undefined{
  if(!lost){this.reset();return;}
  if(this.remainingMs===undefined){this.remainingMs=Math.max(10000,stars*100);this.writtenStars=stars;}
  if(!counting){this.pause();return;}
  if(this.previousNow!==undefined)this.remainingMs=Math.max(0,this.remainingMs-Math.max(0,now-this.previousNow));
  if(stars>this.writtenStars)this.remainingMs+=100*(stars-this.writtenStars);
  this.previousNow=now;
  const next=Math.min(999,Math.ceil(this.remainingMs/100));
  this.writtenStars=next;
  return next;
 }
}
