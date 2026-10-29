import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {createRecoveryState} from '../src/recovery';
import {stateBlock} from '../src/snapshot';

const bootstrap=new Uint8Array(readFileSync(new URL('../public/bootstrap/yoshi-eu-map-snes9x-2.0.2.state',import.meta.url)));
const fixture=()=>{
 const old=bootstrap.slice(),ram=stateBlock(old,'RAM'),sram=stateBlock(old,'SRA');
 ram[0x216]=1;ram[0x218]=4;ram[0x21a]=27;ram[0x30e]=2;
 ram.fill(1,0x222,0x222+27);ram[0x222+27]=0x80;ram.fill(100,0x2b8,0x2b8+27);
 ram.set([1,4,7],0x357);ram[0x372]=0x3f;ram[0x379]=12;ram[0x37b]=77;
 // Deliberate corruption elsewhere must never survive reconstruction.
 ram.fill(0xa5,0x1114,0x1130);ram.fill(0xee,0x18000,0x20000);ram.fill(0xff,0x30f,0x357);
 sram.fill(0xcc,0,0x7c00);sram.fill(0xdd,0x7e80);sram[0x7c00]=12;
 for(const name of ['CPU','REG','PPU','VRA','SFX'])stateBlock(old,name).fill(0x42);
 return {old,ram,sram};
};

describe('recover the campaign without old runtime graphics',()=>{
 it('preserves verified campaign fields and the battery save region',()=>{
  const {old,ram,sram}=fixture(),result=createRecoveryState(bootstrap,old),out=stateBlock(result,'RAM');
  for(const [start,length]of [[0x222,72],[0x2b8,72],[0x357,27],[0x372,2],[0x379,4]])expect(out.subarray(start,start+length)).toEqual(ram.subarray(start,start+length));
  expect([out[0x216],out[0x218],out[0x21a],out[0x30e]]).toEqual([1,4,27,2]);
  expect(stateBlock(result,'SRA').subarray(0x7c00,0x7e80)).toEqual(sram.subarray(0x7c00,0x7e80));
  const clean=stateBlock(bootstrap,'RAM');
  expect([out[0x118],out[0x200],out[0x201]]).toEqual([clean[0x118],clean[0x200],clean[0x201]]);
 });
 it('keeps CPU, PPU, VRAM, SuperFX state and nonbattery SRA from the clean bootstrap',()=>{
  const {old}=fixture(),result=createRecoveryState(bootstrap,old);
  for(const name of ['CPU','REG','PPU','DMA','VRA','FIL','SND','CTL','TIM','SFX'])expect(stateBlock(result,name)).toEqual(stateBlock(bootstrap,name));
  for(const [from,to]of [[0,0x7c00],[0x7e80,0x80000]])expect(stateBlock(result,'SRA').subarray(from,to)).toEqual(stateBlock(bootstrap,'SRA').subarray(from,to));
  for(const [from,to]of [[0x1114,0x1130],[0x18000,0x20000]])expect(stateBlock(result,'RAM').subarray(from,to)).toEqual(stateBlock(bootstrap,'RAM').subarray(from,to));
 });
 it('reconstructs selectable icons instead of importing an animated/corrupted icon cache',()=>{
  const {old}=fixture(),result=createRecoveryState(bootstrap,old),ram=stateBlock(result,'RAM');
  expect([...ram.subarray(0x30f,0x30f+12)]).toEqual([1,2,3,4,5,6,7,8,9,10,11,12]);
  expect(ram[0x30f+27]).toBe(4);expect(ram[0x30f+28]).toBe(0);
  expect([...ram.subarray(0x30f+32,0x30f+36)]).toEqual([0xf0,0xf0,11,12]);
 });
 it.each([[12,72],[255,255],[3,18],[4,0]])('does not import invalid or inconsistent world/stage selection %s/%s',(world,stage)=>{
  const {old,ram}=fixture();ram[0x218]=world;ram[0x21a]=stage;ram[0x30e]=255;
  const result=createRecoveryState(bootstrap,old),out=stateBlock(result,'RAM'),clean=stateBlock(bootstrap,'RAM');
  expect([out[0x218],out[0x21a],out[0x30e]]).toEqual([clean[0x218],clean[0x21a],clean[0x30e]]);
 });
 it('does not mutate either input, so the original can remain available as a backup',()=>{
  const {old}=fixture(),before=old.slice(),cleanBefore=bootstrap.slice();createRecoveryState(bootstrap,old);
  expect(old).toEqual(before);expect(bootstrap).toEqual(cleanBefore);
 });
 it('rejects incomplete native data before attempting recovery',()=>{
  expect(()=>createRecoveryState(bootstrap,new Uint8Array(30))).toThrow();
  expect(()=>createRecoveryState(bootstrap.subarray(0,-1),bootstrap)).toThrow();
 });
});
