import{readFileSync}from'node:fs';
import{Buffer}from'node:buffer';
import{describe,expect,it}from'vitest';
import{DkcBossRomHooks,locateDkcBossRomBases,dkcBossMusicDispatch}from'../src/dkc-boss-rom';
const rom=new Uint8Array(readFileSync(new URL('../public/rom/dkc-usa-rev2.sfc',import.meta.url)));
/** Interpret the emitted native instructions instead of testing a second TS
 * copy of its decision. Fail on any opcode outside the tiny verified guard. */
function execute(heap:Uint8Array,base:number,entry:number,slot:number,destination:number,current=22,fallback=12,doorState=0){
 const ram=new Uint8Array(0x20000);ram[0x82]=slot;ram[0x3e]=current&255;ram[0x3f]=current>>8;ram[0x565]=fallback&255;ram[0x566]=fallback>>8;ram[0x1375+slot]=destination&255;ram[0x1376+slot]=destination>>8;
 ram[0x1029+slot]=doorState&255;ram[0x102a+slot]=doorState>>8;
 const initial={a:0xbeef,x:0x1234,y:0xabcd,p:0x31};
 let pc=entry,a=initial.a,x=initial.x,y=initial.y,p=initial.p,zero=false,carry=false;
 const stack:number[]=[],push8=(v:number)=>stack.push(v&255),pop8=()=>stack.pop()!,push16=(v:number)=>{push8(v>>8);push8(v);},pop16=()=>pop8()|pop8()<<8;
 const finish=(result:number|'held')=>{expect({a,x,y,p}).toEqual(initial);expect(stack).toHaveLength(0);return result;};
 const byte=()=>heap[base+pc++],word=()=>byte()|byte()<<8;
 for(let i=0;i<80;i++){
  switch(byte()){
   case 0x22:word();byte();break;
   case 0x08:push8(p);break;case 0xc2:p&=~byte();break;case 0x48:push16(a);break;case 0xda:push16(x);break;case 0x5a:push16(y);break;
   case 0x7a:y=pop16();break;case 0xfa:x=pop16();break;case 0x68:a=pop16();break;case 0x28:p=pop8();break;
   case 0x5c:{const target=word()|byte()<<16;if(target>>>16===0xb6)return finish(target);pc=target&0x3fffff;break;}
   case 0xa6:x=ram[byte()];break;
   case 0xa5:{const at=byte();a=ram[at]|ram[at+1]<<8;zero=a===0;break;}
   case 0xad:{const at=word();a=ram[at]|ram[at+1]<<8;zero=a===0;break;}
   case 0xc9:{const value=word();carry=a>=value;zero=a===value;break;}
   case 0x0a:a=a*2&65535;zero=a===0;break;case 0xaa:x=a;break;
   case 0xbf:{const at=((word()|byte()<<16)&0x3fffff)+x;a=heap[base+at]|heap[base+at+1]<<8;zero=a===0;break;}
   case 0x89:zero=(a&word())===0;break;
   case 0xb0:{const distance=byte();if(carry)pc+=distance;break;}
   case 0xbd:{const address=word()+x;a=ram[address]|ram[address+1]<<8;zero=a===0;break;}
   case 0xaf:{const address=(word()|byte()<<16)&0x3fffff;a=heap[base+address]|heap[base+address+1]<<8;zero=a===0;break;}
   case 0xd0:{const distance=byte();if(!zero)pc+=distance;break;}
   case 0xf0:{const distance=byte();if(zero)pc+=distance;break;}
   case 0x6b:return finish('held');
   default:throw Error('Unexpected guard opcode');
  }
 }
 throw Error('Guard did not return');
}
describe('verified DKC native stage exit gating',()=>{
 it('finds resident ROMs, preserves every original byte after restoration, and can reenable',()=>{
  const heap=new Uint8Array(0x820000);heap.set(rom,0x1000);heap.set(rom,0x411000);const before=heap.slice();
  expect(locateDkcBossRomBases(heap)).toEqual([0x1000,0x411000]);const hooks=new DkcBossRomHooks(heap);hooks.sync(true);
  for(const base of hooks.bases)expect(execute(heap,base,0x3f8398,20,0)).toBe('held');
  hooks.restore();expect(Buffer.compare(heap,before)).toBe(0);hooks.sync(false);expect(execute(heap,0x1000,0x3f8398,20,0)).toBe(0xb6c455);hooks.restore();expect(Buffer.compare(heap,before)).toBe(0);
 });
 it('gates normal and water map returns while preserving native bonus and interior transitions',()=>{
  const heap=rom.slice(),hooks=new DkcBossRomHooks(heap);
  for(const pending of[true,false]){
   hooks.sync(pending);
   for(const[entry,target]of [[0x3f8398,0xb6c455],[0x3f8394,0xb6c3f1]])for(let slot=6;slot<0x34;slot+=2)for(const current of[22,6,0x5c])for(const destination of[0,1,7,12,6,0x5c,0x3e,0xea,0x100]){
    const resolved=destination||12,flags=(entrance:number)=>rom[0x1d102+entrance*2]|rom[0x1d103+entrance*2]<<8;
    const mapExit=destination<256&&(flags(current)&0x0c20)===0&&(flags(resolved)&0x0c20)===0;
    expect(execute(heap,0,entry,slot,destination,current)).toBe(pending&&mapExit?'held':target);
   }
  }
 });
 it('never relocks an entered normal or underwater door, including a resumed native ceremony',()=>{
  const heap=rom.slice(),hooks=new DkcBossRomHooks(heap);hooks.sync(true);
  for(const[entry,target]of [[0x3f8398,0xb6c455],[0x3f8394,0xb6c3f1]])for(let slot=6;slot<0x34;slot+=2)for(const state of[1,2,0x1b,0x1d,0x100]){
   expect(execute(heap,0,entry,slot,12,22,12,state)).toBe(target);
  }
 });
 it('classifies the real Jungle exit destination12 and rejects room and invalid targets',()=>{
  const heap=rom.slice(),hooks=new DkcBossRomHooks(heap),w=new Uint8Array(0x20000),slot=18;
  w[0x3e]=22;w[0xd45+slot]=0x6a;w[0x1375+slot]=12;expect(hooks.isMapExit(w,slot)).toBe(true);
  w[0x1375+slot]=6;expect(hooks.isMapExit(w,slot)).toBe(false);
  w[0x1375+slot]=12;w[0x3e]=6;expect(hooks.isMapExit(w,slot)).toBe(false);
  w[0x3e]=22;w[0x1375+slot]=0;w[0x565]=12;expect(hooks.isMapExit(w,slot)).toBe(true);
  w[0x565]=0;expect(hooks.isMapExit(w,slot)).toBe(false);expect(execute(heap,0,0x3f8398,slot,0,22,0)).toBe(0xb6c455);
  w[0x566]=0xff;expect(hooks.isMapExit(w,slot)).toBe(false);expect(hooks.isMapExit(w,3)).toBe(false);
 });
 it('rejects an unknown ROM or used free region without modifying it',()=>{
  const heap=rom.slice();heap[0x3bf87d]=1;const before=heap.slice();expect(()=>new DkcBossRomHooks(heap)).toThrow('safely located');expect(Buffer.compare(heap,before)).toBe(0);
  expect(locateDkcBossRomBases(new Uint8Array(0x500000))).toEqual([]);
 });
});
/** Execute emitted dispatch bytes with an actual 65816 byte stack. Native
 * verified entry points are modelled as clobbering callees and acknowledgers. */
function dispatch(heap:Uint8Array,initial:{a:number;x:number;y:number;p:number;db:number;d:number},playing:number){
 const ram=new Uint8Array(0x20000);ram[0x51d]=playing;
 const cpu={...initial},stack:number[]=[],calls:number[]=[];let pc=0x3bf880,zero=false;
 const byte=()=>heap[pc++],word=()=>byte()|byte()<<8,push8=(v:number)=>stack.push(v&255),pop8=()=>stack.pop()!,push16=(v:number)=>{push8(v>>8);push8(v);},pop16=()=>pop8()|pop8()<<8;
 for(let i=0;i<100;i++){
  switch(byte()){
   case 0x08:push8(cpu.p);break;case 0xc2:cpu.p&=~byte();break;
   case 0x48:push16(cpu.a);break;case 0xda:push16(cpu.x);break;case 0x5a:push16(cpu.y);break;case 0x8b:push8(cpu.db);break;case 0x0b:push16(cpu.d);break;
   case 0xa9:cpu.a=word();zero=cpu.a===0;break;case 0x5b:cpu.d=cpu.a;break;case 0xf4:push16(word());break;
   case 0xab:cpu.db=pop8();break;case 0xaf:{const at=(word()|byte()<<16)&0x3fffff;cpu.a=heap[at]|heap[at+1]<<8;zero=cpu.a===0;break;}
   case 0xad:{const at=word();cpu.a=ram[at]|ram[at+1]<<8;zero=cpu.a===0;break;}
   case 0xc9:zero=cpu.a===word();break;case 0xf0:{const distance=(byte()<<24)>>24;if(zero)pc+=distance;break;}case 0xd0:{const distance=(byte()<<24)>>24;if(!zero)pc+=distance;break;}case 0x80:{const distance=(byte()<<24)>>24;pc+=distance;break;}
   case 0x22:{const target=word()|byte()<<16;calls.push(target);expect(cpu.d).toBe(0);expect(cpu.db).toBe(0);expect(cpu.p&0x30).toBe(0);
    if(target===0xb990e7){ram[0x51d]=0;ram[0x523]=0;}else if(target===0xb990ce){ram[0x51d]=1;ram[0x523]=cpu.a;}else throw Error('Unverified native call');
    cpu.a=0xaaaa;cpu.x=0xbbbb;cpu.y=0xcccc;cpu.db=0xdd;cpu.d=0xeeee;cpu.p=0;break;
   }
   case 0x2b:cpu.d=pop16();break;case 0x7a:cpu.y=pop16();break;case 0xfa:cpu.x=pop16();break;case 0x68:cpu.a=pop16();break;case 0x28:cpu.p=pop8();break;
   case 0x6b:return{cpu,stack,calls,playing:ram[0x51d],song:ram[0x523]};
   default:throw Error('Unexpected music opcode');
  }
 }
 throw Error('Music dispatch never returned');
}
describe('native DKC music dispatch',()=>{
 it('preserves the full caller ABI, uses native acknowledgement, and resumes the captured song',()=>{
  const heap=rom.slice(),hooks=new DkcBossRomHooks(heap);
  expect(dkcBossMusicDispatch().length).toBeLessThan(0x7c);
  for(const p of[0,0x10,0x20,0x30])for(const command of['stop','resume','none'] as const)for(const playing of[0,1]){
   const before={a:0xbeef,x:0x1234,y:0xabcd,p,db:0x7e,d:0x2340};hooks.music(command,0x13);hooks.sync(true);const result=dispatch(heap,before,playing);
   expect(result.cpu).toEqual(before);expect(result.stack).toHaveLength(0);
   expect(result.calls).toEqual(command==='stop'&&playing?[0xb990e7]:command==='resume'&&!playing?[0xb990ce]:[]);
   expect(result.playing).toBe(command==='stop'?0:command==='resume'?1:playing);
   if(command==='resume'&&!playing)expect(result.song).toBe(0x13);
  }
 });
 it('restores all music code and refuses changed native music commands',()=>{
  const heap=rom.slice(),hooks=new DkcBossRomHooks(heap);hooks.music('stop');hooks.sync(true);hooks.restore();expect(Buffer.compare(heap,rom)).toBe(0);
  heap[0x3990e7]=0;const before=heap.slice();expect(()=>new DkcBossRomHooks(heap)).toThrow('music commands');expect(Buffer.compare(heap,before)).toBe(0);
 });
});
