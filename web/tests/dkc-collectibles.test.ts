import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {targets,hit,DkcCollectibleHooks,locateDkcCollectibleRomBases} from '../src/dkc-collectibles';
function fixture(){const w=new Uint8Array(0x20000);const put=(p:number,v:number)=>{w[p]=v&255;w[p+1]=v>>>8;};put(0x40,22);put(0x4a,512);put(0xd47,1);put(0x895,180);w[0xc4]=1;put(0xc000,224);put(0xc002,320);put(0xc004,4);put(0xc008,1);put(0xc00a,0xd000);put(0xc010,0xffff);put(0xd000,0x8001);put(0xd002,0x4000);return{w,put};}
describe('native collectible egg collisions',()=>{
 it('reads individual native banana formation bits and excludes caches, HUD effects and victory banana',()=>{
  const{w,put}=fixture();put(0xd4b,0x2c);put(0xd4d,0x42);put(0xd4f,0x74);
  const t=targets(w);expect(t).toHaveLength(2);expect(t.map(t=>[t.x,t.y])).toEqual([[228,328],[236,336]]);expect(t.every(t=>t.collectible)).toBe(true);
 });
 it('queues one native bitmap request and never changes WRAM counts, positions, bitmap or IDs',()=>{
  const{w}=fixture(),before=w.slice(),t=targets(w)[0];expect(hit(w,t)).toBe(true);expect(hit(w,t)).toBe(false);expect(w).toEqual(before);
  const rom=new Uint8Array(readFileSync('public/rom/dkc-usa-rev2.sfc')),hooks=new DkcCollectibleHooks(rom);hooks.sync(w);
  const word=(p:number)=>rom[p]|rom[p+1]<<8;
  expect(word(0x3bfde0)).toBe(1);expect(word(0x3bfde2)).toBe(0);expect(word(0x3bfde4)).toBe(223);expect(word(0x3bfde6)).toBe(319);expect(w).toEqual(before);hooks.restore();
 });
 it('continues after the executing ROM copy consumes its request while inactive copies retain it',()=>{
  const{w}=fixture(),ts=targets(w),rom=new Uint8Array(readFileSync('public/rom/dkc-usa-rev2.sfc')),heap=new Uint8Array(rom.length*2);heap.set(rom);heap.set(rom,rom.length);
  const h=new DkcCollectibleHooks(heap);expect(h.bases).toEqual([0,rom.length]);hit(w,ts[0]);hit(w,ts[1]);h.sync(w);heap[0x3bfde0]=0;h.sync(w);
  expect(heap[0x3bfde4]|heap[0x3bfde5]<<8).toBe(231);h.restore();
 });
 it('requests original bunch/balloon collision, excludes already-collecting states and rejects stale slots',()=>{
  const{w,put}=fixture();put(0xd4b,0x15);put(0xd4d,0x34);put(0xd4f,0x15);put(0x1033,2);
  const t=targets(w).filter(t=>!t.banana);expect(t.map(t=>t.id)).toEqual([0x15,0x34]);const before=w.slice();
  expect(hit(w,t[0])).toBe(true);expect(hit(w,t[0])).toBe(false);expect([...w.keys()].filter(i=>w[i]!==before[i])).toEqual([0x159b,0x159c]);
  put(0xd4d,0x74);expect(hit(w,t[1])).toBe(false);
 });
 it('patches only the exact verified revision and restores its bytes',()=>{
  const rom=new Uint8Array(readFileSync('public/rom/dkc-usa-rev2.sfc')),before=rom.slice();expect(locateDkcCollectibleRomBases(rom)).toEqual([0]);
  const h=new DkcCollectibleHooks(rom);expect([...rom.slice(0x38b650,0x38b654)]).toEqual([0x22,0xf0,0xfc,0xfb]);expect([...rom.slice(0x387fb6,0x387fbd)]).toEqual([0xf4,0x53,0xb6,0x5c,0x5a,0xbc,0xb8]);h.restore();expect(Buffer.compare(rom,before)).toBe(0);
  rom[0x38bc5a]^=1;expect(()=>new DkcCollectibleHooks(rom)).toThrow();
 });
});

it('uses the golden animal-token footprint in all four native bonuses and preserves its bitmap request coordinates',()=>{for(const level of[0x6c,0xa6,0xd2,0xd3]){const{w,put}=fixture();put(0x40,level);const t=targets(w)[0];expect(t).toMatchObject({width:16,height:16,banana:{level,nativeX:224,nativeY:320}});const before=w.slice();expect(hit(w,t)).toBe(true);expect(w).toEqual(before);}});
