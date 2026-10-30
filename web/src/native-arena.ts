import{DKC,readDkcScene}from'./dkc-profile';
import{Adventure,type AdventureData}from'./adventure';
import{word}from'./profile';
export type NativeArenaBoss='burt'|'salvo'|'bigger-boo'|'milde'|'froggy'|'raphael'|'tap-tap';
export type NativeDkcBoss='gnawty'|'necky'|'queen-b'|'really-gnawty'|'dumb-drum'|'necky-snr'|'k-rool';
export type ArenaBoss=NativeArenaBoss|NativeDkcBoss;
export const DKC_ARENAS={gnawty:{entrance:224,name:'Very Gnawty'},necky:{entrance:225,name:'Master Necky'},'queen-b':{entrance:229,name:'Queen B.'},'really-gnawty':{entrance:226,name:'Really Gnawty'},'dumb-drum':{entrance:227,name:'Dumb Drum'},'necky-snr':{entrance:228,name:'Master Necky Snr.'},'k-rool':{entrance:104,name:'King K. Rool'}}as const;
export const NATIVE_ARENAS={burt:{room:0x3d,stage:3,x:5,y:0x63,name:'Bélixo'},salvo:{room:0x70,stage:7,x:0x21,y:0x79,name:'Salvo'},'bigger-boo':{room:0x74,stage:15,x:0xc4,y:0x76,name:'Bigger Boo'},milde:{room:0x82,stage:39,x:2,y:0x79,name:'Milde'},'tap-tap':{room:0xcc,stage:64,x:0x4c,y:0x76,name:'Tap-Tap'},froggy:{room:0xbf,stage:31,x:0x15,y:0x6b,name:'Prince Froggy'},raphael:{room:0xcb,stage:55,x:8,y:8,name:'Raphaël'}}as const;
export interface ArenaTrip{version:1;id:string;boss:ArenaBoss;sourceWorld?:'yoshi'|'dkc';sourceLevel:number;lives:number;party:AdventureData;phase:'fight'|'won'|'lost'|'abandoned'|'consumed'}
const validId=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s);
export function nativeArenaBoss(value:unknown):value is NativeArenaBoss{return typeof value==='string'&&Object.prototype.hasOwnProperty.call(NATIVE_ARENAS,value);}
export function arenaRoute(search=typeof location==='undefined'?'':location.search):{id:string;returning:boolean}|undefined{const p=new URLSearchParams(search),id=p.get('native-arena')??p.get('arena-return');return validId(id)?{id,returning:p.has('arena-return')}:undefined;}
export const ACTIVE_ARENA_KEY='native-arena-active-v1';
export const tripKey=(id:string)=>`native-arena-trip-v1::${id}`;
export const sourceKey=(id:string)=>`native-arena-source-v1::${id}`;
export function arenaCampaignKey(key:string,search?:string):string{const r=arenaRoute(search);return r&&!r.returning?`native-arena-campaign-v1::${r.id}::${key}`:key;}
export function arenaUrl(href:string,id:string,returning=false,sourceWorld:'yoshi'|'dkc'='dkc'):string{if(!validId(id))throw Error('Invalid arena session');const u=new URL(href);for(const k of['native-arena','arena-return','pipe','fresh','cheat-map','cheat-reload'])u.searchParams.delete(k);u.searchParams.set('world',returning?sourceWorld:sourceWorld==='dkc'?'yoshi':'dkc');u.searchParams.set(returning?'arena-return':'native-arena',id);return u.href;}
export function encodeTrip(t:ArenaTrip):Uint8Array{return new TextEncoder().encode(JSON.stringify(t));}
export function decodeTrip(bytes:Uint8Array|undefined):ArenaTrip|undefined{if(!bytes||bytes.length>65536)return;try{const t=JSON.parse(new TextDecoder().decode(bytes));if(t.version!==1||(t.sourceWorld!==undefined&&t.sourceWorld!=='dkc'&&t.sourceWorld!=='yoshi')||!validId(t.id)||!(t.sourceWorld==='yoshi'?typeof t.boss==='string'&&Object.prototype.hasOwnProperty.call(DKC_ARENAS,t.boss):nativeArenaBoss(t.boss))||!Number.isInteger(t.sourceLevel)||t.sourceLevel<(t.sourceWorld==='yoshi'?0:1)||t.sourceLevel>(t.sourceWorld==='yoshi'?71:0xea)||!Number.isInteger(t.lives)||t.lives<0||t.lives>99||!['fight','won','lost','abandoned','consumed'].includes(t.phase)||t.party?.version!==2||!Array.isArray(t.party.available)||!Array.isArray(t.party.animals))return;return{...t,party:new Adventure(t.party).serialize()};}catch{return;}}
/** The engine creates a boss key only after its original defeat sequence.
 * Never infer victory from elapsed time, HP copies, a fade or returning to map. */
export function arenaOutcome(w:Uint8Array,g:Uint8Array,boss:NativeArenaBoss,entered:boolean):'won'|'lost'|undefined{
 if(!entered)return;const mode=w[0x118];
 // EU modes: retry/death completion and game-over screens, or overworld.
 if([0x17,0x19,0x3f,0x41,0x43,0x44,0x26].includes(mode))return'lost';
 if(word(w,0x21a)!==NATIVE_ARENAS[boss].stage)return;
 if(mode===0x14)return'won';
 if(mode===0x13)for(let i=0;i<24;i++){const o=i*4;if(word(g,0xf00+o)!==0&&word(g,0x1360+o)===0x14)return'won';}
}

/** Player OBJ cache written by the original GSU renderer. These are projected
 * screen coordinates, unlike world X/Y during Raphael's rotating Mode7 scene. */
export function nativeYoshiAnchor(g:Uint8Array,size=16,expectedX=128):{x:number;y:number}|undefined{
 // Native Yoshi uses OBJ palette5 and the player tile range00..1F. Sprite0's
 //1362 cache belongs to Baby Mario and may be far from Yoshi after a hit.
 let left=Infinity,right=-Infinity,bottom=-Infinity;
 for(let at=0x200;at<Math.min(g.length,0xa00);at+=8){const attr=g[at+5];if((attr&14)!==10||g[at+4]>=0x20)continue;let x=word(g,at)&511;if(x>=256)x-=512;const y=(word(g,at+2)-1)&255;if(y>=224||Math.abs(x+size/2-expectedX)>32)continue;left=Math.min(left,x);right=Math.max(right,x+size);bottom=Math.max(bottom,y+size);}
 return Number.isFinite(left)&&right-left<=64?{x:(left+right)/2,y:bottom}:undefined;
}

export function arenaStorageKey(key:string,search?:string):string{return /^(campaign-v|dkc-campaign-v|dkc-map-v|world-party-v)/.test(key)?arenaCampaignKey(key,search):key;}

export function dkcArenaOutcome(w:Uint8Array,boss:NativeDkcBoss,entered:boolean):'won'|'lost'|undefined{
 if(!entered)return;const scene=readDkcScene(w);
 if(scene.level===DKC_ARENAS[boss].entrance)for(let slot=6;slot<0x34;slot+=2)if(word(w,DKC.id+slot)===0x74&&word(w,DKC.state+slot)<=3)return'won';
 if(scene.isMap)return'lost';
}

export function arenaLives(w:Uint8Array,world:'yoshi'|'dkc'):number{const raw=word(w,world==='dkc'?0x575:0x379);return raw<=99?raw:0;}

export function canStartArena(game:{ready:boolean;paused:boolean;nativeArenaMode:boolean},busy:boolean,returning:boolean):boolean{return game.ready&&!game.paused&&!game.nativeArenaMode&&!busy&&!returning;}
