import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {YOSHI_ENTRY_SONGS,currentYoshiSong,captureYoshiBossSong,stopYoshiBossSong,restoreYoshiBossSong} from '../src/native-boss-music';
function fixture(){const w=new Uint8Array(0x20000);w[0x118]=0x13;w[0x203]=1;return w;}
describe('EU native music capture without muting real egg FX',()=>{
 it('matches the exact ROM table and its persistent-song routine',()=>{
  const rom=readFileSync(new URL('../public/rom/yoshi-eu.sfc',import.meta.url));
  expect([...rom.subarray(0xb273,0xb286)]).toEqual(YOSHI_ENTRY_SONGS);
  const signature='08e230ad0502d00dae0302bf72b2018d4d008d05029c53009c5700286b';expect(rom.subarray(0xb286,0xb286+signature.length/2).toString('hex')).toBe(signature);
 });
 it('reads the persistent native song even after the APU handshake has returned to zero',()=>{
  const w=fixture();w[0x4d]=w[0x4f]=0;w[0x205]=9;expect(currentYoshiSong(w)).toBe(9);
  expect(captureYoshiBossSong(w,0)).toBe(9);expect(captureYoshiBossSong(w,0xf0)).toBe(9);
 });
 it('observes a pending native song and preserves a valid captured song across the boss stop',()=>{
  const w=fixture();w[0x205]=1;w[0x4d]=12;expect(currentYoshiSong(w)).toBe(12);
  w[0x4d]=0xf0;w[0x4f]=0xf0;expect(captureYoshiBossSong(w,12)).toBe(12);expect(captureYoshiBossSong(w,0)).toBe(1);
 });
 it('uses the actual loaded block-set table and keeps native silent settings silent',()=>{
  const w=fixture();w[0x203]=10;expect(currentYoshiSong(w)).toBe(12);
  w[0x203]=13;expect(currentYoshiSong(w)).toBeUndefined();
  w[0x203]=0;w[0x150]=5;expect(currentYoshiSong(w)).toBe(9);
 });
 it('only queues music stop and restore, preserving egg FX, persistent song and all other RAM',()=>{
  const w=fixture();w[0x205]=9;w[0x53]=0x20;w[0x57]=2;w[0x59]=0x13;const before=w.slice();
  expect(stopYoshiBossSong(w)).toBe(true);expect(w[0x4d]).toBe(0xf0);expect(restoreYoshiBossSong(w,0)).toBe(true);expect(w[0x4d]).toBe(9);
  w[0x4d]=before[0x4d];expect(w).toEqual(before);
 });
 it('never overwrites a queued native jingle, finishing handoff, death or map music',()=>{
  const w=fixture();w[0x4d]=3;expect(restoreYoshiBossSong(w,1)).toBe(false);expect(w[0x4d]).toBe(3);
  w[0x4d]=0;expect(restoreYoshiBossSong(w,1,true)).toBe(false);
  for(const mode of[0x14,0x15,0x26]){w[0x118]=mode;expect(stopYoshiBossSong(w)).toBe(false);expect(restoreYoshiBossSong(w,1)).toBe(false);expect(w[0x4d]).toBe(0);}
 });
});
