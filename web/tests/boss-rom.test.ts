import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {BossRomHooks} from '../src/boss-rom';
import {word} from '../src/profile';
const rom=new Uint8Array(readFileSync(new URL('../public/rom/yoshi-eu.sfc',import.meta.url)));
function fixture(){const base=0x1000,heap=new Uint8Array(base+rom.length);heap.set(rom,base);return{heap,base,hooks:new BossRomHooks(heap,base+0x27aeb)};}
describe('validated EU exit hooks',()=>{
 it('closes drawing/collision routines without removing native sprites or ROM data',()=>{
  const {heap,base,hooks}=fixture();expect(heap[base+0x12617]).toBe(0x6b);expect(heap[base+0x159c3]).toBe(0x6b);expect(heap[base+0x15a19]).toBe(0x6b);expect(word(heap,base+0x6c5a9)).toBe(0xd672);
  hooks.restore();expect(Buffer.compare(Buffer.from(heap.subarray(base)),Buffer.from(rom))).toBe(0);
 });
 it('opens an ordinary goal only after defeat and releases all native ending scripts on contact',()=>{
  const {heap,base,hooks}=fixture();hooks.sync('goal','fight');expect(heap[base+0x12617]).toBe(0x6b);
  hooks.sync('goal','exit');expect(heap[base+0x12617]).toBe(0xad);expect(heap[base+0x159c3]).toBe(0x6b);
  hooks.sync('key','exit');expect(heap[base+0x159c3]).toBe(0x6b);hooks.sync('key','released');expect(Buffer.compare(Buffer.from(heap.subarray(base)),Buffer.from(rom))).toBe(0);
 });
 it('holds a no-key fortress explosion only during its extra encounter',()=>{const {heap,base,hooks}=fixture();expect(heap[base+0x15f85]).toBe(0x4c);expect([...heap.slice(base+0x17ff0,base+0x17ffc)]).toEqual([0xbd,0,0x79,0xd0,1,0x6b,0xad,2,0x74,0x4c,0x88,0xdf]);hooks.sync('mini','fight');expect(heap[base+0x15f85]).toBe(0x4c);hooks.sync('mini','released');expect(heap[base+0x15f85]).toBe(0xad);});
 it('patches only Bowser state20, preserving his pre-fight state19 which shares its handler',()=>{
  const {heap,base,hooks}=fixture();expect(word(heap,base+0x6c59b)).toBe(0xd673);expect(word(heap,base+0x6c5a9)).toBe(0xd672);hooks.sync('final','released');expect(word(heap,base+0x6c5a9)).toBe(0xd673);
 });
 it('fails before writing anything on a different ROM revision',()=>{
  const base=0x1000,heap=new Uint8Array(base+rom.length);heap.set(rom,base);heap[base+0x12617]=0xea;const original=heap.slice();expect(()=>new BossRomHooks(heap,base+0x27aeb)).toThrow('save has been kept');expect(Buffer.compare(Buffer.from(heap),Buffer.from(original))).toBe(0);
 });
 it('uses the sound queue routine found in this exact EU ROM',()=>{expect([...rom.subarray(0x5de,0x5e8)]).toEqual([0xac,0x57,0,0x99,0x59,0,0xee,0x57,0,0x6b]);});
});
