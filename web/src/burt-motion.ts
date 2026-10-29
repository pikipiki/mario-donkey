/** Original bank06 disassembly (EU ROM byte offsets verified by
 * scripts/verify-burt-source.py; source CPU labels here differ by+$17): init0697A8 accel$40 (intro), fight069D00
 * accel$20 and terminal$0300. Jump table0699A0 and horizontal069DCC.
 * The port runs these world-space values at the donor's 50Hz rate, independent
 * of DKC's camera. Squash/windup/airborne/landing remain separate states.
 * HP:0697BA starts wildcard2_lo at0A, 06A15C/15F decrements twice per hit,
 * negative at06A162 defeats: six hits, with stronger jumps each time.
 * The short squash/landing timing is an adaptation of native morph states.
 * This is a state/graphics adaptation; it does not execute the SuperFX AI. */
export const BURT_NATIVE={fps:50,gravity:0x20/256*50*50,fallSpeed:0x300/256*50,
 jumps:[0xfb40,0xfb00,0xfac0,0xfa80,0xfa40,0xfa00].map(v=>(v-0x10000)/256*50),speeds:[0x80,0x90,0xa8,0xc0,0x110,0x140].map(v=>v/256*50),windup:16/50,land:8/50};
export interface BurtMotion{arenaLeft?:number;arenaRight?:number;direction?:number;vx?:number;vy?:number;motion?:'windup'|'jump'|'land';motionTime?:number;}
export interface BurtBody extends BurtMotion{x:number;y:number;floor:number;hp:number;maxHp?:number;}
export function hydrateBurtMotion(s:BurtBody):void{
 s.arenaLeft??=Math.max(24,s.x-128);s.arenaRight??=s.x+48;s.direction??=-1;s.vx??=0;s.vy??=0;s.motion??='windup';s.motionTime??=0;
}
export function advanceBurt(s:BurtBody,dt:number,heroX:number):'attack'|'land'|undefined{
 hydrateBurtMotion(s);s.motionTime!+=dt;
 if(s.motion==='windup'){
  s.y=s.floor;s.vx=0;s.vy=0;
  if(s.motionTime!<BURT_NATIVE.windup)return;
  s.direction=heroX<s.x?-1:1;const strength=Math.min(5,Math.max(0,(s.maxHp??3)-s.hp));s.vx=s.direction*BURT_NATIVE.speeds[strength];s.vy=BURT_NATIVE.jumps[strength];s.motion='jump';s.motionTime=0;return'attack';
 }
 if(s.motion==='land'){s.y=s.floor;if(s.motionTime!>=BURT_NATIVE.land){s.motion='windup';s.motionTime=0;}return;}
 s.x+=s.vx!*dt;s.y+=s.vy!*dt;s.vy=Math.min(BURT_NATIVE.fallSpeed,s.vy!+BURT_NATIVE.gravity*dt);
 if(s.x<s.arenaLeft!){s.x=s.arenaLeft!;s.vx=Math.abs(s.vx!);s.direction=1;}else if(s.x>s.arenaRight!){s.x=s.arenaRight!;s.vx=-Math.abs(s.vx!);s.direction=-1;}
 if(s.y>=s.floor&&s.vy!>=0){s.y=s.floor;s.vx=0;s.vy=0;s.motion='land';s.motionTime=0;return'land';}
}
/** Native HDMA-deformed poses, with no second procedural squash applied. */
export function burtPose(s:BurtBody):{state:string;time:number;sx:number;sy:number}{
 hydrateBurtMotion(s);
 if(s.motion==='windup')return{state:'windup',time:Math.min(374,s.motionTime!/BURT_NATIVE.windup*374),sx:1,sy:1};
 if(s.motion==='land')return{state:'land',time:Math.min(249,s.motionTime!/BURT_NATIVE.land*249),sx:1,sy:1};
 return{state:s.vy!<0?'rise':'fall',time:Math.min(249,s.motionTime!*1000),sx:1,sy:1};
}
