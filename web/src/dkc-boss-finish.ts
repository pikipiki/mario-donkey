/** USA Rev2 native post-boss boundary. Every original boss, including K.
 * Rool, eventually creates the giant victory banana. Its state zero precedes
 * the native player victory lock. K. Rool's $01AF fake-out runs unchanged;
 * only the real $01B2 defeat command sequence reaches owner $1E0F=5 and
 * CODE_B6D1C5, which creates the banana. No death or unlock is fabricated. */
const BANANA=0x3f836c,SPACE=0x3bfa00,SIZE=0x200,FLAG=SPACE+0x1fe;
const bananaJump=[0x5c,0xec,0xfb,0xb6],bossJump=[0x5c,0x57,0xd9,0xb6];
const match=(h:Uint8Array,p:number,b:readonly number[])=>p>=0&&p+b.length<=h.length&&b.every((v,i)=>h[p+i]===v);
const word=(w:Uint8Array,p:number)=>w[p]|w[p+1]<<8;
export interface DkcBossVictory {slot:number;kind:'banana'|'krool';entrance:number}
export function pendingBossVictory(w:Uint8Array):DkcBossVictory|undefined {
 const entrance=word(w,0x3e);
 for(let slot=6;slot<0x34;slot+=2){
  if((entrance===0x68||(entrance>=0xe0&&entrance<=0xe5))&&word(w,0xd45+slot)===0x74&&word(w,0x1029+slot)===0)return{slot,kind:'banana',entrance};
 }
 return undefined;
}
export function locateDkcBossFinishBases(heap:Uint8Array):number[]{
 const bases:number[]=[];
 for(let p=heap.indexOf(0x5c);p>=0;p=heap.indexOf(0x5c,p+1)){
  if(!match(heap,p,bananaJump)||!match(heap,p+16,bossJump))continue;
  const base=p-BANANA;
  if(base<0||base+0x400000>heap.length)continue;
  if(!match(heap,base+0x36fbec,[0xa4,0x82,0xb9,0x29,0x10,0x0a,0xaa,0x7c,0xf6,0xfb,0xfe,0xfb,0x0d,0xfc,0x2d,0xfc,0x38,0xfc,0xa6,0x82,0xfe,0x29,0x10,0x9e,0x75,0x13,0xa9,1,0,0x8d,0x2b,0x1e,0x6b]))continue;
  if(!match(heap,base+0x36d957,[0xa4,0x82,0xb9,0x29,0x10,0x0a,0xaa,0x7c,0x61,0xd9])||!match(heap,base+0x36eb58,[0xa9,2,0,0x99,0x2d,0x15,0x22,0xba,0xfc,0xb6,0x5c,0xe1,0x80,0xbe]))continue;
  // Exact final command script: actual dead animation then $13, not fake KO.
  if(!match(heap,base+0x36edca,[0x0d,0x13,3,0,0x89,0x0e,0x80,7,0xd1,0x10,0xb2,1,0,0,0x60,2,0x0d,0x13,0x13,0]))continue;
  if(!heap.subarray(base+SPACE,base+SPACE+SIZE).every(v=>v===0))continue;
  bases.push(base);
 }
 return bases;
}
export function dkcBossFinishGuard():Uint8Array {
 const b:number[]=[],labels=new Map<string,number>(),branches:{at:number;to:string}[]=[];
 const emit=(...v:number[])=>b.push(...v),branch=(op:number,to:string)=>{emit(op,0);branches.push({at:b.length-1,to});};
 emit(0x22,0x80,0xf8,0xfb); // Existing independently verified music dispatcher.
 emit(0x08,0xc2,0x30,0x48,0xda,0x5a,0x8b,0x0b); // P, full A/X/Y, DB, DP.
 emit(0xa9,0,0,0x5b,0xf4,0,0,0xab,0xab); // Absolute native WRAM bank/DP zero.
 emit(0xaf,0xfe,0xfb,0xfb);branch(0xf0,'pass');
 emit(0xa6,0x82,0xbd,0x29,0x10);
 branch(0xd0,'pass');emit(0xa5,0x3e,0xc9,0x68,0);branch(0xf0,'hold');emit(0xc9,0xe0,0);branch(0x90,'pass');emit(0xc9,0xe6,0);branch(0xb0,'pass');
 labels.set('hold',b.length);
 const restore=()=>emit(0x2b,0xab,0x7a,0xfa,0x68,0x28);
 restore();emit(0x6b);labels.set('pass',b.length);restore();emit(0x5c,...bananaJump.slice(1));
 for(const branch of branches){const distance=labels.get(branch.to)!-branch.at-1;if(distance>127)throw Error('Boss finish branch exceeds signed byte');b[branch.at]=distance;}
 if(b.length>0x100)throw Error('Boss finish guard exceeds verified space');
 return new Uint8Array(b);
}
/** Install after DkcBossRomHooks (which owns native music dispatcher FBF880).
 * Default hold=true prevents losing the first frame between native defeat and
 * the JS guardian update. sync(false) releases the untouched original ceremony;
 * nonzero banana states always pass, including resumed native victory saves. */
export class DkcBossFinishHooks {
 readonly bases:number[];private originals=new Map<number,Uint8Array>();
 constructor(private heap:Uint8Array){
  this.bases=locateDkcBossFinishBases(heap);
  if(this.bases.length===0||this.bases.length>8)throw Error('The DKC boss victory routines could not be safely located.');
  for(const base of this.bases){
   if(!match(heap,base+0x3bf880,[0x08,0xc2,0x30,0x48,0xda,0x5a,0x8b,0x0b]))throw Error('Install the native DKC boss music hooks before the victory hooks.');
  }
  for(const base of this.bases)for(const[offset,length]of[[BANANA,4],[SPACE,SIZE]])this.originals.set(base+offset,heap.slice(base+offset,base+offset+length));
  this.sync(true);
 }
 sync(hold:boolean):void{for(const base of this.bases){
  this.heap.set(dkcBossFinishGuard(),base+SPACE);
  this.heap.set([0x5c,0,0xfa,0xfb],base+BANANA);
  this.heap[base+FLAG]=Number(hold);this.heap[base+FLAG+1]=0;
 }}
 restore():void{for(const[at,bytes]of this.originals)this.heap.set(bytes,at);}
}
