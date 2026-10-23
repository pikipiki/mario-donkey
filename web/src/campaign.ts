import { type AdventureData } from './adventure';
import { loadFile,storeFile } from './storage';
const KEY='campaign-v2-original-dkc-eu-snes9x-2.0.2';
export interface Campaign {state:Uint8Array;adventure:AdventureData}
export function encodeCampaign(state:Uint8Array,adventure:AdventureData):Uint8Array{
 const json=new TextEncoder().encode(JSON.stringify(adventure));const bytes=new Uint8Array(4+json.length+state.length);
 new DataView(bytes.buffer).setUint32(0,json.length,true);bytes.set(json,4);bytes.set(state,4+json.length);return bytes;
}
export function decodeCampaign(bytes:Uint8Array):Campaign{
 if(bytes.length<4)throw new Error('Sauvegarde incomplète.');const length=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0,true);
 if(length>2_000_000||4+length>=bytes.length)throw new Error('Sauvegarde invalide.');
 const adventure=JSON.parse(new TextDecoder().decode(bytes.subarray(4,4+length))) as AdventureData;
 if(!adventure||adventure.version!==2||!Array.isArray(adventure.available)||!Array.isArray(adventure.animals)||!Array.isArray(adventure.pickups))throw new Error('Version de sauvegarde incompatible.');return {adventure,state:bytes.slice(4+length)};
}
export async function readCampaign():Promise<Campaign|undefined>{const bytes=await loadFile(KEY);return bytes?decodeCampaign(bytes):undefined;}
export async function writeCampaign(state:Uint8Array,data:AdventureData):Promise<void>{await storeFile(KEY,encodeCampaign(state,data));}
