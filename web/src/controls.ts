export type Direction=-1|0|1;
export type Button='left'|'right'|'up'|'down'|'jump'|'roll'|'tongue'|'egg'|'stop';
export class Controls {
 direction:Direction=0;vertical:Direction=0;keyboardDirection:Direction=0;
 jumpUntil=0;rollUntil=0;tongueUntil=0;eggUntil=0;eggNextAt=0;verticalUntil=0;facing:-1|1=1;jumpSequence=0;extra=new Map<number,number>();
 constructor(public sticky=true){}
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
 movement(now:number):Direction{return now<this.rollUntil?this.facing:this.keyboardDirection||this.direction;}
 stop():void{this.direction=0;this.keyboardDirection=0;this.vertical=0;this.jumpUntil=0;this.rollUntil=0;this.tongueUntil=0;this.eggUntil=0;this.eggNextAt=0;this.verticalUntil=0;this.extra.clear();}
}
