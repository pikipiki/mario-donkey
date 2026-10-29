import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {NativeBossEggs,NativeEggFlights,nativeEggRefillProgram} from '../src/boss-eggs';
import {PROFILE as P,word,writeWord} from '../src/profile';
const rom=()=>new Uint8Array(readFileSync(new URL('../public/rom/yoshi-eu.sfc',import.meta.url)));
function egg(g:Uint8Array,slot:number,x:number,y:number,kind=0x25,chain=0,collision=0x20){const o=slot*4;writeWord(g,P.spriteState+o,0x10);writeWord(g,P.spriteId+o,kind);writeWord(g,P.spriteX+o,x);writeWord(g,P.spriteY+o,y);writeWord(g,0x19d8+o,chain);writeWord(g,0x1d38+o,collision);}
describe('native boss egg factory',()=>{
 it('installs only verified EU code and restores the entire ROM exactly',()=>{
  const bytes=rom(),original=bytes.slice(),factory=new NativeBossEggs(bytes,0x27aeb);
  factory.sync(true);expect([...bytes.slice(0x265,0x269)]).toEqual([0x5c,0,0xff,3]);expect(bytes.slice(0x1ff00,0x1ff00+nativeEggRefillProgram().length)).toEqual(nativeEggRefillProgram());
  factory.sync(true);factory.sync(false);expect(Buffer.compare(bytes,original)).toBe(0);
 });
 it('refuses mismatched factories or an occupied code region without mutating data',()=>{
  for(const offset of [0x265,0x1a364,0x1beb9,0x27aeb,0x1ff00]){const bytes=rom();bytes[offset]^=1;const before=bytes.slice();expect(()=>new NativeBossEggs(bytes,0x27aeb)).toThrow();expect(Buffer.compare(bytes,before)).toBe(0);}
 });
});
describe('real aimed egg collisions',()=>{
 const box={left:140,top:80,right:160,bottom:120};
 it('never counts trailing, held, grounded, giant or unrelated sprites as thrown eggs',()=>{
  const g=new Uint8Array(0x8000),flights=new NativeEggFlights();
  egg(g,6,150,100,0x25,2);egg(g,7,150,100,0x25,0xffff);egg(g,8,150,100,0x25,0,0);egg(g,9,150,100,0x26);egg(g,10,150,100,0x1e);
  expect(flights.collide(g,box)).toBe(0);expect(word(g,P.spriteState+24)).toBe(0x10);
 });
 it('uses actual native trajectories, catches fast crossings and consumes each egg once',()=>{
  const g=new Uint8Array(0x8000),flights=new NativeEggFlights();egg(g,6,100,100);expect(flights.collide(g,box)).toBe(0);writeWord(g,P.spriteX+24,190);
  expect(flights.collide(g,box)).toBe(1);expect(word(g,P.spriteState+24)).toBe(0);expect(flights.collide(g,box)).toBe(0);
 });
 it('continues tracking the native collision countdown after the launch frame',()=>{
  for(const countdown of[0x20,0x1f,0x0b,1]){const g=new Uint8Array(0x8000),flights=new NativeEggFlights();egg(g,6,150,100,0x25,0,countdown);expect(flights.collide(g,box)).toBe(1);}
 });
 it('keeps the real inventory references untouched and protects all unrelated sprites',()=>{
  const g=new Uint8Array(0x8000),flights=new NativeEggFlights();writeWord(g,0x1df6,4);writeWord(g,0x1df8,28);writeWord(g,0x1dfa,32);egg(g,6,150,100);egg(g,7,70,100,0x25,2);egg(g,8,60,100,0x25,4);
  expect(flights.collide(g,box)).toBe(1);expect([...g.slice(0x1df6,0x1dfc)]).toEqual([4,0,28,0,32,0]);expect(word(g,P.spriteState+28)).toBe(0x10);expect(word(g,P.spriteState+32)).toBe(0x10);
 });
 it('does not sweep a newly recycled slot across the arena',()=>{
  const g=new Uint8Array(0x8000),flights=new NativeEggFlights();egg(g,6,0,100);flights.collide(g,box);egg(g,6,300,100);expect(flights.collide(g,box)).toBe(0);
  flights.reset();expect(flights.collide(g,box)).toBe(0);
 });
});

/** Execute the emitted 65816 instructions, including stack widths and actual
 * branch offsets. Native calls are bounded ABI doubles; their target bytes are
 * independently checked against the real EU ROM by NativeBossEggs. */
function executeFactory(overrides:Record<number,number>={},allocation=true){
 const code=nativeEggRefillProgram(),memory=new Map<number,number>(),writes:number[]=[],calls:number[]=[];
 let pc=0,a=0x1234,x=0x42,y=0x53,db=0x7e,d=0x123,s=0x1ed,p=0x35;
 const initial={a,x,y,db,d,s,p};
 const byte=(address:number)=>memory.get(address)??0;
 const get=(address:number,width=2)=>byte(address)|(width===2?byte(address+1)<<8:0);
 const put=(address:number,value:number,width=2)=>{memory.set(address,value&255);if(width===2)memory.set(address+1,value>>>8&255);writes.push(address);};
 const aw=()=>p&0x20?1:2,iw=()=>p&0x10?1:2;
 const nz=(value:number,width:number)=>{p=(p&~0x82)|(value===0?2:0)|(value&(width===1?0x80:0x8000)?0x80:0);};
 const read=()=>code[pc++],imm=(width=2)=>read()|(width===2?read()<<8:0);
 const abs=(address:number)=>address>=0x6000&&address<0x8000?0x700000+address-0x6000:address<0x2000?0x7e0000+address:db*0x10000+address;
 const push=(value:number,width:number)=>{if(width===2){put(s--,value>>>8,1);}put(s--,value,1);};
 const pop=(width:number)=>{const lo=byte(++s);return lo|(width===2?byte(++s)<<8:0);};
 const setA=(value:number)=>{a=aw()===1?(a&0xff00)|(value&255):value&65535;nz(a&(aw()===1?255:65535),aw());};
 put(0x7e0118,0x13);put(0x7001b2,0x8000);put(0x70008c,100);put(0x700090,200);
 const scratch=Array.from({length:24},(_,i)=>(i*13+7)&255);scratch.forEach((v,i)=>put(0x701960+i,v,1));
 for(const [addr,value]of Object.entries(overrides))put(Number(addr),value);
 const originalScratch=scratch.slice();writes.length=0;
 for(let steps=0;steps<500;steps++){
  const op=read();
  if(op===0x08)push(p,1);
  else if(op===0xc2){p&=~read();}
  else if(op===0xe2){p|=read();if(p&0x10){x&=255;y&=255;}}
  else if(op===0x48)push(a,aw());
  else if(op===0xda)push(x,iw());
  else if(op===0x5a)push(y,iw());
  else if(op===0x8b)push(db,1);
  else if(op===0x0b)push(d,2);
  else if(op===0x4b)push(3,1);
  else if(op===0xab){db=pop(1);nz(db,1);}
  else if(op===0xf4)push(imm(),2);
  else if(op===0x2b){d=pop(2);nz(d,2);}
  else if(op===0xa2){x=imm(iw());nz(x,iw());}
  else if(op===0xbd){setA(get(abs((imm()+x)&65535),aw()));}
  else if(op===0xca){x=(x-1)&(iw()===1?255:65535);nz(x,iw());}
  else if(op===0xe8){x=(x+1)&(iw()===1?255:65535);nz(x,iw());}
  else if(op===0xaf){const address=imm()|read()<<16;setA(get(address,aw()));}
  else if(op===0xad)setA(get(abs(imm()),aw()));
  else if(op===0x29)setA(a&imm(aw()));
  else if(op===0x0d)setA(a|get(abs(imm()),aw()));
  else if(op===0xc9||op===0xe0){const width=op===0xc9?aw():iw(),value=imm(width),left=op===0xc9?a:x;p=(p&~1)|(left>=value?1:0);nz((left-value)&(width===1?255:65535),width);}
  else if([0x10,0xd0,0xb0,0x90].includes(op)){
   const offset=(read()<<24)>>24;if(op===0x10?!(p&128):op===0xd0?!(p&2):op===0xb0?Boolean(p&1):!(p&1))pc+=offset;
  }else if(op===0xa9)setA(imm(aw()));
  else if(op===0x22){
   const target=imm()|read()<<16;calls.push(target);
   expect(iw()).toBe(1);expect(aw()).toBe(2);expect(d).toBe(0x7960);expect(db).toBe(3);
   if(target===0x03a364){expect(a).toBe(0x25);p=(p&~1)|(allocation?1:0);y=24;}
   else{expect(target).toBe(0x03beb9);expect(x).toBe(24);expect(get(abs(d+0x12))).toBe(24);expect(get(0x7010e2+24)).toBe(100);expect(get(0x701182+24)).toBe(216);put(0x701960,0xbeef);a=0xdead;y=12;x=40;}
  }else if(op===0xbb){x=y;nz(x,iw());}
  else if(op===0x9d)put(abs((imm()+x)&65535),a,aw());
  else if(op===0x18)p&=~1;
  else if(op===0x69){const value=imm(aw()),result=a+value+(p&1);p=(p&~1)|(result>65535?1:0);setA(result);}
  else if(op===0x8a)setA(x);
  else if(op===0x85)put(abs((d+read())&65535),a,aw());
  else if(op===0x68)setA(pop(aw()));
  else if(op===0x7a){y=pop(iw());nz(y,iw());}
  else if(op===0xfa){x=pop(iw());nz(x,iw());}
  else if(op===0x28)p=pop(1);
  else if(op===0x5c){expect(imm()|read()<<16).toBe(0x008269);return{a,x,y,db,d,s,p,initial,calls,memory,writes,originalScratch};}
  else throw Error('Unexpected factory opcode '+op.toString(16));
 }
 throw Error('Factory never returned');
}
describe('emitted 65816 factory ABI',()=>{
 it.each([
  ['map',{[0x7e0118]:0x26}],['victory',{[0x7e0118]:0x14}],['Baby lost',{[0x7001b2]:0}],['aiming',{[0x7000de]:1}],['transforming',{[0x7000ae]:1}],['dialogue',{[0x7e0d11]:9}],['locked player',{[0x7001ae]:1}],['locked sprites',{[0x7001b0]:1}],['scripted state',{[0x7000ac]:0x14}],['full inventory',{[0x701df6]:12}],
 ] as const)('returns without allocation during %s',(_name,overrides)=>{const result=executeFactory(overrides);expect(result.calls).toEqual([]);expect(result.a).toBe(result.initial.a);expect(result.db).toBe(result.initial.db);expect(result.d).toBe(result.initial.d);expect(result.s).toBe(result.initial.s);expect(result.y).toBe(result.initial.y);expect(result.x).toBe(8);});
 it('calls the real allocator and attach helper with the correct native DP, slot and position, then restores its caller',()=>{
  const r=executeFactory();expect(r.calls).toEqual([0x03a364,0x03beb9]);expect(r.a).toBe(r.initial.a);expect(r.y).toBe(r.initial.y);expect(r.db).toBe(r.initial.db);expect(r.d).toBe(r.initial.d);expect(r.s).toBe(r.initial.s);expect(r.p).toBe(r.initial.p&~0xa2);
  expect(Array.from({length:24},(_,i)=>r.memory.get(0x701960+i))).toEqual(r.originalScratch);expect(r.writes).not.toContain(0x701df6);
 });
 it('leaves a full sprite table untouched rather than stealing a slot or fabricating inventory',()=>{const r=executeFactory({},false);expect(r.calls).toEqual([0x03a364]);expect(r.writes).not.toContain(0x701df6);expect(r.s).toBe(r.initial.s);});
});
