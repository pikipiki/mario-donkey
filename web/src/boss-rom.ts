import {word,writeWord} from './profile';
export type BossExitKind='goal'|'key'|'mini'|'final';
const DRAW_OFFSET=0x27aeb;
const SITES={goal:0x12617,keyInit:0x159c3,keyMain:0x15a19,explosion:0x15f85,explosionGuard:0x17ff0,finalPointer:0x6c5a9} as const;
/** These are verified EU ROM offsets, derived from the native sprite tables.
 * Returning from a routine keeps the live sprite, graphics allocation and
 * native completion data intact. No invented sprite state or victory flag. */
export class BossRomHooks {
 private base:number;private originals=new Map<number,Uint8Array>();
 constructor(private heap:Uint8Array,liveDrawSite:number){
  this.base=liveDrawSite-DRAW_OFFSET;
  for(const [offset,expected]of [[0x27aeb,[0xad,0x1a,0x61]], [SITES.goal,[0xad,0x11,0x0d,0xd0,0x52]], [SITES.keyInit,[0xad,0xb2,0x61,0x10,6]], [SITES.keyMain,[0x22,0x52,0xaa,3]], [SITES.explosion,[0xad,0x02,0x74,0xc9,0x32]], [SITES.explosionGuard,Array(12).fill(0xff)], [SITES.finalPointer,[0x73,0xd6]]] as const){
   if(this.base<0||!expected.every((b,i)=>heap[this.base+offset+i]===b))throw new Error('This ROM cannot safely install the stage bosses. Your save has been kept.');
  }
  if(heap[this.base+0x6d672]!==0x60||word(heap,this.base+0x6c59b)!==0xd673)throw new Error('The final-boss exit hook is incompatible.');
  for(const offset of [SITES.goal,SITES.keyInit,SITES.keyMain])this.originals.set(offset,heap.slice(this.base+offset,this.base+offset+1));
  this.originals.set(SITES.explosion,heap.slice(this.base+SITES.explosion,this.base+SITES.explosion+3));
  this.originals.set(SITES.explosionGuard,heap.slice(this.base+SITES.explosionGuard,this.base+SITES.explosionGuard+12));
  this.originals.set(SITES.finalPointer,heap.slice(this.base+SITES.finalPointer,this.base+SITES.finalPointer+2));
  this.sync();
 }
 sync(kind?:BossExitKind,phase?:string):void{
  const released=phase==='released';
  this.patch(SITES.goal,released||(kind==='goal'&&phase==='exit')?undefined:new Uint8Array([0x6b]));
  this.patch(SITES.keyInit,released?undefined:new Uint8Array([0x6b]));
  this.patch(SITES.keyMain,released?undefined:new Uint8Array([0x6b]));
  // Gate the no-key branch before its first window/palette effect. Key-bearing
  // explosions execute their exact original first instruction and remainder.
  this.patch(SITES.explosionGuard,released?undefined:new Uint8Array([0xbd,0x00,0x79,0xd0,0x01,0x6b,0xad,0x02,0x74,0x4c,0x88,0xdf]));
  this.patch(SITES.explosion,released?undefined:new Uint8Array([0x4c,0xf0,0xff]));
  this.patch(SITES.finalPointer,released?undefined:new Uint8Array([0x72,0xd6]));
 }
 restore():void{for(const [offset,bytes]of this.originals)this.heap.set(bytes,this.base+offset);}
 private patch(offset:number,bytes?:Uint8Array):void{this.heap.set(bytes??this.originals.get(offset)!,this.base+offset);}
}
