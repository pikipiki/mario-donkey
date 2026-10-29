import{it,expect}from'vitest';import{readFileSync}from'node:fs';import meta from'../public/art/mario-yoshi.json';
it('keeps the original Mario/Yoshi row and separate native Yoshi body poses for mounted Goonks',()=>{
 const body=meta.groups.yoshi,original=meta.groups['mario-yoshi'];expect(original.idle.start).toBe(0);expect(body.idle.start).toBe(16);for(const a of Object.values(body)){expect(a.start).toBeGreaterThanOrEqual(16);expect(a.start+a.frames).toBeLessThanOrEqual(32);}
 expect(meta.provenance.yoshiBodyCaptures).toHaveLength(16);for(const f of meta.provenance.yoshiBodyCaptures){expect(f.parts.length).toBeGreaterThan(0);expect(f.parts.every(([tile,palette])=>tile<0x20&&palette===5)).toBe(true);}
 const png=readFileSync('public/art/mario-yoshi.png');expect(png.readUInt32BE(16)).toBe(1024);expect(png.readUInt32BE(20)).toBe(128);
});
