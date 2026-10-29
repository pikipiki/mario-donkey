import{DKC,readDkcScene}from'./dkc-profile';import{word}from'./profile';import type{Animal,Character,Mount}from'./adventure';
const NATIVE_ANIMALS:Readonly<Record<number,Animal>>={9:'rambi',10:'expresso',11:'winky',12:'enguarde'};
/** Original DKC mount links: $0512+(Kong slot-2) points at the animal actor,
 * whose $1375 backlink is the rider. An unmounted nearby animal is not a mount.
 * The native renderer already draws that animal; only its hidden rider changes. */
export function nativeDkcMount(w:Uint8Array):{kind:Animal;slot:number;x:number;y:number}|undefined{
 const s=readDkcScene(w);if(!s.playing)return;const slot=word(w,0x512+s.playerSlot-2);
 if(slot<6||slot>=0x34||slot%2||word(w,0x1375+slot)!==s.playerSlot||word(w,DKC.state+slot)===0xc)return;
 const kind=NATIVE_ANIMALS[word(w,DKC.id+slot)];if(!kind)return;
 return{kind,slot,x:word(w,DKC.x+slot),y:word(w,DKC.height)-word(w,DKC.y+slot)};
}
/** Seat offsets in native screen pixels. Rider pose foot anchors differ across
 * the original Kong sprites and the seated PlushGoonk renders. */
export function dkcSaddle(mount:Exclude<Mount,'foot'>,character:Character):{x:number;y:number}{
 const seat={yoshi:{x:-3,y:-17},rambi:{x:-6,y:-32},winky:{x:-2,y:-19},expresso:{x:-3,y:-37},enguarde:{x:-4,y:-17},squawks:{x:-1,y:-20}}[mount];
 const feet=character==='dk'?15:character==='diddy'?24:character==='mario'?0:19;
 return{x:seat.x,y:seat.y+feet};
}
