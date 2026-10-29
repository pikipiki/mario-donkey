/** DKC USA Rev2 native exit doors. Resolve the actual destination and use the
 * original entrance flags to distinguish map exits from room transitions.
 * Both routines are reached by existing four-byte JML trampolines, so their
 * prologues and all collision/animation/progression code remain intact. */
const NORMAL=0x3f8398,WATER=0x3f8394,SPACE=0x3bf800,SIZE=0x200,FLAG=SPACE+0x7e,MUSIC=SPACE+0x80,SONG=SPACE+0x1fc,REQUEST=SPACE+0x1fe;
const NORMAL_BYTES=[0x5c,0x55,0xc4,0xb6],WATER_BYTES=[0x5c,0xf1,0xc3,0xb6];
function match(heap:Uint8Array,at:number,bytes:readonly number[]):boolean{return at>=0&&at+bytes.length<=heap.length&&bytes.every((v,i)=>heap[at+i]===v);}
/** Full-copy anchors reject coincidental sprite/data bytes in live RAM. Every
 * verified resident ROM copy is patched; emulator heaps may retain several. */
export function locateDkcBossRomBases(heap:Uint8Array):number[]{
 const bases:number[]=[];
 for(let p=heap.indexOf(0x5c);p>=0;p=heap.indexOf(0x5c,p+1)){
  if(!match(heap,p,[...WATER_BYTES,...NORMAL_BYTES,0x5c,0x04,0xc3,0xb6]))continue;
  const base=p-WATER;
  if(base<0||base+0x400000>heap.length||!match(heap,base+0x36c455,[0xa6,0x82,0xbd,0x29,0x10,0xf0,0x30])||!match(heap,base+0x36c3f1,[0xa6,0x82,0xbd,0x29,0x10,0xf0,0x23]))continue;
  if(!heap.subarray(base+SPACE,base+SPACE+SIZE).every(v=>v===0))continue;
  bases.push(base);
 }
 return bases;
}
function stub(target:number):Uint8Array{
 const bytes:number[]=[],labels=new Map<string,number>(),branches:{at:number;label:string}[]=[];
 const emit=(...values:number[])=>bytes.push(...values),label=(name:string)=>labels.set(name,bytes.length);
 const branch=(opcode:number,to:string)=>{emit(opcode,0);branches.push({at:bytes.length-1,label:to});};
 emit(0x22,0x80,0xf8,0xfb); // Existing native music dispatcher preserves the ABI.
 emit(0x08,0xc2,0x30,0x48,0xda,0x5a); // Preserve actor iteration registers and flags.
 // Pending guardians also hold an already-entered map door. Native actor
 // state is not proof that the added fight was won (including old saves).
 // Once released, the original routine owns the entire native ceremony.
 emit(0xaf,0x7e,0xf8,0xfb);branch(0xf0,'pass');
 emit(0xa5,0x3e,0xc9,0,1);branch(0xb0,'pass');emit(0x0a,0xaa,0xbf,2,0xd1,0x81,0x89,0x20,0x0c);branch(0xd0,'pass');
 emit(0xa6,0x82,0xbd,0x75,0x13);branch(0xd0,'destination');emit(0xad,0x65,5);
 label('destination');branch(0xf0,'pass');emit(0xc9,0,1);branch(0xb0,'pass');emit(0x0a,0xaa,0xbf,2,0xd1,0x81,0x89,0x20,0x0c);branch(0xd0,'pass');emit(0x7a,0xfa,0x68,0x28,0x6b);
 label('pass');emit(0x7a,0xfa,0x68,0x28,0x5c,target&255,target>>8&255,target>>16);
 for(const b of branches)bytes[b.at]=(labels.get(b.label)!-b.at-1)&255;
 if(bytes.length>0x7e)throw Error('DKC exit guard exceeds its verified free block');
 return new Uint8Array(bytes);
}
/** Run at the native door update. $051D is the game's music-playing boolean,
 * used as acknowledgement; no guessed spare WRAM flag or repeated APU command.
 * Preserve caller A/X/Y/P/DB/DP, execute original stop/restart entry points. */
export function dkcBossMusicDispatch():Uint8Array{
 const bytes:number[]=[],labels=new Map<string,number>(),branches:{at:number;label:string}[]=[];
 const emit=(...values:number[])=>bytes.push(...values),label=(name:string)=>labels.set(name,bytes.length);
 const branch=(opcode:number,to:string)=>{emit(opcode,0);branches.push({at:bytes.length-1,label:to});};
 emit(0x08,0xc2,0x30,0x48,0xda,0x5a,0x8b,0x0b,0xa9,0,0,0x5b,0xf4,0,0,0xab,0xab);
 emit(0xaf,0xfe,0xf9,0xfb,0xc9,1,0);branch(0xf0,'stop');emit(0xc9,2,0);branch(0xd0,'done');
 emit(0xad,0x1d,5);branch(0xd0,'done');emit(0xaf,0xfc,0xf9,0xfb,0x22,0xce,0x90,0xb9);branch(0x80,'done');
 label('stop');emit(0xad,0x1d,5);branch(0xf0,'done');emit(0x22,0xe7,0x90,0xb9);
 label('done');emit(0x2b,0xab,0x7a,0xfa,0x68,0x28,0x6b);
 for(const b of branches)bytes[b.at]=(labels.get(b.label)!-b.at-1)&255;
 return new Uint8Array(bytes);
}
export class DkcBossRomHooks {
 readonly bases:number[];private musicRequest=0;private musicSong=0;private originals=new Map<number,Uint8Array>();
 constructor(private heap:Uint8Array){
  this.bases=locateDkcBossRomBases(heap);
  if(this.bases.length===0||this.bases.length>8)throw Error('The DKC exit routines could not be safely located. Your save is kept.');
  for(const base of this.bases)for(const[offset,length]of [[NORMAL,4],[WATER,4],[SPACE,SIZE]])this.originals.set(base+offset,heap.slice(base+offset,base+offset+length));
  for(const base of this.bases){
   if(!match(heap,base+0x3990e7,[0x9c,0x23,5,0xad,0x1d,5,0xf0,0x10,0x9c,0x1d,5,0xea,0xea,0xe2,0x20,0xa2,0xff,0,0x22,0xaf,0xb1,0x8a,0xc2,0x20,0x6b])||!match(heap,base+0x3990ce,[0x8d,0x23,5,0x22,0xcb,0xb1,0x8a,0xa9,1,0,0x8d,0x1d,5,0xe2,0x20,0xa2,0xfe,0,0x22,0xaf,0xb1,0x8a,0xc2,0x30,0x6b]))throw Error('The DKC native music commands are incompatible.');
  }
  this.sync(false);
 }
 /** Same current-room and resolved-destination flags as the native map return. */
 isMapExit(w:Uint8Array,slot:number):boolean{
  const word=(bytes:Uint8Array,at:number)=>bytes[at]|bytes[at+1]<<8;
  if(!Number.isInteger(slot)||slot<6||slot>=0x34||slot%2||![0x6a,0x6b].includes(word(w,0xd45+slot)))return false;
  const current=word(w,0x3e),destination=word(w,0x1375+slot)||word(w,0x565);
  if(current<1||current>255||destination<1||destination>255)return false;
  const base=this.bases[0];
  return (word(this.heap,base+0x1d102+current*2)&0x0c20)===0&&(word(this.heap,base+0x1d102+destination*2)&0x0c20)===0;
 }
 music(command:'stop'|'resume'|'none',song=0):void{
  this.musicRequest=command==='stop'?1:command==='resume'?2:0;
  this.musicSong=Number.isInteger(song)&&song>=0&&song<=0x1a?song:0;
  for(const base of this.bases){this.heap[base+REQUEST]=this.musicRequest;this.heap[base+REQUEST+1]=0;this.heap[base+SONG]=this.musicSong;this.heap[base+SONG+1]=0;}
 }
 sync(pending:boolean):void{
  for(const base of this.bases){
   this.heap.set(dkcBossMusicDispatch(),base+MUSIC);
   this.heap.set(stub(0xb6c455),base+SPACE);this.heap.set(stub(0xb6c3f1),base+SPACE+0x100);
   this.heap.set([0x5c,0x00,0xf8,0xfb],base+NORMAL);this.heap.set([0x5c,0x00,0xf9,0xfb],base+WATER);
   this.heap[base+FLAG]=Number(pending);this.heap[base+FLAG+1]=0;
  }
  this.music(this.musicRequest===1?'stop':this.musicRequest===2?'resume':'none',this.musicSong);
 }
 restore():void{for(const[at,bytes]of this.originals)this.heap.set(bytes,at);}
}
