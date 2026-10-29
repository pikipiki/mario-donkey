import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {stateBlock,validateNativeState} from '../src/snapshot';

const bundled=new Uint8Array(readFileSync(new URL('../public/bootstrap/yoshi-eu-map-snes9x-2.0.2.state',import.meta.url)));
const raw=()=>bundled.slice(16,16+new DataView(bundled.buffer).getUint32(12,true));
const ascii=(value:string)=>new TextEncoder().encode(value);
function concat(...parts:Uint8Array[]):Uint8Array{
 const bytes=new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0));let offset=0;
 for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
function chunk(name:string,data:Uint8Array):Uint8Array{
 const bytes=new Uint8Array(8+Math.ceil(data.length/8)*8);bytes.set(ascii(name));
 new DataView(bytes.buffer).setUint32(4,data.length,true);bytes.set(data,8);return bytes;
}
const wrap=(core:Uint8Array,...extra:Uint8Array[])=>concat(ascii('RASTATE\x01'),chunk('MEM ',core),...extra,chunk('END ',new Uint8Array()));
function without(core:Uint8Array,name:string):Uint8Array{
 const block=stateBlock(core,name),start=block.byteOffset-core.byteOffset-11;
 return concat(core.subarray(0,start),core.subarray(start+11+block.length));
}

describe('native Snes9x snapshot integrity',()=>{
 it('accepts the actual EU bootstrap and its unwrapped version without changing bytes',()=>{
  const before=bundled.slice();expect(()=>validateNativeState(bundled)).not.toThrow();
  expect(()=>validateNativeState(raw())).not.toThrow();expect(bundled).toEqual(before);
  expect(stateBlock(bundled,'VRA')).toHaveLength(65536);
  expect(stateBlock(bundled,'RAM')).toHaveLength(131072);
  expect(stateBlock(bundled,'SRA')).toHaveLength(524288);
  expect(stateBlock(bundled,'SFX')).toHaveLength(996);
 });
 it('supports byte views with nonzero offsets and returns a view for DEV fixtures',()=>{
  const storage=new Uint8Array(bundled.length+32);storage.set(bundled,13);
  const save=storage.subarray(13,13+bundled.length),vram=stateBlock(save,'VRA');
  expect(()=>validateNativeState(save)).not.toThrow();expect(vram.buffer).toBe(storage.buffer);
  vram[0]^=0xff;expect(stateBlock(save,'VRA')[0]).toBe(vram[0]);
  expect(()=>validateNativeState(save)).not.toThrow(); // Structure cannot certify pixel contents.
 });
 it('accepts padded frontend blocks after the core, including unknown future metadata',()=>{
  const wrapped=wrap(raw(),chunk('ACHV',new Uint8Array([1,2,3])),chunk('RPLY',new Uint8Array(9)),chunk('META',new Uint8Array()));
  expect(()=>validateNativeState(wrapped)).not.toThrow();expect(stateBlock(wrapped,'RAM')).toEqual(stateBlock(bundled,'RAM'));
 });
 it.each(['VRA','RAM','SRA','PPU','SFX'])('rejects a missing %s block, even with an otherwise well-formed wrapper',(name)=>{
  const incomplete=without(raw(),name);expect(()=>validateNativeState(incomplete)).toThrow('incomplete');
  expect(()=>validateNativeState(wrap(incomplete))).toThrow('incomplete');
 });
 it.each(['VRA','RAM','SRA'])('rejects a self-consistent but shortened %s block',(name)=>{
  const core=raw(),block=stateBlock(core,name),start=block.byteOffset-core.byteOffset-11;
  const replacement=concat(ascii(`${name}:${String(block.length-1).padStart(6,'0')}:`),block.subarray(0,-1));
  expect(()=>validateNativeState(wrap(concat(core.subarray(0,start),replacement,core.subarray(start+11+block.length))))).toThrow();
 });
 it.each([0,7,12,50,3000,70000,200000,824429,824439])('rejects truncated containers at byte %s',(end)=>{
  expect(()=>validateNativeState(bundled.subarray(0,end))).toThrow();
 });
 it('rejects a truncated final native payload and an incomplete native header',()=>{
  const core=raw();expect(()=>validateNativeState(core.subarray(0,-1))).toThrow();
  expect(()=>validateNativeState(concat(core,ascii('BAD:00')))).toThrow();
 });
 it('rejects unsupported core/wrapper versions and HTML error pages',()=>{
  const future=bundled.slice();future[7]=2;expect(()=>validateNativeState(future)).toThrow();
  const core=raw();core[12]='3'.charCodeAt(0);expect(()=>validateNativeState(core)).toThrow();
  expect(()=>validateNativeState(ascii('<html>Not found</html>'))).toThrow();
 });
 it('rejects ambiguous duplicate memory blocks and oversized lengths',()=>{
  expect(()=>validateNativeState(wrap(raw(),chunk('MEM ',raw())))).toThrow();
  const oversized=bundled.slice();new DataView(oversized.buffer).setUint32(12,0xffffffff,true);
  expect(()=>validateNativeState(oversized)).toThrow();
  const core=raw(),block=stateBlock(core,'VRA');
  expect(()=>validateNativeState(concat(core,ascii('VRA:065536:'),block))).toThrow();
 });
 it('rejects a container without MEM and missing requested blocks',()=>{
  expect(()=>validateNativeState(concat(ascii('RASTATE\x01'),chunk('END ',new Uint8Array())))).toThrow();
  expect(()=>stateBlock(bundled,'XYZ')).toThrow();
 });
});
