import {describe,expect,it} from 'vitest';
import {campaignStageLabel,isWorldMap,isWorldTab,MapConfirmInput,needsLevelReturn} from '../src/menu';

function scene(mode=0x26,world=0,level=0,tab=0):Uint8Array{
 const w=new Uint8Array(0x20000);w[0x118]=mode;w[0x218]=world*2;w[0x21a]=world*12+level;w[0x1119]=tab;return w;
}

describe('native world map context',()=>{
 it('recognizes only the interactive map, not its fades or progression scenes',()=>{
  expect(isWorldMap(scene())).toBe(true);
  for(const mode of [0x13,0x14,0x23,0x24,0x25,0x27,0x28,0x29,0x2a,0x2b,0x2c])expect(isWorldMap(scene(mode))).toBe(false);
 });
 it('uses the EU tab byte and distinguishes the current world tab from another one',()=>{
  const w=scene(0x26,1,0,4);expect(isWorldTab(w)).toBe(true);expect(needsLevelReturn(w)).toBe(true);
  w[0x1119]=6;expect(isWorldTab(w)).toBe(true);expect(needsLevelReturn(w)).toBe(false);
  w[0x1119]=0;w[0x1117]=4;expect(isWorldTab(w)).toBe(false);expect(needsLevelReturn(w)).toBe(false);
 });
 it('ignores a stale current-tab flag outside the map',()=>{
  const w=scene(0x13,0,0,2);expect(needsLevelReturn(w)).toBe(false);expect(campaignStageLabel(w)).toBe('World 1 · Level 1');
 });
});

describe('campaign labels',()=>{
 it('shows a useful prompt for the grid, current tab and other world tabs',()=>{
  expect(campaignStageLabel(scene(0x26,0,0,0))).toBe('World 1 · Choose a level');
  expect(campaignStageLabel(scene(0x26,0,0,2))).toBe('World 1 · ↓ Choose a level');
  expect(campaignStageLabel(scene(0x26,0,0,4))).toBe('World 1 · Choose a world');
  expect(campaignStageLabel(scene(0x26,2,0,6))).toBe('World 3 · ↓ Choose a level');
 });
 it('converts doubled world IDs and global stage IDs for all six worlds',()=>{
  for(let world=0;world<6;world++){
   expect(campaignStageLabel(scene(0x13,world,0))).toBe(`World ${world+1} · Level 1`);
   expect(campaignStageLabel(scene(0x13,world,7))).toBe(`World ${world+1} · Level 8`);
   expect(campaignStageLabel(scene(0x13,world,8))).toBe(`World ${world+1} · Extra`);
   expect(campaignStageLabel(scene(0x13,world,9))).toBe(`World ${world+1} · Bonus`);
  }
 });
 it('keeps unknown stage slots out of ordinary level numbering',()=>{
  for(const level of [-1,10,11])expect(campaignStageLabel(scene(0x13,2,level))).toBe('World 3 · Extra / bonus');
 });
});

describe('map confirmation press ownership',()=>{
 it('returns to the grid without entering a level on the same held press',()=>{
  const input=new MapConfirmInput(),w=scene(0x26,0,0,2);
  expect(input.update(w,true)).toBe('levels');w[0x1119]=0;
  expect(input.update(w,true)).toBe('levels');expect(input.update(w,true)).toBe('levels');
  expect(input.update(w,false)).toBeUndefined();expect(input.update(w,true)).toBe('enter');
 });
 it('enters a level from the grid and confirms a different world tab',()=>{
  for(const tab of [0,4]){const input=new MapConfirmInput();expect(input.update(scene(0x26,0,0,tab),true)).toBe('enter');}
 });
 it('does not reinterpret an entry press when the selected world changes',()=>{
  const input=new MapConfirmInput(),w=scene(0x26,0,0,4);
  expect(input.update(w,true)).toBe('enter');w[0x218]=2;
  expect(needsLevelReturn(w)).toBe(true);expect(input.update(w,true)).toBe('enter');
 });
 it('suppresses output outside the map while preserving the held action',()=>{
  const input=new MapConfirmInput(),w=scene(0x26,0,0,2);
  expect(input.update(w,true)).toBe('levels');w[0x118]=0x27;
  expect(input.update(w,true)).toBeUndefined();w[0x118]=0x26;w[0x1119]=0;
  expect(input.update(w,true)).toBe('levels');
 });
 it('requires a new press when a hold began in another scene',()=>{
  const input=new MapConfirmInput(),w=scene(0x13);
  expect(input.update(w,true)).toBeUndefined();w[0x118]=0x26;
  expect(input.update(w,true)).toBeUndefined();input.update(w,false);
  expect(input.update(w,true)).toBe('enter');
 });
 it('releases the action outside the map and resets it on explicit stop',()=>{
  const input=new MapConfirmInput(),w=scene(0x26,0,0,2);input.update(w,true);
  w[0x118]=0x28;expect(input.update(w,false)).toBeUndefined();w[0x118]=0x26;w[0x1119]=0;
  expect(input.update(w,true)).toBe('enter');input.reset();w[0x1119]=2;
  expect(input.update(w,true)).toBe('levels');
 });
});
