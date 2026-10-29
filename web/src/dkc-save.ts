import type {AdventureData} from './adventure';
import{DKC_ROM_SHA256}from'./world';
import{validateDkcNativeState}from'./snapshot';
import type{DkcCombatSave}from'./dkc-combat';
export const DKC_SAVE_KEY='dkc-campaign-v1-snes9x-2.0.2',DKC_MAP_KEY='dkc-map-v1-snes9x-2.0.2';
export interface DkcSave{state:Uint8Array;adventure:AdventureData;combat:DkcCombatSave}
export function encodeDkcSave(save:DkcSave):Uint8Array{
 validateDkcNativeState(save.state);
 const meta=new TextEncoder().encode(JSON.stringify({version:1,world:'dkc',sha256:DKC_ROM_SHA256,adventure:save.adventure,combat:save.combat}));
 const out=new Uint8Array(4+meta.length+save.state.length);new DataView(out.buffer).setUint32(0,meta.length,true);out.set(meta,4);out.set(save.state,4+meta.length);return out;
}
export function decodeDkcSave(bytes:Uint8Array):DkcSave{
 if(bytes.length<5)throw new Error('The DKC save is incomplete. Your previous save is kept.');
 const n=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0,true);
 if(n>100000||4+n>=bytes.length)throw new Error('The DKC save is incomplete.');
 const meta=JSON.parse(new TextDecoder().decode(bytes.subarray(4,4+n)));
 if(meta.version!==1||meta.world!=='dkc'||meta.sha256!==DKC_ROM_SHA256||meta.adventure?.version!==2)throw new Error('This save belongs to a different game.');
 const state=bytes.slice(4+n);validateDkcNativeState(state);return{state,adventure:meta.adventure,combat:meta.combat};
}
