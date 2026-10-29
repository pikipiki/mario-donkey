import { DKC, readDkcScene } from './dkc-profile';
import type { DkcTarget } from './dkc-combat';
const word=(w:Uint8Array,p:number)=>w[p]|w[p+1]<<8;
const put=(w:Uint8Array,p:number,v:number)=>{w[p]=v&255;w[p+1]=v>>>8;};
interface Banana {chunk:number;address:number;bit:number;nativeX:number;nativeY:number;level:number}
export interface DkcCollectibleTarget extends DkcTarget {collectible:true;banana?:Banana}
const pending=new WeakMap<ArrayBufferLike,DkcCollectibleTarget[]>();
/** Native bananas are formation bitmaps, NOT actor $2c (item cache) or $42
 * (already-collected HUD effect). $74 is a victory gate and is excluded. */
export function targets(w:Uint8Array):DkcCollectibleTarget[]{
 const scene=readDkcScene(w);if(!scene.playing)return[];
 const result:DkcCollectibleTarget[]=[];
 for(let slot=6;slot<0x34;slot+=2){
  const id=word(w,DKC.id+slot),state=word(w,DKC.state+slot);
  if(!((id===0x15&&([0,3,4,6,7].includes(state)))||(id===0x34&&([0,1,4,5,6].includes(state))))||word(w,DKC.hit+slot))continue;
  result.push({collectible:true,slot,id,x:word(w,DKC.x+slot),y:word(w,DKC.height)-word(w,DKC.y+slot),width:24,height:28});
 }
 // $C000..CFFF is the native formation index; $D000..FFFF its live bitmap.
 // Native coordinates use 8px cells, bit15 at the top and bit0 at +120px.
 for(let chunk=0;chunk<0x1000;chunk+=16){
  const p=0xc000+chunk,x=word(w,p),y=word(w,p+2),size=word(w,p+4),bitmap=word(w,p+10);
  if(x===0xffff)break;
  if(!size||size>0x42||size%2||bitmap<0xd000||bitmap+size>0x10000||!(word(w,p+8)&w[0xc4]))continue;
  for(let column=0;column<size;column+=2){const bits=word(w,bitmap+column);if(!bits)continue;
   for(let bit=0;bit<16;bit++){if(!(bits&(1<<bit)))continue;
    const nativeX=x+column*4,nativeY=y+(15-bit)*8;
    const worldX=nativeX+word(w,0x1b23);
    if(worldX<scene.cameraX-24||worldX>scene.cameraX+280||nativeY<scene.cameraY-24||nativeY>scene.cameraY+248)continue;
    result.push({collectible:true,slot:0x10000+(bitmap+column)*16+bit,id:0x100,x:worldX+4,y:nativeY+8,width:8,height:8,banana:{chunk,address:bitmap+column,bit,nativeX,nativeY,level:scene.level}});
   }
  }
 }
 const queued=pending.get(w.buffer)??[];
 return result.filter(t=>!queued.some(q=>q.slot===t.slot));
}
/** Request collection, never change an item ID, banana count or life count.
 * Actor token $8002 is consumed by the guarded native collision query; bitmap
 * requests are transferred to private ROM mailbox by hooks.sync before step. */
export function hit(w:Uint8Array,target:Pick<DkcTarget,'slot'|'id'>):boolean{
 const current=targets(w).find(t=>t.slot===target.slot&&t.id===target.id);if(!current)return false;
 if(current.banana){const queue=pending.get(w.buffer)??[];queue.push(current);pending.set(w.buffer,queue);}
 else put(w,DKC.hit+current.slot,0x8002);
 return true;
}
export const dkcCollectibleTargets=targets;
export const hitDkcCollectible=hit;
const COLLISION=0x3ba574,DRAW_CALL=0x38b650,SPACE=0x3bfc80,WRAPPER=0x3bfcf0,MAILBOX=0x3bfde0,TRAMPOLINE=0x387fb6;
const COLLISION_ORIGINAL=[0x85,0xb8,0x20,0x64,0xa5],DRAW_ORIGINAL=[0x22,0xcb,0xb9,0xb8];
/** Exact USA Rev2 BBA574: only bunch/balloon token $8002 returns native carry.
 * Ordinary collisions retain original STA $B8 / JSR A564 and continue A579. */
export const DKC_COLLECTIBLE_COLLISION=new Uint8Array([
 0x48,0xa6,0x82,0xbd,0x45,0x0d,0xc9,0x15,0,0xf0,5,0xc9,0x34,0,0xd0,0x11,
 0xbd,0x95,0x15,0xc9,2,0x80,0xd0,0x09,0x9e,0x95,0x15,0x68,0x20,0x64,0xa5,0x38,0x6b,
 0x68,0x85,0xb8,0x20,0x64,0xa5,0x5c,0x79,0xa5,0xbb,
]);
// Native frame first draws/collects as usual. A private single-cell request
// additionally invokes original formation collector B8:BC5A (RTS) through the
// trampoline (PEA $B653 / JML $B8BC5A; native RTS reaches existing RTL $B8B654).
// Keep PB/DB in B8: F8 lower addresses do not mirror WRAM. Original code
// clears the bitmap, allocates HUD banana,
// plays CollectBanana, and awards the banana when that effect reaches the HUD.
export const DKC_BANANA_COLLECTOR=new Uint8Array([
 0x22,0xcb,0xb9,0xb8,0x08,0xc2,0x30,0xda,0x5a,0x8b,
 0xaf,0xe0,0xfd,0xfb,0xf0,0x45,
 0xa9,0,0,0x8f,0xe0,0xfd,0xfb,
 0xe2,0x20,0xa9,0xb8,0x48,0xab,0xc2,0x20,
 0xa5,0xc5,0x48,0xa5,0xc7,0x48,0xa5,0xc9,0x48,0xa5,0xcb,0x48,
 0xaf,0xe4,0xfd,0xfb,0x85,0xc5,0xaf,0xe6,0xfd,0xfb,0x85,0xc7,
 0xa9,2,0,0x85,0xc9,0x85,0xcb,0xaf,0xe2,0xfd,0xfb,0xaa,
 0x22,0xb6,0x7f,0xf8,
 0xc2,0x30,0x68,0x85,0xcb,0x68,0x85,0xc9,0x68,0x85,0xc7,0x68,0x85,0xc5,
 0xab,0x7a,0xfa,0x28,0x6b,
]);
const match=(h:Uint8Array,p:number,b:readonly number[])=>p>=0&&p+b.length<=h.length&&b.every((v,i)=>h[p+i]===v);
export function locateDkcCollectibleRomBases(heap:Uint8Array):number[]{
 const bases:number[]=[];
 for(let p=heap.indexOf(0x85);p>=0;p=heap.indexOf(0x85,p+1)){
  if(!match(heap,p,COLLISION_ORIGINAL))continue;const base=p-COLLISION;
  if(base<0||base+0x400000>heap.length||!match(heap,base+DRAW_CALL,[...DRAW_ORIGINAL,0x6b])||!match(heap,base+0x38bc5a,[0xbf,0,0xc0,0x7e,0x85,0x56,0xbf,2,0xc0,0x7e,0x85,0x58]))continue;
  if(!heap.subarray(base+SPACE,base+MAILBOX+8).every(v=>v===0)||!heap.subarray(base+TRAMPOLINE,base+TRAMPOLINE+7).every(v=>v===0))continue;
  bases.push(base);
 }return bases;
}
export class DkcCollectibleHooks {
 readonly bases:number[];
 constructor(private heap:Uint8Array){
  this.bases=locateDkcCollectibleRomBases(heap);if(!this.bases.length||this.bases.length>8)throw Error('The DKC collectible routines are incompatible.');
  for(const base of this.bases){heap.set(DKC_COLLECTIBLE_COLLISION,base+SPACE);heap.set(DKC_BANANA_COLLECTOR,base+WRAPPER);heap.set([0xf4,0x53,0xb6,0x5c,0x5a,0xbc,0xb8],base+TRAMPOLINE);heap.set([0x5c,0x80,0xfc,0xfb,0xea],base+COLLISION);heap.set([0x22,0xf0,0xfc,0xfb],base+DRAW_CALL);}
 }
 /** Call immediately before each native frame, after egg collision processing. */
 sync(w:Uint8Array):void{
  const queue=pending.get(w.buffer);if(!queue?.length)return;
  if(!readDkcScene(w).playing){pending.delete(w.buffer);return;}
  // A browser core may keep inactive ROM copies. One consumed mailbox proves
  // the executing copy is ready; inactive copies must not stall later eggs.
  if(this.bases.every(base=>word(this.heap,base+MAILBOX)!==0))return;
  const request=queue.shift()!,b=request.banana!;
  // Revalidate the bitmap: native body collection may have won the same frame.
  const column=b.address-word(w,0xc00a+b.chunk);
  if(b.level!==readDkcScene(w).level||column<0||column>=word(w,0xc004+b.chunk)||word(w,0xc000+b.chunk)+column*4!==b.nativeX||word(w,0xc002+b.chunk)+(15-b.bit)*8!==b.nativeY||!(word(w,b.address)&(1<<b.bit)))return;
  for(const base of this.bases){put(this.heap,base+MAILBOX+2,b.chunk);put(this.heap,base+MAILBOX+4,(b.nativeX-1)&0xffff);put(this.heap,base+MAILBOX+6,(b.nativeY-1)&0xffff);put(this.heap,base+MAILBOX,1);}
 }
 restore():void{for(const base of this.bases){this.heap.set(COLLISION_ORIGINAL,base+COLLISION);this.heap.set(DRAW_ORIGINAL,base+DRAW_CALL);this.heap.fill(0,base+SPACE,base+MAILBOX+8);this.heap.fill(0,base+TRAMPOLINE,base+TRAMPOLINE+7);}}
}
