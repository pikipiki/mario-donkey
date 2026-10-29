import {PROFILE as P,freeSpriteGraphics,signed16,word} from './profile';
const DRAW_OFFSET=0x27aeb,ENTRY=0x265,STUB=0x1ff00;
const ENTRY_BYTES=[0xc2,0x20,0xa2,0x08];
/** EU-only native egg factory. Keep the original allocation, palette, inventory
 * links and trailing/aiming sprites; the bridge never invents an ammo count. */
export function nativeEggRefillProgram():Uint8Array{
 const code:number[]=[],labels=new Map<string,number>(),branches:{at:number;label:string}[]=[];
 const emit=(...bytes:number[])=>code.push(...bytes),label=(name:string)=>labels.set(name,code.length),branch=(op:number,name:string)=>{emit(op,0);branches.push({at:code.length-1,label:name});};
 // Save full registers and the native sprite scratch words $7960..$7976.
 // Sprite helpers use DP=$7960; their $12 slot lives at $7972, not WRAM $12.
 emit(0x08,0xc2,0x30,0x48,0xda,0x5a,0x8b,0x0b,0x4b,0xab,0xf4,0x60,0x79,0x2b,0xa2,0x16,0);
 label('save');emit(0xbd,0x60,0x79,0x48,0xca,0xca);branch(0x10,'save');
 emit(0xaf,0x18,1,0x7e,0x29,0xff,0,0xc9,0x13,0);branch(0xd0,'restore');
 emit(0xad,0xb2,0x61);branch(0x10,'restore'); // Baby must be mounted.
 emit(0xad,0xac,0x60,0x0d,0xae,0x60,0x0d,0xae,0x61,0x0d,0xb0,0x61,0x0d,0xde,0x60,0x0d,0x11,0x0d);branch(0xd0,'restore');
 emit(0xad,0xf6,0x7d,0xc9,0x0c,0);branch(0xb0,'restore');
 // Native active-sprite allocator: A=green egg, Y=new real sprite slot.
 emit(0xe2,0x10,0xa9,0x25,0,0x22,0x64,0xa3,3);branch(0x90,'restore');
 emit(0xbb,0xad,0x8c,0x60,0x9d,0xe2,0x70,0xad,0x90,0x60,0x18,0x69,0x10,0,0x9d,0x82,0x71);
 // $12 is a complete word even though the helper's index registers are 8 bit.
 emit(0x8a,0x29,0xff,0,0x85,0x12,0x22,0xb9,0xbe,3);
 label('restore');emit(0xc2,0x30,0xa2,0,0);
 label('pull');emit(0x68,0x9d,0x60,0x79,0xe8,0xe8,0xe0,0x18,0);branch(0x90,'pull');
 emit(0x2b,0xab,0x7a,0xfa,0x68,0x28,...ENTRY_BYTES,0x5c,0x69,0x82,0);
 for(const fix of branches){const delta=labels.get(fix.label)!-(fix.at+1);if(delta< -128||delta>127)throw Error('Egg factory branch out of range');code[fix.at]=delta&255;}
 return new Uint8Array(code);
}
export class NativeBossEggs {
 private base:number;private enabled=false;private program=nativeEggRefillProgram();private originalStub:Uint8Array;
 constructor(private heap:Uint8Array,liveDrawSite:number){
  this.base=liveDrawSite-DRAW_OFFSET;
  const checks:[number,number[]][]=[
   [ENTRY,[...ENTRY_BYTES,0xa9,0xd8,0xb1,0x22,0x62,0xe2,0x7e,0xe2,0x20,0x6b]],
   [0x1a364,[0xa0,0x5c,0x48,0xb9,0,0x6f,0xf0,0x0e,0x88,0x88,0x88,0x88,0xc0,0x18]],
   [0x1beb9,[0x22,0x57,0xf9,0x0c,0xa9,3,0,0x22,0xde,0x85,0,0xad,0xf6,0x7d]],
   [0x27aeb,[0xad,0x1a,0x61]],
  ];
  if(this.base<0||this.program.length>256||checks.some(([offset,bytes])=>bytes.some((byte,i)=>heap[this.base+offset+i]!==byte)))throw Error('The native boss egg factory does not match this ROM.');
  this.originalStub=heap.slice(this.base+STUB,this.base+STUB+this.program.length);
  if(this.originalStub.length!==this.program.length||this.originalStub.some(byte=>byte!==0xff))throw Error('The native egg factory code area is not free.');
 }
 sync(enabled:boolean):void{
  if(enabled===this.enabled)return;
  this.enabled=enabled;
  if(enabled){this.heap.set(this.program,this.base+STUB);this.heap.set([0x5c,0,0xff,3],this.base+ENTRY);}
  else this.restore();
 }
 restore():void{this.heap.set(ENTRY_BYTES,this.base+ENTRY);this.heap.set(this.originalStub,this.base+STUB);this.enabled=false;}
}
export interface EggTargetBox{left:number;top:number;right:number;bottom:number}
interface Flight{x:number;y:number;id:number}
function intersects(a:Flight,b:Flight,box:EggTargetBox):boolean{
 let lo=0,hi=1;
 for(const [p,d,min,max]of [[a.x,b.x-a.x,box.left-5,box.right+5],[a.y,b.y-a.y,box.top-7,box.bottom+7]]){
  if(Math.abs(d)<1e-9){if(p<min||p>max)return false;continue;}
  const x=(min-p)/d,y=(max-p)/d;lo=Math.max(lo,Math.min(x,y));hi=Math.min(hi,Math.max(x,y));if(lo>hi)return false;
 }
 return true;
}
/** Watch only real, launched native eggs. Following and aiming eggs never hit.
 * A consumed airborne egg has already left the native inventory, so releasing
 * its verified graphics allocation cannot break the trailing linked list. */
export class NativeEggFlights {
 private previous=new Map<number,Flight>();
 reset():void{this.previous.clear();}
 collide(g:Uint8Array,box:EggTargetBox):number{
  const next=new Map<number,Flight>();let hits=0;
  for(let slot=6;slot<24;slot++){
   const o=slot*4,id=word(g,P.spriteId+o);
   if(word(g,P.spriteState+o)!==0x10||id<0x22||id>0x25||word(g,0x19d8+o)!==0||word(g,0x1d38+o)===0||word(g,0x1d38+o)>0x20)continue;
   const flight={x:word(g,P.spriteX+o),y:word(g,P.spriteY+o),id},prior=this.previous.get(slot);
   const before=prior?.id===id&&Math.abs(signed16(flight.x-prior.x))<96&&Math.abs(signed16(flight.y-prior.y))<96?prior:flight;
   if(intersects(before,flight,box)){freeSpriteGraphics(g,slot);hits++;}else next.set(slot,flight);
  }
  this.previous=next;return hits;
 }
}
