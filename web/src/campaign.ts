import { type AdventureData } from './adventure';
import { loadFile,storeFile } from './storage';
import {validateNativeState} from './snapshot';
const KEY='campaign-v2-original-dkc-eu-snes9x-2.0.2';
export interface Campaign {state:Uint8Array;adventure:AdventureData}
export function encodeCampaign(state:Uint8Array,adventure:AdventureData):Uint8Array{
 const json=new TextEncoder().encode(JSON.stringify(adventure));const bytes=new Uint8Array(4+json.length+state.length);
 new DataView(bytes.buffer).setUint32(0,json.length,true);bytes.set(json,4);bytes.set(state,4+json.length);return bytes;
}
export function decodeCampaign(bytes:Uint8Array):Campaign{
 if(bytes.length<4)throw new Error('This save is incomplete.');const length=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0,true);
 if(length>2_000_000||4+length>=bytes.length)throw new Error('This save is invalid.');
 const adventure=JSON.parse(new TextDecoder().decode(bytes.subarray(4,4+length))) as AdventureData;
 if(!adventure||adventure.version!==2||!Array.isArray(adventure.available)||!Array.isArray(adventure.animals)||!Array.isArray(adventure.pickups))throw new Error('This save version is not supported.');return {adventure,state:bytes.slice(4+length)};
}
export async function readCampaign():Promise<Campaign|undefined>{
 const bytes=await loadFile(KEY);if(!bytes)return;
 const campaign=decodeCampaign(bytes);validateNativeState(campaign.state);return campaign;
}
export async function writeCampaign(state:Uint8Array,data:AdventureData):Promise<void>{
 validateNativeState(state);await storeFile(KEY,encodeCampaign(state,data));
}

/** Independent copy: normal autosaves never replace the pre-repair state. */
export async function backupCampaign(campaign:Campaign,reason:'display-repair'|'goal-handoff'='display-repair'):Promise<void>{
 validateNativeState(campaign.state);
 await storeFile(KEY+'-before-'+reason,encodeCampaign(campaign.state,campaign.adventure));
}
