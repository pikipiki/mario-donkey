export type Direction=-1|0|1;
export type Button='left'|'right'|'up'|'down'|'jump'|'roll'|'tongue'|'egg'|'stop';
export class Controls {
 direction:Direction=0;vertical:Direction=0;keyboardDirection:Direction=0;
 stickX=0;stickY=0;usingStick=false;
 jumpUntil=0;rollUntil=0;tongueUntil=0;eggUntil=0;eggNextAt=0;verticalUntil=0;facing:-1|1=1;jumpSequence=0;extra=new Map<number,number>();
 constructor(public sticky=true){}
 setStick(x:number,y:number):void{
  this.usingStick=true;this.stickX=Math.max(-1,Math.min(1,x));this.stickY=Math.max(-1,Math.min(1,y));
  if(Math.abs(this.stickX)>0.22)this.facing=this.stickX<0?-1:1;
 }
 releaseStick():void{this.usingStick=false;this.stickX=0;this.stickY=0;}
 /** -1..1. Partial tilt walks slower, like a heavy Kong rather than a digital tap. */
 runAxis():number{if(this.usingStick)return Math.abs(this.stickX)>0.22?this.stickX:0;return this.keyboardDirection||this.direction;}
 verticalAxis(now:number):Direction{if(this.usingStick&&Math.abs(this.stickY)>0.28)return this.stickY<0?-1:1;return now<this.verticalUntil?this.vertical:0;}
 activate(button:Button,now:number):void{
  if(button==='left'||button==='right'){const d=button==='left'?-1:1;this.direction=this.sticky&&this.direction===d?0:d;this.facing=d;}
  else if(button==='stop')this.stop();
  else if(button==='up'||button==='down'){this.vertical=button==='up'?-1:1;this.verticalUntil=now+650;}
  else if(button==='jump'){this.jumpUntil=now+750;this.jumpSequence++;}
  else if(button==='roll'&&now>=this.rollUntil)this.rollUntil=now+580;
  else if(button==='tongue')this.tongueUntil=now+140;
  else if(button==='egg'){this.direction=0;this.keyboardDirection=0;this.vertical=0;this.verticalUntil=0;this.tongueUntil=0;this.rollUntil=0;this.jumpUntil=0;if(this.eggUntil>0&&now<this.eggUntil+80)this.eggNextAt=this.eggUntil+80;else this.eggUntil=now+130;}
 }
 eggPressed(now:number):boolean{if(this.eggNextAt&&now>=this.eggNextAt){this.eggUntil=this.eggNextAt+130;this.eggNextAt=0;}return now<this.eggUntil;}
 pulse(button:number,now:number):void{if(button>=0&&button<12)this.extra.set(button,now+180);}
 release(button:Button):void{if(!this.sticky&&(button==='left'||button==='right'))this.direction=0;}
 movement(now:number):Direction{if(now<this.rollUntil)return this.facing;const axis=this.runAxis();return axis<0?-1:axis>0?1:0;}
 stop():void{this.direction=0;this.keyboardDirection=0;this.vertical=0;this.releaseStick();this.jumpUntil=0;this.rollUntil=0;this.tongueUntil=0;this.eggUntil=0;this.eggNextAt=0;this.verticalUntil=0;this.extra.clear();}
}
