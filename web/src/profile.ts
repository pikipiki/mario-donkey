export const ROM_SHA256 = '91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90';
export const PROFILE = {
  mode: 0x118, stage: 0x21a, cameraX: 0x39, cameraY: 0x3b,
  x: 0x8c, y: 0x90, vx: 0xb4, vy: 0xaa, facing: 0xc4,
  baby: 0x1b2, invincible: 0x1d6, sound: 0x7a,
  spriteState: 0xf00, spriteId: 0x1360, spriteX: 0x10e2, spriteY: 0x1182,
  gameplay: 0x13, victory: 0x14,
} as const;
export function word(bytes: Uint8Array, offset: number): number { return bytes[offset] | bytes[offset + 1] << 8; }
export function writeWord(bytes: Uint8Array, offset: number, value: number): void { bytes[offset] = value & 255; bytes[offset + 1] = (value >>> 8) & 255; }
export function signed16(value: number): number { return (value << 16) >> 16; }

/** Patch only the CPU branch deciding whether to draw Yoshi. Baby Mario is a separate sprite. */
export function patchYoshiDrawing(original: Uint8Array): Uint8Array {
  const signature = [0xad,0x1a,0x61,0xf0,0x6e,0xad,0xae,0x61,0x0d,0x57,0x0b];
  const matches: number[] = [];
  for (let i=0;i<=original.length-signature.length;i++) {
    if (signature.every((byte,j)=>original[i+j]===byte)) matches.push(i);
  }
  if (matches.length!==1) throw new Error('This game revision is not supported: the draw signature is missing or ambiguous.');
  const patched=original.slice(); patched.set([0xa9,0,0], matches[0]);
  return patched;
}

export function babyIsLost(gsu: Uint8Array): boolean { return (word(gsu,PROFILE.baby)&0x8000)===0; }
/** The EU goal sprite writes player state $0014 and advances game mode
 * $13 -> $14 in the same native frame. A nearby ring is not a goal trigger:
 * damage can lock the player beside it before Baby Mario detaches. */
export function inGoal(gsu:Uint8Array):boolean{
 return word(gsu,0xac)===0x14;
}
/** A touch knocks Baby Mario off ($0000) and locks Yoshi ($1AE) plus sprites
 * ($1B0). Release those locks and the native grounded stun (invincibility >=
 * $40, GSU $0B:C7E5). Contact/tongue recovery also owns these locks: Baby's
 * return mode (GSU $19D6=1) and EU capture flag (WRAM $0D9C) must keep Yoshi still until
 * the native return trajectory finishes. Never change the star countdown. */
export function absorbHit(gsu:Uint8Array,wram:Uint8Array):boolean{
 if(word(gsu,0x19d6)===1||word(wram,0xd9c)!==0)return false;
 if(word(gsu,0xac)!==0||word(gsu,0xae)!==0)return false;
 const baby=word(gsu,PROFILE.baby),inv=word(gsu,PROFILE.invincible);
 const locked=word(gsu,0x1ae)!==0||word(gsu,0x1b0)!==0;
 const crying=baby===0,riding=(baby&0x8000)!==0;
 if(crying){if(!locked&&inv===0)return false;}
 else if(!(riding&&locked&&inv>=0x40))return false;
 writeWord(gsu,0x1ae,0);writeWord(gsu,0x1b0,0);
 writeWord(gsu,PROFILE.invincible,Math.min(0x3f,Math.max(inv,24)));
 return true;
}
/** Optional rescue aid for the verified EU ROM. Sprite DP $7960+$76 is GSU
 * $19D6: mode 11 is free floating; mode 1 and WRAM $0D9C own recovery.
 * CPU $7222/$75E2 map to GSU $1222/$15E2 (vertical speed/ceiling).
 * Stop an upward bubble near the screen top, then let native acceleration
 * bring it down. Position, horizontal motion, target and stars stay native. */
export function keepBabyVisible(gsu:Uint8Array,wram:Uint8Array):boolean{
 if(wram[PROFILE.mode]!==PROFILE.gameplay||wram[0xd11]!==0||!canModifyJump(gsu))return false;
 if(word(gsu,PROFILE.baby)!==0||word(gsu,PROFILE.spriteState)!==0x10||word(gsu,PROFILE.spriteId)!==0x61)return false;
 if(word(gsu,0x19d6)!==11||word(wram,0xd9c)!==0||word(wram,0x3b6)===0)return false;
 if(signed16(word(gsu,PROFILE.spriteY)-word(wram,PROFILE.cameraY))>=24||signed16(word(gsu,0x1222))>=0)return false;
 const ceiling=Math.max(1,Math.min(0x7fff,Math.abs(signed16(word(gsu,0x15e2)))));
 writeWord(gsu,0x1222,0);writeWord(gsu,0x15e2,ceiling);
 return true;
}
/** Approach a target run speed. Reversing takes a longer skid than releasing the stick. */
export function dkcRun(vx:number,axis:number):number{
 const target=Math.round(Math.max(-1,Math.min(1,axis))*0x2a0);
 const delta=target-vx;if(delta===0)return target;
 const reversing=target!==0&&vx!==0&&Math.sign(target)!==Math.sign(vx);
 const step=reversing?0x48:0x1c;
 return Math.abs(delta)<=step?target:vx+Math.sign(delta)*step;
}

// Ordinary enemies identified in the public sprite_inits table. Bosses,
// invulnerable hazards, Baby Mario, shells, items and scenery stay protected.
export const ROLL_TARGETS = new Set([
 0x1e,0x20,0x54,0x5b,0x62,0x66,0x6d,0x6e,0x74,0x9f,0xa3,0xa4,0xd2,0xee,0xf0,0xf1,0xf4,
 0x108,0x12a,0x133,
 0x13f,0x140,0x141,0x142,0x143,0x164,0x165,
 0x169,0x16a,0x16b,0x16c,0x16d,0x16e,0x16f,0x181,0x184,0x192,0x199,0x19b,0x19c,
]); // $1f is a rotating door; $21 is a bucket. Flowers: piranhas, nippers, petal and fake flowers.
const CUSTOM_DEATH_PLANTS=new Set([0x54,0x66,0x9f,0xee,0xf0,0xf1,0xf4,0x181,0x192,0x199]);
/** EU $03:A32E free_slot / clear_graphics. Do not just zero the sprite ID:
 * that leaks dynamic tiles needed by later sprites, including the goal ring. */
export function freeSpriteGraphics(gsu:Uint8Array,slot:number):void{
 const offset=slot*4,index=gsu[0x1722+offset];
 writeWord(gsu,PROFILE.spriteState+offset,0);
 writeWord(gsu,0x14a2+offset,0xff);
 if(index<0x80)writeWord(gsu,0x1ecc,word(gsu,0x1ecc)&~word(gsu,0x1ece+index));
 if(word(gsu,0x1b6)===offset)writeWord(gsu,0x1b6,0);
}
/** Restore native drawing throughout the goal handoff and victory sequence.
 * The canvas replacement is only used during interactive gameplay. */
export function hideNativePlayer(mode:number,mount:string,form:number,goal=false,dialogue=false):boolean{return mode===PROFILE.gameplay&&!goal&&!dialogue&&mount!=='yoshi'&&form===0;}
export const KONG_JUMP_VELOCITY=-0x640;
export const KONG_JUMP_HOLD_MS=260;
// Native airborne physics adds $A0 gravity with B released before moving Y.
// $400 upward leaves ~$360 movement per frame, instead of the old $E0 crawl.
export const SQUAWKS_FLIGHT_VELOCITY=-0x400;
/** Keep Squawks and his rider below the visible top even in rooms whose native
 * camera cannot scroll upward. Compensate native released-B gravity ($A0).
 * This changes velocity only; native terrain collision still moves the player.
 */
export function squawksFlightVelocity(vy:number,yFromCamera:number):number{
 const roomAbove=Math.max(0,yFromCamera-32);
 return Math.max(Math.min(vy,SQUAWKS_FLIGHT_VELOCITY),-roomAbove*0x100-0xa0);
}
/** Locks, morphs and scripted player states own their vertical movement. */
export function canModifyJump(gsu:Uint8Array):boolean{
 return word(gsu,0xac)===0&&word(gsu,0xae)===0&&word(gsu,0x1ae)===0&&word(gsu,0x1b0)===0;
}
/** $FC records the nine native collision probes: left $180, right $60,
 * ceiling $18, feet $07 (GSU terrain routines in bank $0B). Wall resolution
 * pushes out one pixel and zeros speed; reinjecting full speed each frame can
 * overpower that correction. Preserve it while allowing movement away. */
export function canWriteVelocity(gsu:Uint8Array,axis:'x'|'y',velocity:number):boolean{
 if(!canModifyJump(gsu))return false;
 const mask=axis==='x'?(velocity<0?0x180:velocity>0?0x60:0):(velocity<0?0x18:velocity>0?0x07:0);
 return (word(gsu,0xfc)&mask)===0;
}
/** $C0 is the native airborne state: terrain landing clears it, a normal
 * takeoff sets it to 6 and walking off a ledge sets it to 8 (GSU bank $0B).
 * Arm on the ground and wait for native takeoff before replacing its impulse.
 * A zero Y velocity at the apex is never a second ground contact. */
export class NativeJumpBoost{
 private inputUntil=0;private pendingUntil=0;private lastGroundedAt=-Infinity;private spent=false;private mount='';
 inputPressed(now:number):boolean{return now<this.inputUntil;}
 reset():void{this.inputUntil=0;this.pendingUntil=0;this.lastGroundedAt=-Infinity;this.spent=false;this.mount='';}
 update(gsu:Uint8Array,mount:string,now:number,requested:boolean,enabled=true):number|undefined{
  if(!enabled||mount==='yoshi'||mount==='squawks'||!canModifyJump(gsu)){this.reset();return;}
  if(this.mount!==mount){this.reset();this.mount=mount;}
  const airborne=word(gsu,0xc0),vy=signed16(word(gsu,PROFILE.vy)),grounded=airborne===0;
  if(grounded){this.lastGroundedAt=now;this.spent=false;}
  // The core may have consumed B after the previous bridge tick. Accept that
  // first rising frame, but never an airborne press after the ground window.
  const takeoff=airborne===6&&vy<0;
  if(requested){
   const launch=!this.spent&&(grounded||(takeoff&&now-this.lastGroundedAt<=100));
   this.inputUntil=launch?now+KONG_JUMP_HOLD_MS:0;
   if(launch)this.pendingUntil=this.inputUntil;
  }
  if(now>this.pendingUntil||(!grounded&&!takeoff))this.pendingUntil=0;
  if(this.pendingUntil&&takeoff){
   this.pendingUntil=0;this.spent=true;this.lastGroundedAt=-Infinity;
   return Math.min(vy,mount==='winky'?-0x700:KONG_JUMP_VELOCITY);
  }
 }
}
/** Flutter requires a fresh native B edge while descending. A continuous
 * physical hold supplies that edge once per jump, without replacing velocity
 * or extending the native flutter cycle. Kongs never use this adapter. */
export class NativeFlutterInput{
 private handled=-1;private releaseUntil=0;
 reset():void{this.handled=-1;this.releaseUntil=0;}
 pressed(gsu:Uint8Array,now:number,sequence:number,held:boolean,pressed:boolean,enabled:boolean):boolean{
  if(!enabled||!held){this.reset();return pressed;}
  if(word(gsu,0xc0)===0)this.reset();
  else if(sequence!==this.handled&&signed16(word(gsu,PROFILE.vy))>0&&word(gsu,0xd2)===0){
   this.handled=sequence;this.releaseUntil=now+60;
  }
  return pressed&&now>=this.releaseUntil;
 }
}
export interface RollHit { slot: number; x: number; y: number }
export function applyRoll(gsu: Uint8Array, direction: number): RollHit[] {
  const x=word(gsu,PROFILE.x), y=word(gsu,PROFILE.y); const hits: RollHit[]=[];
  for (let slot=0;slot<24;slot++) {
    const offset=slot*4, id=word(gsu,PROFILE.spriteId+offset);
    if (word(gsu,PROFILE.spriteState+offset)!==0x10 || !ROLL_TARGETS.has(id)) continue;
    const ex=word(gsu,PROFILE.spriteX+offset), ey=word(gsu,PROFILE.spriteY+offset);
    const dx=signed16(ex-x), dy=signed16(ey-y);
    if (Math.abs(dx)<=36 && Math.abs(dy)<=40 && dx*direction>=-16) {
      if(CUSTOM_DEATH_PLANTS.has(id))freeSpriteGraphics(gsu,slot);
      else writeWord(gsu,PROFILE.spriteState+offset,0x0c);
      hits.push({slot,x:ex,y:ey});
    }
  }
  if (hits.length) writeWord(gsu,PROFILE.sound,0x11);
  return hits;
}

export const YOSHI_HIDE_CODES='04FAEBA9+04FAEC00+04FAED00';
/** Complete the native message script only in its opened/reading state.
 * The original game then fades and closes its own window normally. */
export function skipOpenDialogue(wram:Uint8Array,gsu:Uint8Array):boolean{
 if(wram[PROFILE.mode]!==PROFILE.gameplay||wram[0xd11]!==9)return false;
 writeWord(gsu,0x406e,2);return true;
}

/** EU push_sound_queue at ROM $005DE: byte entries, at most seven pending. */
export function queueNativeSound(wram:Uint8Array,id:number):boolean{
 const count=word(wram,0x57);if(count>6||!Number.isInteger(id)||id<0||id>255)return false;
 wram[0x59+count]=id;writeWord(wram,0x57,count+1);return true;
}
