export type Direction=-1|0|1;
export type Button='left'|'right'|'up'|'down'|'jump'|'roll'|'tongue'|'egg'|'stop';
export class Controls {
 direction:Direction=0;vertical:Direction=0;keyboardDirection:Direction=0;
 stickX=0;stickY=0;usingStick=false;
 jumpUntil=0;jumpResumeAt=0;jumpStartedAt=0;rollUntil=0;tongueUntil=0;eggUntil=0;eggNextAt=0;verticalUntil=0;facing:-1|1=1;jumpSequence=0;extra=new Map<number,number>();
 private tongueAimUntil=0;private tongueUpUntil=0;
 private jumpSources=new Set<string>();private jumpReleasedAt=-Infinity;
 constructor(public sticky=false){}
 setStick(x:number,y:number,now=0):void{
  this.usingStick=true;this.stickX=Math.max(-1,Math.min(1,x));this.stickY=Math.max(-1,Math.min(1,y));
  const horizontal:Direction=Math.abs(this.stickX)>0.22?(this.stickX<0?-1:1):0;
  if(horizontal)this.facing=horizontal;
  this.tongueAimUntil=this.stickY<-.28?now+2000:0;
  // One-finger play keeps walking while the finger moves to Jump or Tongue.
  // Touching the center (or only Up/Down) stops this latched horizontal input.
  if(this.sticky)this.direction=horizontal;
 }
 releaseStick():void{this.usingStick=false;this.stickX=0;this.stickY=0;}
 /** -1..1. Partial tilt walks slower, like a heavy Kong rather than a digital tap. */
 runAxis():number{if(this.usingStick)return Math.abs(this.stickX)>0.22?this.stickX:0;return this.keyboardDirection||this.direction;}
 verticalAxis(now:number):Direction{if(this.usingStick&&Math.abs(this.stickY)>0.28)return this.stickY<0?-1:1;return now<this.verticalUntil?this.vertical:0;}
 activate(button:Button,now:number):void{
  if(button==='left'||button==='right'){const d=button==='left'?-1:1;this.direction=this.sticky&&this.direction===d?0:d;this.facing=d;}
  else if(button==='stop')this.stop();
  else if(button==='up'||button==='down'){this.vertical=button==='up'?-1:1;this.verticalUntil=now+650;this.tongueAimUntil=button==='up'?now+2000:0;}
  else if(button==='jump'){this.jumpResumeAt=Math.max(now<this.jumpUntil?now+60:now,this.jumpReleasedAt+60);this.jumpStartedAt=this.jumpResumeAt;this.jumpUntil=this.jumpResumeAt+750;this.jumpSequence++;}
  else if(button==='roll'&&now>=this.rollUntil)this.rollUntil=now+580;
  else if(button==='tongue'){const up=this.verticalAxis(now)<0||now<this.tongueAimUntil;this.tongueUntil=now+140;this.tongueUpUntil=up?this.tongueUntil:0;this.tongueAimUntil=0;}
  else if(button==='egg'){this.tongueAimUntil=0;this.tongueUpUntil=0;this.jumpSources.clear();this.direction=0;this.keyboardDirection=0;this.vertical=0;this.verticalUntil=0;this.tongueUntil=0;this.rollUntil=0;this.jumpUntil=0;if(this.eggUntil>0&&now<this.eggUntil+80)this.eggNextAt=this.eggUntil+80;else this.eggUntil=now+130;}
 }
 /** Remember only the intended attack aim, never a movement direction. */
 tongueUpPressed(now:number):boolean{return now<this.tongueUntil&&now<this.tongueUpUntil;}
 tongueAimingUp(now:number):boolean{return this.verticalAxis(now)<0||now<this.tongueAimUntil||this.tongueUpPressed(now);}
 /** Track real holds independently of the timed accessibility click pulse. */
 holdJump(source:string,now:number):void{if(this.jumpSources.has(source))return;if(!this.jumpSources.size)this.activate('jump',now);this.jumpSources.add(source);}
 releaseJump(source:string,now:number):void{if(this.jumpSources.delete(source)&&!this.jumpSources.size){this.jumpReleasedAt=now;this.jumpUntil=Math.min(this.jumpUntil,Math.max(now,this.jumpStartedAt+80));}}
 get jumpHeld():boolean{return this.jumpSources.size>0;}
 /** A repeated tap releases B briefly so native flutter sees a new press. */
 jumpPressed(now:number):boolean{return now>=this.jumpResumeAt&&(this.jumpHeld||now<this.jumpUntil);}
 eggPressed(now:number):boolean{if(this.eggNextAt&&now>=this.eggNextAt){this.eggUntil=this.eggNextAt+130;this.eggNextAt=0;}return now<this.eggUntil;}
 pulse(button:number,now:number):void{if(button>=0&&button<12)this.extra.set(button,now+180);}
 release(button:Button):void{if(!this.sticky&&(button==='left'||button==='right'))this.direction=0;}
 movement(now:number):Direction{if(now<this.rollUntil)return this.facing;const axis=this.runAxis();return axis<0?-1:axis>0?1:0;}
 stop():void{this.tongueAimUntil=0;this.tongueUpUntil=0;this.jumpSources.clear();this.direction=0;this.keyboardDirection=0;this.vertical=0;this.releaseStick();this.jumpUntil=0;this.jumpResumeAt=0;this.rollUntil=0;this.tongueUntil=0;this.eggUntil=0;this.eggNextAt=0;this.verticalUntil=0;this.extra.clear();}
}
