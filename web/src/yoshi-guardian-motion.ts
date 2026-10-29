import{advanceBurt,hydrateBurtMotion,type BurtBody}from'./burt-motion';
import{SALVO_NATIVE,type YoshiGuardianId}from'./yoshi-guardian-spec';
/** World-coordinate adaptations: use the donor poses/behaviour while retaining
 * DKC's floor and collision system. No camera following or native tile edits. */
export function advanceYoshiGuardian(s:BurtBody&{id:YoshiGuardianId;elapsed:number},dt:number,heroX:number,facing=1):'attack'|'land'|undefined{
 if(s.id==='burt')return advanceBurt(s,dt,heroX);
 hydrateBurtMotion(s);s.motionTime!+=dt;
 if(s.id==='bigger-boo'){
  const looking=(heroX<s.x&&facing>0)||(heroX>s.x&&facing<0);s.vx=looking?0:Math.sign(heroX-s.x)*30;s.x+=s.vx*dt;s.y=s.floor-90+Math.sin(s.elapsed*2)*12;s.motion='jump';s.vy=Math.cos(s.elapsed*2)*24;
 }else if(s.id==='raphael'){
  // No moon exists in the DKC arena: keep his feet on its actual floor.
  s.y=s.floor;s.vy=0;s.motion='land';s.vx=(s.direction??-1)*45;s.x+=s.vx*dt;
 }else{
  const windup=s.id==='salvo'?.55:s.id==='milde'?.75:.3,gravity=315;
  if(s.motion==='windup'){s.y=s.floor;s.vx=0;s.vy=0;if(s.motionTime!<windup)return;s.direction=heroX<s.x?-1:1;s.vx=s.direction*(s.id==='salvo'?SALVO_NATIVE.speed:s.id==='milde'?25:s.id==='froggy'?50:65);s.vy=s.id==='salvo'?SALVO_NATIVE.jumpVelocity:s.id==='milde'?-95:s.id==='froggy'?-165:-150;s.motion='jump';s.motionTime=0;return'attack';}
  if(s.motion==='land'){s.y=s.floor;if(s.motionTime!>.18){s.motion='windup';s.motionTime=0;}return;}
  s.x+=s.vx!*dt;s.y+=s.vy!*dt;s.vy=Math.min(180,s.vy!+gravity*dt);
  if(s.y>=s.floor&&s.vy!>=0){s.y=s.floor;s.motion='land';s.motionTime=0;s.vx=s.vy=0;return'land';}
 }
 if(s.x<s.arenaLeft!){s.x=s.arenaLeft!;s.vx=Math.abs(s.vx!);s.direction=1;}else if(s.x>s.arenaRight!){s.x=s.arenaRight!;s.vx=-Math.abs(s.vx!);s.direction=-1;}
}
