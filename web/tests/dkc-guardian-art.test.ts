import{describe,it,expect}from'vitest';
import{readFileSync}from'node:fs';
import manifest from'../public/art/yoshi-bosses.json';
import selection from'../scripts/burt-pose-selection.json';
describe('imported Burt native captured animation atlas',()=>{
 it('contains distinct source poses for motion, hurt and actual red shrinking defeat',()=>{
  const groups=manifest.groups.burt,frames=manifest.provenance.frames;
  expect(frames).toHaveLength(17);expect(groups.windup).not.toEqual(groups.hurt);expect(groups.hurt).not.toEqual(groups.dead);
  expect(frames[groups.windup.start].nativePhase).toBe(0x1a);expect(frames[groups.rise.start].nativePhase).toBe(0x1c);expect(frames[groups.fall.start].nativePhase).toBe(0x1e);
  for(const f of frames.slice(groups.dead.start,groups.dead.start+groups.dead.frames))expect(f.nativeHitIndex).toBe(0xfe);
  expect(frames.at(-1)?.nativePhase).toBe(0x48);expect(frames.every(f=>/^[0-9a-f]{64}$/.test(f.rawSha256))).toBe(true);
 });
 it('keeps every animation within native decoded PNG cells and mobile texture bounds',()=>{
  const png=readFileSync(new URL('../public/art/yoshi-bosses.png',import.meta.url));
  expect(png.readUInt32BE(16)).toBe(manifest.cell*manifest.columns);expect(png.readUInt32BE(20)).toBe(manifest.cell);expect(png.readUInt32BE(16)).toBeLessThanOrEqual(4096);
  for(const group of Object.values(manifest.groups.burt)){expect(group.start).toBeGreaterThanOrEqual(0);expect(group.frames).toBeGreaterThan(0);expect(group.start+group.frames).toBeLessThanOrEqual(manifest.provenance.frames.length);}
  expect(manifest.provenance.frames.map(f=>f.capture)).toEqual(selection.frames);
 });
});
