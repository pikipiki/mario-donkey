import{describe,it,expect}from'vitest';
import{dkcWorldForEntrance,guardianForWorld,YOSHI_GUARDIANS,SALVO_NATIVE}from'../src/yoshi-guardian-spec';
describe('native DKC world to Yoshi guardian',()=>{
 it('uses different original bosses for every region, with world 2 Salvo',()=>{expect(new Set(YOSHI_GUARDIANS.map(s=>s.id)).size).toBe(7);expect(guardianForWorld(2)?.id).toBe('salvo');});
 it('does not confuse ROM boss ID order with geographic world order',()=>{expect([0xe0,0xe1,0xe5,0xe2,0xe3,0xe4,0x68].map(dkcWorldForEntrance)).toEqual([1,2,3,4,5,6,7]);});
 it('classifies every regional map, and checkpoints and bonuses by their parent stage',()=>{expect([0xec,0xed,0xe9,0xe8,0xe7,0xe6].map(dkcWorldForEntrance)).toEqual([1,2,3,4,5,6]);expect([22,46,101,98,64,10].map(dkcWorldForEntrance)).toEqual([1,2,3,4,5,6]);expect(dkcWorldForEntrance(0x81)).toBe(6);expect(dkcWorldForEntrance(0xd9)).toBe(2);});
 it('leaves unknown and animal-token rooms unclassified instead of reusing Burt',()=>{expect(dkcWorldForEntrance(0)).toBeUndefined();expect(dkcWorldForEntrance(0xd2)).toBeUndefined();for(const id of[0,8,1.5,NaN])expect(guardianForWorld(id)).toBeUndefined();});
 it('ports the original Salvo hop and horizontal speed at the EU donor frame rate',()=>{expect(SALVO_NATIVE.jumpVelocity).toBe(-156.25);expect(SALVO_NATIVE.speed).toBe(37.5);expect(SALVO_NATIVE.acceleration).toBe(156.25);});
});

describe('authentic world guardian atlas coverage',()=>{
 it('has native extracted art for all seven selected original bosses, with no blank fallback',async()=>{
  const {readFileSync}=await import('node:fs');
  const main=JSON.parse(readFileSync(new URL('../public/art/yoshi-bosses.json',import.meta.url),'utf8'));
  const extras=JSON.parse(readFileSync(new URL('../public/art/yoshi-guardians.json',import.meta.url),'utf8'));
  for(const spec of YOSHI_GUARDIANS){
   const atlas=spec.id==='burt'?main:extras;
   for(const state of['idle','attack','hurt','dead'])expect(atlas.groups[spec.id]?.[state]?.frames,spec.id+' '+state).toBeGreaterThan(0);
   if(spec.id!=='burt'){
    const evidence=extras.provenance.bosses[spec.id];expect(evidence.frames.length).toBeGreaterThanOrEqual(3);
    expect(new Set(evidence.frames.map((row:{rawSha256:string})=>row.rawSha256)).size).toBe(evidence.frames.length);
    for(const row of evidence.frames){expect(row.sourceBounds[2]-row.sourceBounds[0]).toBeGreaterThanOrEqual(20);expect(row.sourceBounds[3]-row.sourceBounds[1]).toBeGreaterThanOrEqual(20);}
   }
  }
 });
});
