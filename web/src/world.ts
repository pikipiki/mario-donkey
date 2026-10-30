import {Adventure,type AdventureData} from './adventure';
export type GameWorld='yoshi'|'dkc';
export const WORLD_PARTY_KEY='world-party-v1';
export const ACTIVE_WORLD_KEY='kong-active-world-v1';
export const DKC_ROM_SHA256='628147468c3539283197f58f03b94df49758a332831857481ea9cc31645f0527';
/** An explicit URL always wins, including returning from a saved DKC world. */
export function currentWorld(search:string,lastWorld?:string|null):GameWorld{
 const params=new URLSearchParams(search);
 if(params.has('world'))return params.get('world')==='dkc'?'dkc':'yoshi';
 return lastWorld==='dkc'?'dkc':'yoshi';
}
export function worldUrl(href:string,target:GameWorld):string{
 const url=new URL(href);url.searchParams.set('world',target);url.searchParams.set('pipe','1');url.searchParams.delete('fresh');url.searchParams.delete('native-arena');url.searchParams.delete('arena-return');return url.href;
}
/** Transfer companions, never another game's room objects or exit guardian. */
export function encodeWorldParty(data:AdventureData):Uint8Array{
 const clean=new Adventure(data).serialize();clean.pickups=[];delete clean.guardian;delete clean.nativeArenaReceipt;
 return new TextEncoder().encode(JSON.stringify(clean));
}
export function decodeWorldParty(bytes:Uint8Array|undefined):AdventureData|undefined{
 if(!bytes||bytes.length>32768)return;
 try{
  const data=JSON.parse(new TextDecoder().decode(bytes));
  if(!data||data.version!==2||data.characterSet!==1||!Array.isArray(data.available)||!Array.isArray(data.animals))return;
  const clean=new Adventure(data).serialize();clean.pickups=[];delete clean.guardian;delete clean.nativeArenaReceipt;return clean;
 }catch{return;}
}

/** Only a pipe journey auto-starts. Remove the marker before async work so a
 * reload after a startup error cannot loop indefinitely. */
export function pipeArrival(href:string):{arrival:boolean;cleanUrl:string}{const url=new URL(href),arrival=url.searchParams.get('pipe')==='1';url.searchParams.delete('pipe');return{arrival,cleanUrl:url.href};}
