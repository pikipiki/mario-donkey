import {describe,it,expect} from 'vitest';
import {keepBabyVisible,PROFILE as P,signed16,word,writeWord} from '../src/profile';

function fixture(screenY=23,vy=-0x140){
 const g=new Uint8Array(0x8000),w=new Uint8Array(0x20000);
 w[P.mode]=P.gameplay;writeWord(w,P.cameraY,1796);writeWord(w,0x3b6,80);
 writeWord(g,P.spriteId,0x61);writeWord(g,P.spriteState,0x10);writeWord(g,0x19d6,11);
 writeWord(g,P.spriteX,433);writeWord(g,P.spriteY,1796+screenY);
 writeWord(g,P.y,1904);writeWord(g,0x1220,0xa0);writeWord(g,0x1222,vy);writeWord(g,0x15e2,-0x140);
 writeWord(w,0xdb4,1850);
 return {g,w};
}

describe('EU floating Baby Mario visibility aid',()=>{
 it('only stops ascent and reverses the native velocity ceiling, preserving positions and countdown',()=>{
  const {g,w}=fixture(),beforeG=g.slice(),beforeW=w.slice();
  expect(keepBabyVisible(g,w)).toBe(true);
  expect(word(g,0x1222)).toBe(0);expect(signed16(word(g,0x15e2))).toBe(0x140);
  writeWord(beforeG,0x1222,0);writeWord(beforeG,0x15e2,0x140);
  expect(g).toEqual(beforeG);expect(w).toEqual(beforeW);
 });
 it.each([24,25,100])('does not alter a bubble %i pixels below the camera top',screenY=>{
  const {g,w}=fixture(screenY),beforeG=g.slice(),beforeW=w.slice();
  expect(keepBabyVisible(g,w)).toBe(false);expect(g).toEqual(beforeG);expect(w).toEqual(beforeW);
 });
 it.each([0,1,0x140])('preserves stationary or downward native velocity %i',vy=>{
  const {g,w}=fixture(-6,vy),beforeG=g.slice();
  expect(keepBabyVisible(g,w)).toBe(false);expect(g).toEqual(beforeG);
 });
 it.each([
  ['map','w',P.mode,0x26],['victory mode','w',P.mode,P.victory],['dialogue','w',0xd11,9],
  ['riding','g',P.baby,0x8000],['carried','g',P.baby,0x4000],
  ['inactive sprite','g',P.spriteState,0],['tongued sprite','g',P.spriteState,8],['other sprite','g',P.spriteId,0x20],
  ['initial knockoff','g',0x19d6,0],['return to Yoshi','g',0x19d6,1],['bubble forming','g',0x19d6,10],['other flight mode','g',0x19d6,14],
  ['capture in progress','w',0xd9c,8],['empty countdown','w',0x3b6,0],
  ['goal','g',0xac,0x14],['death','g',0xac,0x18],['transformation','g',0xae,2],
  ['player lock','g',0x1ae,1],['sprite lock','g',0x1b0,1],
 ] as const)('preserves %s',(_name,memory,address,value)=>{
  const {g,w}=fixture(-6);writeWord(memory==='g'?g:w,address,value);
  const beforeG=g.slice(),beforeW=w.slice();
  expect(keepBabyVisible(g,w)).toBe(false);expect(g).toEqual(beforeG);expect(w).toEqual(beforeW);
 });
 it('allows native descent and re-entry without repeated writes',()=>{
  const {g,w}=fixture(-6);expect(keepBabyVisible(g,w)).toBe(true);
  expect(keepBabyVisible(g,w)).toBe(false);
  writeWord(g,0x1222,5);expect(keepBabyVisible(g,w)).toBe(false);
  writeWord(g,P.spriteY,1796+24);writeWord(g,0x1222,-0x140);
  expect(keepBabyVisible(g,w)).toBe(false);
 });
 it.each([-300,600])('preserves native horizontal travel at screen X %i',screenX=>{
  const {g,w}=fixture(-6);writeWord(w,P.cameraX,400);writeWord(g,P.spriteX,400+screenX);
  expect(keepBabyVisible(g,w)).toBe(true);
  expect(word(g,P.spriteX)).toBe(400+screenX);expect(word(g,0x1220)).toBe(0xa0);
 });
 it('handles a bubble above camera zero using signed native coordinates',()=>{
  const {g,w}=fixture();writeWord(w,P.cameraY,0);writeWord(g,P.spriteY,-6);
  expect(keepBabyVisible(g,w)).toBe(true);expect(signed16(word(g,P.spriteY))).toBe(-6);
 });
 it.each([0,0x140,-0x8000])('keeps the descent ceiling positive for native value %i',ceiling=>{
  const {g,w}=fixture();writeWord(g,0x15e2,ceiling);
  expect(keepBabyVisible(g,w)).toBe(true);expect(signed16(word(g,0x15e2))).toBeGreaterThan(0);
 });
});
