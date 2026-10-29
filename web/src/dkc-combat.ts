export interface DkcTarget {slot:number;id:number;x:number;y:number;width:number;height:number;nativeBoss?:boolean}
export interface DkcEgg {x:number;y:number;vx:number;vy:number;age:number}
export interface DkcAim{x:number;y:number;endX:number;endY:number}
export interface DkcCombatSave {eggs:number;shots:DkcEgg[];aimPhase?:number;mouth?:number}
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
export function sweptHit(x:number,y:number,nx:number,ny:number,t:DkcTarget):boolean{
 let lo=0,hi=1;
 for(const [p,d,min,max]of [[x,nx-x,t.x-t.width/2-5,t.x+t.width/2+5],[y,ny-y,t.y-t.height-6,t.y+6]]){
  if(Math.abs(d)<1e-9){if(p<min||p>max)return false;continue;}
  const a=(min-p)/d,b=(max-p)/d;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return false;
 }
 return true;
}
/** The native DKC enemy owns its death/graphics cleanup. Count an egg only
 * after its validated native hit request has been accepted. */
export class DkcCombat {
 eggs=0;mouth?:number;shots:DkcEgg[]=[];tongue?:{x:number;y:number;endX:number;endY:number;until:number};
 aiming?:DkcAim;
 private aimPhase?:number;private trail:Array<{x:number;y:number}>=[];private path:Array<{x:number;y:number}>=[];
 private frame?:number;private eggHeld=false;private tongueHeld=false;private downHeld=false;
 get eggTrail():readonly{x:number;y:number}[]{return this.trail;}
 private followEggs(player:{x:number;y:number;facing:number}):void{
  const point={x:player.x,y:player.y-12},last=this.path[0],distance=last?Math.hypot(point.x-last.x,point.y-last.y):Infinity;
  if(distance>96)this.path=[point];else if(distance>=2)this.path.unshift(point);
  this.path=this.path.slice(0,96);
  // Follow the actual walked path at 12px intervals, including turns/jumps.
  this.trail=Array.from({length:this.eggs},(_,index)=>{
   let remaining=16+index*12,from=point;
   for(const to of this.path){const length=Math.hypot(to.x-from.x,to.y-from.y);if(length>=remaining&&length>0)return{x:from.x+(to.x-from.x)*remaining/length,y:from.y+(to.y-from.y)*remaining/length};remaining-=length;from=to;}
   return{x:from.x-(player.facing<0?-1:1)*remaining,y:from.y};
  });
 }
 private updateAim(x:number,y:number,facing:number):void{
  if(this.aimPhase===undefined){this.aiming=undefined;return;}
  const angle=(-27.5+52.5*Math.sin(this.aimPhase*Math.PI))*Math.PI/180;
  this.aiming={x,y,endX:x+facing*Math.cos(angle)*72,endY:y+Math.sin(angle)*72};
 }
 resetClock():void{this.frame=undefined;this.eggHeld=false;this.tongueHeld=false;this.tongue=undefined;this.downHeld=false;}
 restore(value:unknown):void{
  const s=value as DkcCombatSave|undefined;this.eggs=Number.isInteger(s?.eggs)?clamp(s!.eggs,0,6):0;
  this.aimPhase=typeof s?.aimPhase==='number'&&Number.isFinite(s.aimPhase)&&s.aimPhase>=0&&s.aimPhase<2?s.aimPhase:undefined;this.aiming=undefined;this.path=[];this.trail=[];
  this.mouth=Number.isInteger(s?.mouth)&&s!.mouth!>=0&&s!.mouth!<=255?s!.mouth:undefined;
  this.shots=Array.isArray(s?.shots)?s.shots.filter(p=>p&&[p.x,p.y,p.vx,p.vy,p.age].every(Number.isFinite)&&p.age>=0&&p.age<=4&&Math.abs(p.vx)<=400&&Math.abs(p.vy)<=400).slice(0,6).map(p=>({...p})):[];this.resetClock();
 }
 serialize():DkcCombatSave{return{eggs:this.eggs,...(this.mouth===undefined?{}:{mouth:this.mouth}),shots:this.shots.map(p=>({...p})),...(this.aimPhase===undefined?{}:{aimPhase:this.aimPhase})};}
 update(frame:number,now:number,player:{x:number;y:number;facing:number},targets:DkcTarget[],egg:boolean,tongue:boolean,up:boolean,hit:(target:DkcTarget)=>boolean,guardian?:DkcTarget,input:{unlimited?:boolean;down?:boolean;direction?:{x:number;y:number}}={}):{madeEgg:boolean;ate:boolean;killed:number;threw:boolean}{
  const dt=this.frame===undefined?0:clamp((frame-this.frame)/60,0,.06);this.frame=frame;
  const freshEgg=egg&&!this.eggHeld,freshTongue=tongue&&!this.tongueHeld;this.eggHeld=egg;this.tongueHeld=tongue;
  const facing=player.facing<0?-1:1,x=player.x+facing*12,y=player.y-17;
  if(guardian||input.unlimited)this.eggs=6;
  if(this.aimPhase!==undefined)this.aimPhase=(this.aimPhase+dt)%2;
  this.updateAim(x,y,facing);
  let ate=false,killed=0,threw=false,madeEgg=false;
  if(input.down&&!this.downHeld&&this.mouth!==undefined){this.eggs=Math.min(6,this.eggs+1);this.mouth=undefined;madeEgg=true;}this.downHeld=Boolean(input.down);
  if(freshTongue&&this.mouth===undefined){
   const direction=input.direction??{x:up?0:facing,y:up?-1:0},length=Math.hypot(direction.x,direction.y)||1;
   const endX=x+direction.x/length*78,endY=y+direction.y/length*78;
   this.tongue={x,y,endX,endY,until:now+150};
   const target=targets.filter(t=>t.slot>=0&&!t.nativeBoss&&sweptHit(x,y,endX,endY,t)).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
   if(target&&hit(target)){this.mouth=target.id;ate=true;targets=targets.filter(t=>t.slot!==target.slot);}
  }
  if(freshEgg&&this.eggs>0&&this.shots.length<6){
   if(this.aimPhase===undefined){this.aimPhase=up?1.5:0;this.updateAim(x,y,facing);}
   else{
    const aim=this.aiming!,dx=aim.endX-x,dy=aim.endY-y,n=Math.hypot(dx,dy)||1;
    this.shots.push({x,y,vx:dx/n*300,vy:dy/n*300,age:0});this.eggs--;threw=true;this.aimPhase=undefined;this.aiming=undefined;
   }
  }
  this.shots=this.shots.filter(p=>{
   const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;p.age+=dt;
   const t=[...targets,...(guardian?[guardian]:[])].find(t=>sweptHit(p.x,p.y,nx,ny,t));
   p.x=nx;p.y=ny;
   if(t&&guardian&&t.slot===guardian.slot){hit(t);return false;}
   if(t?.nativeBoss){hit(t);return false;}
   if(t&&hit(t)){killed++;targets=targets.filter(e=>e.slot!==t.slot);return false;}
   return p.age<3&&Math.hypot(p.x-player.x,p.y-player.y)<360;
  });
  if(guardian||input.unlimited)this.eggs=6;
  this.followEggs(player);
  if(this.tongue&&now>=this.tongue.until)this.tongue=undefined;
  return{madeEgg,ate,killed,threw};
 }
}
