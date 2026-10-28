import {describe,it,expect} from 'vitest';
import {absorbHit,PROFILE as P,word,writeWord} from '../src/profile';
const wram=new Uint8Array(0x20000);

function hit(baby=0x8000,inv=0xa0){
 const g=new Uint8Array(0x8000);writeWord(g,P.baby,baby);writeWord(g,P.invincible,inv);writeWord(g,0x1ae,1);writeWord(g,0x1b0,1);return g;
}
describe('native grounded damage stun',()=>{
 it('reads the EU sprite direct-page mode, not unrelated low WRAM or US capture addresses',()=>{
  const g=hit(0),native=new Uint8Array(0x20000);
  writeWord(g,0x19d6,11);native[0x76]=1;writeWord(native,0xd9a,8);
  expect(absorbHit(g,native)).toBe(true);
  expect(word(g,0x1ae)).toBe(0);expect(word(g,0x1b0)).toBe(0);
  expect(word(g,0x19d6)).toBe(11);expect(native[0x76]).toBe(1);expect(word(native,0xd9a)).toBe(8);
 });
 it.each([
  ['contact return',1,0,1,1],
  ['tongue capture before return mode',11,8,0x8000,8],
  ['capture flag before the return starts',0,1,1,1],
 ] as const)('preserves %s locks and native trajectory state',(_name,mode,captured,playerLock,spriteLock)=>{
  const g=hit(0,24),native=new Uint8Array(0x20000);
  writeWord(g,0x19d6,mode);writeWord(native,0xd9c,captured);writeWord(native,0xd9e,1);
  writeWord(native,0x3b6,50);writeWord(native,0xdb4,120);
  writeWord(g,0x1ae,playerLock);writeWord(g,0x1b0,spriteLock);
  writeWord(g,0x1220,0x180);writeWord(g,0x1222,0xfc00);
  const beforeG=g.slice(),beforeNative=native.slice();
  for(let frame=0;frame<4;frame++)expect(absorbHit(g,native)).toBe(false);
  expect(g).toEqual(beforeG);expect(native).toEqual(beforeNative);
 });
 it('releases both locks and caps the timer below the native input-blocking threshold',()=>{
  for(const baby of [0x8000,0]){const g=hit(baby);expect(absorbHit(g,wram)).toBe(true);expect(word(g,0x1ae)).toBe(0);expect(word(g,0x1b0)).toBe(0);expect(word(g,P.invincible)).toBe(0x3f);expect(word(g,P.baby)).toBe(baby);}
 });
 it('lets the native invincibility expire after Mario is recovered, without rearming it every tick',()=>{
  const g=hit();absorbHit(g,wram);
  for(let remaining=62;remaining>=0;remaining--){writeWord(g,P.invincible,remaining);expect(absorbHit(g,wram)).toBe(false);expect(word(g,P.invincible)).toBe(remaining);}
 });
 it('keeps a short rescue grace period without ever reaching the grounded stun threshold',()=>{
  const g=hit(0,0);expect(absorbHit(g,wram)).toBe(true);expect(word(g,P.invincible)).toBe(24);
  for(let remaining=63;remaining>0;remaining--){writeWord(g,P.invincible,remaining);absorbHit(g,wram);expect(word(g,P.invincible)).toBe(Math.max(24,remaining));expect(word(g,P.invincible)).toBeLessThan(0x40);}
  writeWord(g,P.baby,0x8000);writeWord(g,P.invincible,23);expect(absorbHit(g,wram)).toBe(false);expect(word(g,P.invincible)).toBe(23);
 });
 it('never unlocks a pipe, door, goal, death sequence or transformation even with a high timer',()=>{
  for(const baby of [0,0x8000])for(const state of [6,0x0a,0x14,0x18]){
   const g=hit(baby);writeWord(g,0xac,state);const before=g.slice();expect(absorbHit(g,wram)).toBe(false);expect(g).toEqual(before);
  }
  const g=hit(0);writeWord(g,0xae,2);const before=g.slice();expect(absorbHit(g,wram)).toBe(false);expect(g).toEqual(before);
 });
 it('does not shorten an ordinary native timer when no damage lock or crying baby is present',()=>{
  const g=hit();writeWord(g,0x1ae,0);writeWord(g,0x1b0,0);expect(absorbHit(g,wram)).toBe(false);expect(word(g,P.invincible)).toBe(0xa0);
 });
});
