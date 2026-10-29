import{readFileSync}from'node:fs';
import{Buffer}from'node:buffer';
import{describe,expect,it}from'vitest';
import{DkcBossRomHooks}from'../src/dkc-boss-rom';
import{DkcBossFinishHooks,pendingBossVictory,dkcBossFinishGuard}from'../src/dkc-boss-finish';
const rom=new Uint8Array(readFileSync(new URL('../public/rom/dkc-usa-rev2.sfc',import.meta.url)));
const put=(w:Uint8Array,p:number,v:number)=>{w[p]=v&255;w[p+1]=v>>8;};
function execute(heap:Uint8Array,kind:'banana'|'krool',entrance:number,state:number,substate:number,p=0x30){
 const ram=new Uint8Array(0x20000),slot=0x10;put(ram,0x82,slot);put(ram,0x3e,entrance);put(ram,0x1029+slot,state);put(ram,0x152d+slot,substate);
 const initial={a:0xbeef,x:0x1234,y:0xabcd,p,db:0x7e,d:0x2340},cpu={...initial};
 let pc=kind==='banana'?0x3f836c:0x3f837c,zero=false,carry=false,musicCalls=0;
 const stack:number[]=[],push8=(v:number)=>stack.push(v&255),pop8=()=>stack.pop()!,push16=(v:number)=>{push8(v>>8);push8(v);},pop16=()=>pop8()|pop8()<<8;
 const byte=()=>heap[pc++],word=()=>byte()|byte()<<8,finish=(result:number|'held')=>{expect(cpu).toEqual(initial);expect(stack).toHaveLength(0);expect(musicCalls).toBe(kind==='banana'?1:0);return result;};
 for(let i=0;i<100;i++)switch(byte()){
  case 0x22:expect(word()|byte()<<16).toBe(0xfbf880);musicCalls++;break;
  case 0x08:push8(cpu.p);break;case 0xc2:cpu.p&=~byte();break;
  case 0x48:push16(cpu.a);break;case 0xda:push16(cpu.x);break;case 0x5a:push16(cpu.y);break;case 0x8b:push8(cpu.db);break;case 0x0b:push16(cpu.d);break;
  case 0xa9:cpu.a=word();zero=cpu.a===0;break;case 0x5b:cpu.d=cpu.a;break;case 0xf4:push16(word());break;case 0xab:cpu.db=pop8();break;
  case 0xa6:{expect(cpu.d).toBe(0);const at=byte();cpu.x=ram[at]|ram[at+1]<<8;break;}
  case 0xa5:{expect(cpu.d).toBe(0);const at=byte();cpu.a=ram[at]|ram[at+1]<<8;zero=cpu.a===0;break;}
  case 0xbd:{expect(cpu.db).toBe(0);const at=word()+cpu.x;cpu.a=ram[at]|ram[at+1]<<8;zero=cpu.a===0;break;}
  case 0xaf:{const at=(word()|byte()<<16)&0x3fffff;cpu.a=heap[at]|heap[at+1]<<8;zero=cpu.a===0;break;}
  case 0xc9:{const value=word();zero=cpu.a===value;carry=cpu.a>=value;break;}
  case 0xf0:{const offset=(byte()<<24)>>24;if(zero)pc+=offset;break;}case 0xd0:{const offset=(byte()<<24)>>24;if(!zero)pc+=offset;break;}
  case 0x90:{const offset=(byte()<<24)>>24;if(!carry)pc+=offset;break;}case 0xb0:{const offset=(byte()<<24)>>24;if(carry)pc+=offset;break;}
  case 0x2b:cpu.d=pop16();break;case 0x7a:cpu.y=pop16();break;case 0xfa:cpu.x=pop16();break;case 0x68:cpu.a=pop16();break;case 0x28:cpu.p=pop8();break;
  case 0x5c:{const target=word()|byte()<<16;if(target>>>16===0xb6)return finish(target);pc=target&0x3fffff;break;}
  case 0x6b:return finish('held');
  default:throw Error('Unexpected victory guard opcode');
 }
 throw Error('Victory guard did not return');
}
describe('native DKC boss completion boundary',()=>{
 it('holds each newly spawned boss banana before victory, preserving all caller registers and widths',()=>{
  const heap=rom.slice();new DkcBossRomHooks(heap);const hooks=new DkcBossFinishHooks(heap);
  for(const p of[0,0x10,0x20,0x30])for(const entrance of[0x68,0xe0,0xe1,0xe2,0xe3,0xe4,0xe5]){
   expect(execute(heap,'banana',entrance,0,0,p)).toBe('held');
   for(const state of[1,2,3,0x100])expect(execute(heap,'banana',entrance,state,0,p)).toBe(0xb6fbec);
  }
  hooks.sync(false);expect(execute(heap,'banana',0xe0,0,0)).toBe(0xb6fbec);
 });
 it('leaves every K. Rool attack and fake-out untouched until the native victory banana appears',()=>{
  const heap=rom.slice();new DkcBossRomHooks(heap);const hooks=new DkcBossFinishHooks(heap);
  for(const p of[0,0x10,0x20,0x30])for(const state of[0,1,0xa,0xb,0xc])for(let sub=0;sub<=0x14;sub++){
   expect(execute(heap,'krool',0x68,state,sub,p)).toBe(0xb6d957);
  }
  for(const entrance of[0,22,0x67,0x69,0xe0,0xe5,0x168])expect(execute(heap,'krool',entrance,0xb,0x13)).toBe(0xb6d957);
  hooks.sync(false);expect(execute(heap,'krool',0x68,0xb,0x13)).toBe(0xb6d957);
 });
 it('does not gate bananas outside original boss arenas',()=>{
  const heap=rom.slice();new DkcBossRomHooks(heap);new DkcBossFinishHooks(heap);
  for(const entrance of[0,22,0x67,0x69,0xdf,0xe6,0x1e0])expect(execute(heap,'banana',entrance,0,0)).toBe(0xb6fbec);
 });
 it('reports only post-defeat native cues without writing game RAM',()=>{
  const w=new Uint8Array(0x20000),slot=16;put(w,0x3e,0xe0);put(w,0xd45+slot,0x70);expect(pendingBossVictory(w)).toBeUndefined();
  put(w,0xd45+slot,0x74);expect(pendingBossVictory(w)).toEqual({slot,kind:'banana',entrance:0xe0});
  put(w,0x1029+slot,1);expect(pendingBossVictory(w)).toBeUndefined();
  put(w,0x3e,0x68);put(w,0xd45+slot,0x70);put(w,0x1029+slot,0xb);put(w,0x152d+slot,0x12);expect(pendingBossVictory(w)).toBeUndefined();
  put(w,0x152d+slot,0x13);expect(pendingBossVictory(w)).toBeUndefined();put(w,0xd45+slot,0x74);put(w,0x1029+slot,0);const before=w.slice();expect(pendingBossVictory(w)).toEqual({slot,kind:'banana',entrance:0x68});expect(w).toEqual(before);
 });
 it('restores all original bytes independently of existing door/music hooks, and supports multiple resident copies',()=>{
  const heap=new Uint8Array(0x802000);heap.set(rom,0x1000);heap.set(rom,0x402000);const doors=new DkcBossRomHooks(heap),before=heap.slice(),finish=new DkcBossFinishHooks(heap);
  expect(finish.bases).toEqual([0x1000,0x402000]);finish.restore();expect(Buffer.compare(heap,before)).toBe(0);finish.sync(true);finish.restore();expect(Buffer.compare(heap,before)).toBe(0);doors.restore();
  expect(dkcBossFinishGuard().length).toBeLessThan(0x100);
 });
 it('rejects changed code, final-death script, uninstalled music hooks, or occupied free space before writing',()=>{
  for(const offset of[0x36fbfe,0x36d957,0x36eb58,0x36edca,0x3bfa00]){
   const heap=rom.slice();new DkcBossRomHooks(heap);heap[offset]^=1;const before=heap.slice();expect(()=>new DkcBossFinishHooks(heap)).toThrow();expect(Buffer.compare(heap,before)).toBe(0);
  }
  const heap=rom.slice(),before=heap.slice();expect(()=>new DkcBossFinishHooks(heap)).toThrow('music');expect(Buffer.compare(heap,before)).toBe(0);
 });
});
