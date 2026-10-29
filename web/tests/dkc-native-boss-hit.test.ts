import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dkcNativeBossTargets, hitDkcNativeBoss, DkcNativeBossHitHooks, locateDkcNativeBossRomBases, DKC_GNAWTY_HEIGHT_GUARD } from '../src/dkc-native-boss-hit';
function fixture(state=5,sub=0){const w=new Uint8Array(0x20000);const p=(a:number,n:number)=>{w[a]=n&255;w[a+1]=n>>8;};p(0x40,0xe0);p(0x4a,512);p(0xd47,1);p(0xd55,0x70);p(0x1039,state);p(0x153d,sub);p(0x11b1,7);p(0xb29,200);p(0xbd1,180);return {w,p};}
describe('native DKC boss collision bridge',()=>{
 it('uses native hurt requests for all four attack kinds without changing HP or positions',()=>{for(const kind of ['egg','roll','stomp','barrel'] as const){const {w}=fixture();const before=w.slice();expect(hitDkcNativeBoss(w,{slot:16},kind)).toBe(true);expect(w[0x15a5]).toBe(1);expect(w[0x15a6]).toBe(128);const changed=[...w.keys()].filter(i=>w[i]!==before[i]);expect(changed).toEqual([0x15a5,0x15a6,0x15d9]);expect(hitDkcNativeBoss(w,{slot:16},kind)).toBe(false);}});
 it('preserves native invulnerability and wave-based Dumb Drum progression',()=>{for(const [state,sub]of [[7,1],[8,5],[11,3],[4,0]]){const{w}=fixture(state,sub);expect(dkcNativeBossTargets(w)).toEqual([]);}const{w,p}=fixture(9,2);p(0x10ad,4);expect(dkcNativeBossTargets(w)).toEqual([]);p(0x10ad,0);expect(hitDkcNativeBoss(w,{slot:16},'egg')).toBe(true);expect(w[0x15a5]).toBe(32);});
 it('patches only the exact verified Rev2 comparison and restores byte for byte',()=>{const rom=new Uint8Array(readFileSync('public/rom/dkc-usa-rev2.sfc'));const before=rom.slice();expect(locateDkcNativeBossRomBases(rom)).toEqual([0]);const hook=new DkcNativeBossHitHooks(rom);expect([...rom.slice(0x36dbd4,0x36dbda)]).toEqual([0x22,0,0xfc,0xfb,0xea,0xea]);expect(rom.slice(0x3bfc00,0x3bfc00+DKC_GNAWTY_HEIGHT_GUARD.length)).toEqual(DKC_GNAWTY_HEIGHT_GUARD);hook.requestDrumDefeat(16);expect(rom[0x3bfc3e]).toBe(16);hook.requestDrumDefeat(null);expect(rom[0x3bfc3e]).toBe(255);expect(()=>hook.requestDrumDefeat(3)).toThrow();hook.restore();expect(Buffer.compare(rom,before)).toBe(0);rom[0x36dbdb]^=1;expect(()=>new DkcNativeBossHitHooks(rom)).toThrow();});
});

import { DkcDrumEncounter } from '../src/dkc-native-boss-hit';
it('adds five direct Drum hits while leaving native waves and progression untouched',()=>{
 const {w,p}=fixture(7,4),drum=new DkcDrumEncounter();const before=w.slice();
 expect(drum.sync(w)?.hp).toBe(5);
 for(let i=0;i<5;i++){expect(drum.targets(w)).toHaveLength(1);expect(drum.hit(w,{slot:16},'egg')).toBe(true);expect(drum.hit(w,{slot:16},'roll')).toBe(false);drum.sync(w,45);}
 expect(drum.state).toMatchObject({hp:0,defeatRequested:true});expect(drum.targets(w)).toEqual([]);expect(Buffer.compare(w,before)).toBe(0);
 p(0x1039,4);expect(drum.sync(w)).toBeNull();
});

it('validates Drum autosaves and clears the encounter on native death',()=>{
 const {w,p}=fixture(7,4),drum=new DkcDrumEncounter();drum.sync(w);drum.hit(w,{slot:16},'barrel');
 const saved=drum.serialize(),resumed=new DkcDrumEncounter();resumed.restore(saved);expect(resumed.sync(w,0)).toEqual(saved);
 resumed.restore({...saved,hp:100});expect(resumed.state).toBeNull();resumed.restore({...saved,defeatRequested:true});expect(resumed.state).toBeNull();resumed.restore(saved);p(0x1929,3);expect(resumed.sync(w)).toBeNull();
});
