import{arenaRoute}from'./native-arena';
import{LifeCheat}from'./life-cheat';
import type{GameWorld}from'./world';
import{readDkcScene}from'./dkc-profile';
import{writeWord}from'./profile';
import unlock from'./generated/dkc-unlock.json';
export interface CheatOptions{infiniteLives:boolean;unlockStages:boolean;originWorld?:GameWorld}
export const CHEAT_PREFIX='all-stages-sandbox-v1::';
const settingKey='kong-cheats-v1'+(import.meta.env.DEV&&typeof location!=='undefined'&&new URLSearchParams(location.search).get('test')==='1'?'-test':'');
function readOptions():CheatOptions{try{const s=JSON.parse(localStorage.getItem(settingKey)??'null');return{infiniteLives:s?.infiniteLives===true,unlockStages:s?.unlockStages===true,...(s?.originWorld==='yoshi'||s?.originWorld==='dkc'?{originWorld:s.originWorld}:{})};}catch{return{infiniteLives:false,unlockStages:false};}}
let options=readOptions();
const ledgers=new Map<string,LifeCheat>();
function legacyCheats():boolean{try{const key=settingKey+'-life-migration-v2',known=localStorage.getItem(key);if(known!==null)return known==='legacy';const legacy=localStorage.getItem(settingKey)!==null;localStorage.setItem(key,legacy?'legacy':'new');return legacy;}catch{return false;}}
const legacyInstall=legacyCheats();
function lifeLedger():LifeCheat{const key=cheatStorageKey(settingKey+'-lives-v2');let ledger=ledgers.get(key);if(!ledger){ledger=new LifeCheat(key,localStorage);ledgers.set(key,ledger);}return ledger;}
export function cloneLifeCheatSandbox():void{const key=settingKey+'-lives-v2';localStorage.setItem(cheatStorageKey(key,true),localStorage.getItem(key)??'{}');ledgers.delete(cheatStorageKey(key,true));}
export function bootLifeCheat(world:GameWorld,w:Uint8Array,hasSave:boolean):void{if(arenaRoute()&&!arenaRoute()!.returning)return;lifeLedger().boot(world,w,hasSave,legacyInstall,options.infiniteLives);}
export function syncLifeCheat(world:GameWorld,w:Uint8Array):void{ledgers.get(cheatStorageKey(settingKey+'-lives-v2'))?.sync(world,w,options.infiniteLives);}
const lifeReceipts=new WeakMap<Uint8Array,()=>void>();
export function trackLifeSnapshot(state:Uint8Array,world:GameWorld,w:Uint8Array):void{const ledger=ledgers.get(cheatStorageKey(settingKey+'-lives-v2'));if(ledger)lifeReceipts.set(state,ledger.receipt(world,w));}
export function confirmLifeSnapshot(state:Uint8Array):void{lifeReceipts.get(state)?.();lifeReceipts.delete(state);}

export function cheatOptions():Readonly<CheatOptions>{return options;}
/** Persist first: failed browser storage must never switch a save namespace. */
export function setCheatOptions(next:CheatOptions):void{localStorage.setItem(settingKey,JSON.stringify(next));options={...next};}
const assetKey=(key:string)=>key==='rom'||key==='rom-dkc'||key==='campaign-eu-map-v3-snes9x-2.0.2';
export function cheatStorageKey(key:string,unlocked=options.unlockStages):string{return unlocked&&!assetKey(key)?CHEAT_PREFIX+key:key;}
export function sandboxEntries(entries:readonly(readonly[string,Uint8Array])[]):Array<[string,Uint8Array]>{return entries.filter(([key])=>!key.startsWith(CHEAT_PREFIX)&&!key.startsWith('native-arena-')&&!assetKey(key)).map(([key,value])=>[CHEAT_PREFIX+key,value.slice()]);}
export function cheatReloadUrl(href:string,world:GameWorld,openMap:boolean):string{const u=new URL(href);u.searchParams.set('world',world);u.searchParams.set('cheat-reload','1');if(openMap)u.searchParams.set('cheat-map','1');else u.searchParams.delete('cheat-map');u.searchParams.delete('pipe');u.searchParams.delete('fresh');return u.href;}
/** Native EU debug unlock: 72 stage flags and six twelve-icon map rows.
 * Scores, current room/world and save-file IDs are left intact. */
export function applyYoshiCheats(w:Uint8Array,s:Readonly<CheatOptions>=options):void{
 if(arenaRoute()&&!arenaRoute()!.returning){if(s.infiniteLives)writeWord(w,0x379,99);return;}
 if(s===options)syncLifeCheat('yoshi',w);else if(s.infiniteLives)writeWord(w,0x379,99);
 if(!s.unlockStages)return;
 w[0x216]=1;for(let i=0;i<72;i++){w[0x222+i]=1;w[0x30f+i]=i%12+1;}
}
const nativeRoutes:Array<[number,number,number]>=[];
for(let i=0;i<unlock.connections.length&&unlock.connections[i];i+=3)nativeRoutes.push([unlock.canonical[unlock.connections[i]],unlock.canonical[unlock.connections[i+1]],unlock.canonical[unlock.connections[i+2]]]);
const nativeNodes=[...new Set(nativeRoutes.flat())];
/** Exact USA Rev2 route graph and canonical-entrance table extracted from ROM.
 * FC00 is shared with level banana bitmaps: only edit route cache on a map! */
export function applyDkcCheats(w:Uint8Array,s:Readonly<CheatOptions>=options):void{
 if(arenaRoute()&&!arenaRoute()!.returning){if(s.infiniteLives)writeWord(w,0x575,99);return;}
 if(s===options)syncLifeCheat('dkc',w);else if(s.infiniteLives)writeWord(w,0x575,99);
 if(!s.unlockStages)return;
 for(const node of nativeNodes)w[0x583+node]|=1;
 if(!readDkcScene(w).isMap)return;
 const edge=(from:number,to:number)=>{const base=0xfc00+from*4;for(let j=0;j<4;j++){if(w[base+j]===to)return;if(w[base+j]===0){w[base+j]=to;return;}}};
 for(const node of nativeNodes)if(!w[0xfafc+node])w[0xfafc+node]=1;
 for(const[,a,b]of nativeRoutes){edge(a,b);edge(b,a);}
}
