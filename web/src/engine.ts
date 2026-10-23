export interface CoreModule { HEAPU8: Uint8Array; AL?: { contexts?: Array<{audioCtx: AudioContext}>; currentCtx?: {audioCtx: AudioContext} } }
export interface GameManager {
 Module: CoreModule;
 simulateInput(player: number, index: number, value: number): void;
 setCheat(index: number, enabled: boolean, code: string): void;
 resetCheat(): void;
 toggleMainLoop(value: number): void;
 getState(): Uint8Array;
 loadState(state: Uint8Array): void;
 functions: { getVideoDimensions(kind:string):number; getFrameNum(): number; setFastForwardRatio(value: number): void; toggleFastForward(value: number): void };
}
export interface Emulator { gameManager: GameManager; frontend?: {canvas: HTMLCanvasElement}; paused: boolean; togglePlaying(): void; setVolume(value: number): void; Module: CoreModule }
declare global { interface Window { EJS_emulator: Emulator; [key: `EJS_${string}`]: unknown } }
export const INPUT={b:0,y:1,select:2,start:3,up:4,down:5,left:6,right:7,a:8} as const;
export const iosDevice=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let sharedAudio:AudioContext|undefined;
/** Create and resume audio inside the tap, then reuse that context. iOS drops audio created later. */
export function primeAudio():void{
 const Native=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
 if(!Native)return;
 if(!sharedAudio||sharedAudio.state==='closed')sharedAudio=new Native();
 void sharedAudio.resume().catch(()=>{});
 if(!iosDevice())return;
 const share=function SharedAudio(this:unknown){return sharedAudio;} as unknown as typeof AudioContext;
 share.prototype=Native.prototype;
 window.AudioContext=share;(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext=share;
}

export function findUnique(bytes: Uint8Array, signature: Uint8Array): number {
 const found: number[]=[];let from=0;
 while(from<bytes.length){const index=bytes.indexOf(signature[0],from);if(index<0)break;
  if(signature.every((b,j)=>bytes[index+j]===b))found.push(index);from=index+1;
 }
 if(found.length!==1)throw new Error(`Accès mémoire refusé : ${found.length} signatures trouvées.`);
 return found[0];
}

/** Wait for emulated frames rather than a desktop-sized wall-clock delay. */
async function waitForNativeFrames(manager:GameManager):Promise<void>{
 if(!manager.functions?.getFrameNum){await new Promise<void>(r=>setTimeout(r,300));return;}
 const first=manager.functions.getFrameNum(),began=Date.now();
 while(manager.functions.getFrameNum()<first+2){
  if(Date.now()-began>10000)throw new Error('Le moteur SNES ne produit pas d’image. Recharge le jeu.');
  await new Promise<void>(r=>setTimeout(r,16));
 }
}

/** Some core builds apply cheats only on a native frame. Restore the complete
 * pre-probe save state before exposing the resolved memory to game logic. */
export async function resolveMemory(manager:GameManager,address:number,offset:number,length:number):Promise<number>{
 const marker=new Uint8Array([0xd3,0x71,0x95,0x2b,0xe8,0x46,0xac,0x19]);
 const state=new Uint8Array(manager.getState());
 try{
  marker.forEach((value,i)=>manager.setCheat(i,true,(address+i).toString(16).padStart(6,'0')+value.toString(16).padStart(2,'0')));
  manager.toggleMainLoop(1);
  await waitForNativeFrames(manager);
  manager.toggleMainLoop(0);
  const pointer=findUnique(manager.Module.HEAPU8,marker),base=pointer-offset;
  if(base<0||base+length>manager.Module.HEAPU8.length)throw new Error('Région mémoire hors limites.');
  return base;
 }finally{manager.toggleMainLoop(0);manager.resetCheat();manager.loadState(state);}
}

export async function launch(rom: Uint8Array, onStatus: (text: string)=>void): Promise<Emulator> {
 onStatus('Chargement du moteur SNES…');
 const ios=iosDevice();
 return await new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(ok:boolean,value?:Emulator|Error)=>{if(settled)return;settled=true;window.clearTimeout(timeout);window.clearInterval(watch);ok?resolve(value as Emulator):reject(value);};
  const timeout=window.setTimeout(()=>finish(false,new Error('Le moteur SNES met trop de temps à charger. Réessaie.')),45000);
  const watch=window.setInterval(()=>{
   const error=document.querySelector('#emulator .ejs_error_text')?.textContent?.trim();
   if(error){finish(false,new Error(error));return;}
   const progress=document.querySelector('#emulator .ejs_loading_text')?.textContent?.trim();
   if(progress)onStatus(progress);
  },400);
  Object.assign(window,{
   EJS_player:'#emulator',EJS_core:'snes9x',EJS_gameName:'Kong Island',
   EJS_gameUrl:new Blob([rom.slice().buffer],{type:'application/octet-stream'}),
   EJS_pathtodata:`${import.meta.env.BASE_URL}emulator/`,EJS_startOnLoaded:true,EJS_volume:0.65,
   EJS_language:'fr-FR',EJS_disableAutoLang:true,EJS_threads:false,EJS_noAutoFocus:true,
   EJS_forceLegacyCores:ios,EJS_disableDatabases:ios,
   EJS_disableLocalStorage:true,EJS_controlScheme:'none',EJS_virtualGamepad:false,
   EJS_defaultOptions:{'vsync':ios?'disabled':'enabled','fps':'disabled'},
   EJS_Buttons:{playPause:false,restart:false,mute:false,settings:false,fullscreen:false,saveState:false,loadState:false,screenRecord:false,gamepad:false,cheat:false,volume:false,saveSavFiles:false,loadSavFiles:false,quickSave:false,quickLoad:false,screenshot:false,cacheManager:false},
   EJS_onGameStart:()=>{void sharedAudio?.resume().catch(()=>{});finish(true,window.EJS_emulator);},
  });
  const script=document.createElement('script');script.src=`${import.meta.env.BASE_URL}emulator/loader.js`;
  script.onerror=()=>finish(false,new Error('Impossible de charger le moteur local.'));document.body.append(script);
 });
}

const DRAW_SIGNATURE=new Uint8Array([0xad,0x1a,0x61,0xf0,0x6e,0xad,0xae,0x61,0x0d,0x57,0x0b]);
const HIDDEN_DRAW=new Uint8Array([0xa9,0,0]);
/** A state-file copy may duplicate the ROM signature. Identify the live ROM by
 * a reversible CPU-address probe, restoring the state before gameplay resumes. */
export async function resolveDrawing(manager:GameManager):Promise<number>{
 const heap=manager.Module.HEAPU8,candidates:number[]=[];
 for(let i=0;i<=heap.length-DRAW_SIGNATURE.length;i++)if(heap[i]===DRAW_SIGNATURE[0]&&DRAW_SIGNATURE.every((b,j)=>heap[i+j]===b))candidates.push(i);
 if(candidates.length===1)return candidates[0];
 if(!candidates.length)throw new Error('Routine de dessin Yoshi introuvable.');
 const saved=new Uint8Array(manager.getState());let pointer:number|undefined;
 try{
  HIDDEN_DRAW.forEach((b,i)=>manager.setCheat(100+i,true,(0x04faeb+i).toString(16).padStart(6,'0')+b.toString(16).padStart(2,'0')));
  manager.toggleMainLoop(1);await waitForNativeFrames(manager);manager.toggleMainLoop(0);
  const live=candidates.filter(p=>HIDDEN_DRAW.every((b,j)=>manager.Module.HEAPU8[p+j]===b));
  if(live.length!==1)throw new Error(`Routine de dessin Yoshi ambiguë : ${candidates.length} copies, ${live.length} modifiées.`);pointer=live[0];return pointer;
 }finally{
  manager.toggleMainLoop(0);manager.resetCheat();manager.loadState(saved);
  if(pointer!==undefined)manager.Module.HEAPU8.set(DRAW_SIGNATURE.subarray(0,3),pointer);
 }
}
export function setNativeDrawing(heap:Uint8Array,pointer:number,hidden:boolean):void{
 const normal=DRAW_SIGNATURE.subarray(0,3);
 if(!Number.isInteger(pointer)||pointer<0||pointer+DRAW_SIGNATURE.length>heap.length||
  !DRAW_SIGNATURE.subarray(3).every((b,j)=>heap[pointer+3+j]===b)||
  ![normal,HIDDEN_DRAW].some(sig=>sig.every((b,j)=>heap[pointer+j]===b)))throw new Error('Routine de dessin modifiée : accès refusé.');
 heap.set(hidden?HIDDEN_DRAW:normal,pointer);
}
