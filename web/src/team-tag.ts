import type{Adventure,Character}from'./adventure';
export interface TeamPoint{x:number;y:number;facing:number;grounded:boolean}
export const TEAM_TAG_SECONDS=.42; // goonk-country teamSwapSeconds / native DKC ~25 frames.
export class TeamTag{
 private trail:TeamPoint[]=[];private follower?:TeamPoint;private frame?:number;private room='';
 private swap?:{from:Character;to:Character;elapsed:number;back:TeamPoint;committed:boolean};
 get swapping():boolean{return Boolean(this.swap);}
 cancel():void{this.swap=undefined;this.frame=undefined;}
 reset():void{this.cancel();this.trail=[];this.follower=undefined;}
 begin(a:Adventure,p:TeamPoint):boolean{if(this.swap||!p.grounded)return false;this.swap={from:a.active,to:a.partner,elapsed:0,back:this.follower??{...p,x:p.x-p.facing*30},committed:false};return true;}
 update(frame:number,room:string,p:TeamPoint,a:Adventure):boolean{
  if(this.room&&room!==this.room||this.trail[0]&&Math.hypot(p.x-this.trail[0].x,p.y-this.trail[0].y)>96){this.reset();}this.room=room;
  if(frame===this.frame)return false;
  const dt=this.frame===undefined?0:Math.max(0,Math.min(.06,(frame-this.frame)/60));this.frame=frame;
  let changed=false;
  if(this.swap){const s=this.swap;s.elapsed+=dt;if(!s.committed&&s.elapsed>=TEAM_TAG_SECONDS/2){a.swapTeam();s.committed=true;changed=true;}if(s.elapsed>=TEAM_TAG_SECONDS){this.swap=undefined;this.follower={...p,x:p.x-p.facing*30};this.trail=[];}}
  else{this.trail.push({...p});if(this.trail.length>22)this.follower=this.trail.shift();if(!this.follower)this.follower={...p,x:p.x-p.facing*30};}
  return changed;
 }
 poses(p:TeamPoint,a:Adventure):{leader:{character:Character;x:number;y:number;facing:number};partner:{character:Character;x:number;y:number;facing:number};contact:number}{
  const s=this.swap;if(!s){const back=this.follower??{...p,x:p.x-p.facing*30};return{leader:{character:a.active,...p},partner:{character:a.partner,...back,x:Math.abs(back.x-p.x)<24?p.x-p.facing*30:back.x},contact:0};}
  const u=Math.min(1,s.elapsed/TEAM_TAG_SECONDS),first=u<.5,ease=.5-.5*Math.cos((first?u*2:(u-.5)*2)*Math.PI),hop=Math.sin(u*Math.PI);
  return{leader:{character:first?s.from:s.to,x:p.x,y:p.y-hop*7,facing:p.facing},partner:{character:first?s.to:s.from,x:first?s.back.x+(p.x-s.back.x)*ease:p.x-p.facing*30*ease,y:first?s.back.y+(p.y-s.back.y)*ease-hop*4:p.y-hop*3,facing:first?p.facing:-p.facing},contact:Math.max(0,1-Math.abs(u-.5)*8)};
 }
}
export function drawTagContact(c:CanvasRenderingContext2D,x:number,y:number,strength:number):void{if(strength<=0)return;c.save();c.globalAlpha*=strength;c.fillStyle='#fff3b1';for(let i=0;i<8;i++){const angle=i*Math.PI/4;c.fillRect(Math.round(x+Math.cos(angle)*10)-1,Math.round(y+Math.sin(angle)*10)-1,3,3);}c.fillRect(x-5,y-2,10,4);c.fillRect(x-2,y-5,4,10);c.restore();}
