import type{GameWorld}from'./world';
import{word,writeWord}from'./profile';
interface LifeEntry{normal:number;before?:number;restore?:number;updated:number}
const address={yoshi:0x379,dkc:0x575};
/** Separate from emulator snapshots: an autosave containing99 cannot erase
 * the counter captured before enabling the cheat. One ledger per save branch. */
export class LifeCheat{
 private entries:Partial<Record<GameWorld,LifeEntry>>={};
 constructor(private key:string,private storage:Pick<Storage,'getItem'|'setItem'>){
  try{const data=JSON.parse(storage.getItem(key)??'{}');for(const world of['yoshi','dkc']as const){const e=data[world],valid=(n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=99;if(e&&valid(e.normal)&&(e.before===undefined||valid(e.before))&&(e.restore===undefined||valid(e.restore)))this.entries[world]={normal:e.normal,before:e.before,restore:e.restore,updated:0};}}catch{}
 }
 private persist():void{this.storage.setItem(this.key,JSON.stringify(this.entries));}
 boot(world:GameWorld,w:Uint8Array,hasSave:boolean,legacyInstall:boolean,enabled:boolean):void{
  if(!hasSave)delete this.entries[world];
  if(!this.entries[world]){
   // One-time requested repair for old saves on installations with cheat settings.
   // A bundled bootstrap/new game always retains its original native value.
   const original=word(w,address[world]),normal=hasSave&&legacyInstall?10:original;
   this.entries[world]={normal,...(normal!==original?{restore:normal}:{}),updated:0};this.persist();writeWord(w,address[world],normal);
  }
  const pending=this.entries[world]?.restore;if(pending!==undefined)writeWord(w,address[world],pending);
  this.sync(world,w,enabled);
 }
 receipt(world:GameWorld,w:Uint8Array):()=>void{const captured=this.entries[world],value=word(w,address[world]);return()=>{const e=this.entries[world];if(e!==captured||e?.restore===undefined||value!==e.restore)return;const previous={...e};delete e.restore;try{this.persist();}catch(error){this.entries[world]=previous;throw error;}};}
 sync(world:GameWorld,w:Uint8Array,enabled:boolean,now=Date.now()):void{
  const e=this.entries[world];if(!e)return;
  if(enabled){
   if(e.before===undefined){const before=word(w,address[world]);this.entries[world]={normal:before,before,updated:now};try{this.persist();}catch(error){this.entries[world]=e;throw error;}}
   writeWord(w,address[world],99);
  }else if(e.before!==undefined){
   // Persist restoration before touching RAM; failed storage leaves recovery intact.
   const restored=e.before;this.entries[world]={normal:restored,restore:restored,updated:now};try{this.persist();}catch(error){this.entries[world]=e;throw error;}writeWord(w,address[world],restored);
  }else if(now-e.updated>=20000){const next={...e,normal:word(w,address[world]),updated:now};this.entries[world]=next;try{this.persist();}catch(error){this.entries[world]=e;throw error;}}
 }
}
