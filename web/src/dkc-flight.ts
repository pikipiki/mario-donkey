import{DKC,readDkcScene}from'./dkc-profile';
import{word,writeWord}from'./profile';
/** Mod ability: DKC1 Squawks is a following light, not a playable mount.
 * Hold Jump for sustained lift; retain native terrain, gravity and camera.
 * Only ordinary controllable Kong states, never water/hurt/doors/cutscenes. */
export class DkcFlight{
 active=false;
 reset():void{this.active=false;}
 update(w:Uint8Array,held:boolean,enabled:boolean):boolean{
  const s=readDkcScene(w),state=word(w,DKC.state+s.playerSlot),cart=word(w,0x1e0f);
  const flyingCart=state===0x2e&&cart>=6&&cart<0x34&&cart%2===0&&word(w,DKC.id+cart)===0x51&&word(w,DKC.state+cart)===5;
  this.active=enabled&&held&&s.playing&&word(w,0x32)!==3&&(state<=8||flyingCart)&&word(w,DKC.hit+s.playerSlot)===0;
  if(!this.active)return false;
  // Follow the native camera, easing at its upper visible limit. Never send
  // the actor offscreen or rewrite terrain/camera bounds to invent scenery.
  const ceiling=Math.max(12,s.cameraY+32),lift=Math.max(0,Math.min(0x400,Math.round((s.y-ceiling)*64)));
  writeWord(w,DKC.vy+(flyingCart?cart:s.playerSlot),lift);
  return true;
 }
}
