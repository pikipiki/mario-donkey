export const ROM_SHA256 = '91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90';
export const PROFILE = {
  mode: 0x118, stage: 0x21a, cameraX: 0x39, cameraY: 0x3b,
  x: 0x8c, y: 0x90, vx: 0xb4, vy: 0xaa, facing: 0xc4,
  baby: 0x1b2, invincible: 0x1d6, sound: 0x7a,
  spriteState: 0xf00, spriteId: 0x1360, spriteX: 0x10e2, spriteY: 0x1182,
  gameplay: 0x13,
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
  if (matches.length!==1) throw new Error('Révision du jeu incompatible : signature de dessin absente ou ambiguë.');
  const patched=original.slice(); patched.set([0xa9,0,0], matches[0]);
  return patched;
}

export function babyIsLost(gsu: Uint8Array): boolean { return (word(gsu,PROFILE.baby)&0x8000)===0; }
/** $7E03B6 stores the star countdown ×10. Reaching 0 starts Baby Mario’s escape and the death. */
export const STAR_FLOOR=30;
export function holdBabyStars(stars:number,lost:boolean):number|undefined{if(!lost||stars>STAR_FLOOR)return undefined;return STAR_FLOOR;}
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
 0x1e,0x20,0x5b,0x62,0x74,0xa3,0xa4,0xd2,0x108,0x12a,0x133,
 0x13f,0x140,0x141,0x142,0x143,0x164,0x165,
 0x169,0x16a,0x16b,0x16c,0x16d,0x16e,0x16f,0x184,0x19b,0x19c,
]); // $1f is a rotating door; $21 is a bucket.
export interface RollHit { slot: number; x: number; y: number }
export function applyRoll(gsu: Uint8Array, direction: number): RollHit[] {
  const x=word(gsu,PROFILE.x), y=word(gsu,PROFILE.y); const hits: RollHit[]=[];
  for (let slot=0;slot<24;slot++) {
    const offset=slot*4, id=word(gsu,PROFILE.spriteId+offset);
    if (word(gsu,PROFILE.spriteState+offset)!==0x10 || !ROLL_TARGETS.has(id)) continue;
    const ex=word(gsu,PROFILE.spriteX+offset), ey=word(gsu,PROFILE.spriteY+offset);
    const dx=signed16(ex-x), dy=signed16(ey-y);
    if (Math.abs(dx)<=34 && Math.abs(dy)<=28 && dx*direction>=-16) {
      writeWord(gsu,PROFILE.spriteState+offset,0x0c); // Native collision death, not an erased object.
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
