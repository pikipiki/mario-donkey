import {parentAudioHost} from './audio-host';
import {requestPlaybackAudio,unlockMediaPlayback} from './audio';
export interface NativeAudioSlot {audioCtx:AudioContext;gain?:GainNode}
export interface CoreModule { HEAPU8: Uint8Array; AL?: { contexts?: Record<string,NativeAudioSlot> | Array<NativeAudioSlot>; currentCtx?: NativeAudioSlot } }
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
export interface Emulator {isSafari?:boolean;isMobile?:boolean; webgl2Enabled?:boolean;supportsWebgl2?:boolean;gameManager: GameManager; frontend?: {canvas: HTMLCanvasElement}; paused: boolean; togglePlaying(): void; setVolume(value: number): void; Module: CoreModule }
declare global { interface Window { EJS_emulator: Emulator; [key: `EJS_${string}`]: unknown } }
export const INPUT={b:0,y:1,select:2,start:3,up:4,down:5,left:6,right:7,a:8} as const;
export const iosDevice=()=>/iPad|iPhone|iPod|CriOS/.test(navigator.userAgent)||/iPad|iPhone|iPod/.test(navigator.platform)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const NativeAudio=typeof window==='undefined'?undefined:window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
let sharedAudio:AudioContext|undefined,audioShimmed=false;
let mediaUnlock:HTMLAudioElement|undefined;
function shareAudioContext():void{
 if(audioShimmed||!NativeAudio||!sharedAudio||(!parentAudioHost(window)&&!iosDevice()&&navigator.maxTouchPoints<1))return;
 audioShimmed=true;
 const share=function SharedAudio(this:unknown){return sharedAudio;} as unknown as typeof AudioContext;
 share.prototype=NativeAudio.prototype;
 window.AudioContext=share;(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext=share;
}
/** Create and resume audio inside a completed tap. Mobile blocks this on pointerdown. */
export function primeAudio():void{
 const host=parentAudioHost(window);if(host){host.prime();sharedAudio=host.context;shareAudioContext();return;}
 // Retain a real media session across the asynchronous ROM/core load. A running
 // AudioContext alone does not prove that iOS routes it to an audible output.
 if(iosDevice()){
  if(!mediaUnlock){mediaUnlock=new Audio(`${import.meta.env.BASE_URL}audio/ios-unlock.wav`);mediaUnlock.loop=true;mediaUnlock.preload='auto';mediaUnlock.setAttribute('playsinline','');}
  unlockMediaPlayback(mediaUnlock);
 }
 requestPlaybackAudio(navigator as Navigator & {audioSession?:{type:string}});
 if(!NativeAudio)return;
 if(!sharedAudio||sharedAudio.state==='closed')sharedAudio=new NativeAudio();
 const ctx=sharedAudio;
 if(ctx.state==='running'){shareAudioContext();return;}
 try{const buffer=ctx.createBuffer(1,1,22050),src=ctx.createBufferSource();src.buffer=buffer;src.connect(ctx.destination);src.start();}catch{}
 void ctx.resume().catch(()=>{});
 shareAudioContext();
}

export function findUnique(bytes: Uint8Array, signature: Uint8Array): number {
 const found: number[]=[];let from=0;
 while(from<bytes.length){const index=bytes.indexOf(signature[0],from);if(index<0)break;
  if(signature.every((b,j)=>bytes[index+j]===b))found.push(index);from=index+1;
 }
 if(found.length!==1)throw new Error(`Memory access denied: ${found.length} signatures found.`);
 return found[0];
}

/** Wait for emulated frames rather than a desktop-sized wall-clock delay. */
export async function waitForNativeFrames(manager:GameManager):Promise<void>{
 if(!manager.functions?.getFrameNum){await new Promise<void>(r=>setTimeout(r,300));return;}
 let previous=manager.functions.getFrameNum(),changes=0;const began=Date.now();
 while(changes<2){
  const current=manager.functions.getFrameNum();if(current!==previous){changes++;previous=current;}
  if(Date.now()-began>10000)throw new Error('The SNES core is not drawing. Reload the game.');
  await new Promise<void>(r=>setTimeout(r,16));
 }
}

/** toggleMainLoop requests a pause; the native loop acknowledges it on its
 * next iteration. The bundled runtime exposes no pause/Asyncify acknowledgement.
 * Observe a quiet frame counter before serializing instead of capturing in the
 * same JavaScript turn as the request. Leave the console paused on every path. */
export async function waitForNativePause(manager:GameManager):Promise<void>{
 manager.toggleMainLoop(0);
 if(typeof manager.functions?.getFrameNum!=='function')throw new Error('The SNES pause could not be verified. Your previous save has been kept.');
 let previous=manager.functions.getFrameNum();
 if(!Number.isFinite(previous))throw new Error('The SNES pause could not be verified. Your previous save has been kept.');
 const began=Date.now();let quietSince=began;
 while(true){
  await new Promise<void>(resolve=>setTimeout(resolve,16));
  const now=Date.now(),current=manager.functions.getFrameNum();
  if(!Number.isFinite(current))throw new Error('The SNES pause could not be verified. Your previous save has been kept.');
  if(current!==previous){quietSince=now;previous=current;}
  if(now-began>=2000)throw new Error('The SNES core did not pause. Your previous save has been kept.');
  if(now-quietSince>=100)return;
 }
}

/** loadState queues a native task. Do not expose probe memory or begin another
 * probe until that task has run; otherwise its markers enter the next snapshot. */
async function finishProbeRestore(manager:GameManager,state:Uint8Array):Promise<void>{
 manager.loadState(state);
 manager.toggleMainLoop(1);
 try{await waitForNativeFrames(manager);}
 finally{manager.toggleMainLoop(0);}
}

/** Some core builds apply cheats only on a native frame. Restore the complete
 * pre-probe save state before exposing the resolved memory to game logic. */
export async function resolveMemory(manager:GameManager,address:number,offset:number,length:number,restoreAfterProbe=true):Promise<number>{
 const marker=new Uint8Array([0xd3,0x71,0x95,0x2b,0xe8,0x46,0xac,0x19]);
 const state=restoreAfterProbe?new Uint8Array(manager.getState()):undefined;let ran=false;
 try{
  marker.forEach((value,i)=>manager.setCheat(i,true,(address+i).toString(16).padStart(6,'0')+value.toString(16).padStart(2,'0')));
  // The bundled core normally applies PAR immediately. Keep the console
  // paused whenever possible; no frame or state reload is then necessary.
  try{
   const base=findUnique(manager.Module.HEAPU8,marker)-offset;
   if(base>=0&&base+length<=manager.Module.HEAPU8.length)return base;
  }catch{}
  ran=true;manager.toggleMainLoop(1);
  await waitForNativeFrames(manager);
  manager.toggleMainLoop(0);
  const pointer=findUnique(manager.Module.HEAPU8,marker),base=pointer-offset;
  if(base<0||base+length>manager.Module.HEAPU8.length)throw new Error('Memory region is out of range.');
  return base;
 }finally{manager.toggleMainLoop(0);manager.resetCheat();if(ran&&state)await finishProbeRestore(manager,state);}
}

export async function launch(rom: Uint8Array, onStatus: (text: string)=>void,gameName='Kong Island'): Promise<Emulator> {
 onStatus('Loading the SNES core…');
 const ios=iosDevice()||(import.meta.env.DEV&&new URLSearchParams(location.search).has('legacy'));
 return await new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(ok:boolean,value?:Emulator|Error)=>{if(settled)return;settled=true;window.clearTimeout(timeout);window.clearInterval(watch);ok?resolve(value as Emulator):reject(value);};
  const timeout=window.setTimeout(()=>finish(false,new Error('The SNES core is taking too long to load. Try again.')),45000);
  const watch=window.setInterval(()=>{
   const error=document.querySelector('#emulator .ejs_error_text')?.textContent?.trim();
   if(error){finish(false,new Error(error));return;}
   const progress=document.querySelector('#emulator .ejs_loading_text')?.textContent?.trim();
   if(progress)onStatus(progress);
  },400);
  Object.assign(window,{
   EJS_player:'#emulator',EJS_core:'snes9x',EJS_gameName:gameName,
   EJS_gameUrl:new Blob([rom.slice().buffer],{type:'application/octet-stream'}),
   EJS_pathtodata:`${import.meta.env.BASE_URL}emulator/`,EJS_startOnLoaded:true,EJS_volume:1,
   EJS_language:'en-US',EJS_disableAutoLang:true,EJS_threads:false,EJS_noAutoFocus:true,
   EJS_forceLegacyCores:ios,EJS_disableDatabases:ios,
   EJS_disableLocalStorage:true,EJS_controlScheme:'none',EJS_virtualGamepad:false,
   EJS_defaultOptions:{'vsync':ios?'disabled':'enabled','fps':'disabled','webgl2Enabled':ios?'disabled':'enabled'},
   EJS_Buttons:{playPause:false,restart:false,mute:false,settings:false,fullscreen:false,saveState:false,loadState:false,screenRecord:false,gamepad:false,cheat:false,volume:false,saveSavFiles:false,loadSavFiles:false,quickSave:false,quickLoad:false,screenshot:false,cacheManager:false},
   EJS_ready:()=>{if(import.meta.env.DEV&&new URLSearchParams(location.search).has('ios-audio-test')){window.EJS_emulator.isSafari=true;window.EJS_emulator.isMobile=true;}},
   EJS_onGameStart:()=>{void sharedAudio?.resume().catch(()=>{});finish(true,window.EJS_emulator);},
  });
  const script=document.createElement('script');script.src=`${import.meta.env.BASE_URL}emulator/loader.js`;
  script.onerror=()=>finish(false,new Error('Couldn’t load the local core.'));document.body.append(script);
 });
}

const DRAW_SIGNATURE=new Uint8Array([0xad,0x1a,0x61,0xf0,0x6e,0xad,0xae,0x61,0x0d,0x57,0x0b]);
const HIDDEN_DRAW=new Uint8Array([0xa9,0,0]);
/** A state-file copy may duplicate the ROM signature. Identify the live ROM by
 * a reversible CPU-address probe, restoring the state before gameplay resumes. */
export async function resolveDrawing(manager:GameManager,restoreAfterProbe=true):Promise<number>{
 const heap=manager.Module.HEAPU8,candidates:number[]=[];
 for(let i=0;i<=heap.length-DRAW_SIGNATURE.length;i++)if(heap[i]===DRAW_SIGNATURE[0]&&DRAW_SIGNATURE.every((b,j)=>heap[i+j]===b))candidates.push(i);
 if(candidates.length===1)return candidates[0];
 if(!candidates.length)throw new Error('Yoshi’s draw routine was not found.');
 const saved=restoreAfterProbe?new Uint8Array(manager.getState()):undefined;let pointer:number|undefined,ran=false;
 try{
  HIDDEN_DRAW.forEach((b,i)=>manager.setCheat(100+i,true,(0x04faeb+i).toString(16).padStart(6,'0')+b.toString(16).padStart(2,'0')));
  const immediate=candidates.filter(p=>HIDDEN_DRAW.every((b,j)=>manager.Module.HEAPU8[p+j]===b));
  if(immediate.length===1){pointer=immediate[0];return pointer;}
  ran=true;manager.toggleMainLoop(1);await waitForNativeFrames(manager);manager.toggleMainLoop(0);
  const live=candidates.filter(p=>HIDDEN_DRAW.every((b,j)=>manager.Module.HEAPU8[p+j]===b));
  if(live.length!==1)throw new Error(`Yoshi’s draw routine is ambiguous: ${candidates.length} copies, ${live.length} modified.`);pointer=live[0];return pointer;
 }finally{
  manager.toggleMainLoop(0);manager.resetCheat();
  if(pointer!==undefined)manager.Module.HEAPU8.set(DRAW_SIGNATURE.subarray(0,3),pointer);
  if(ran&&saved)await finishProbeRestore(manager,saved);
 }
}
export function setNativeDrawing(heap:Uint8Array,pointer:number,hidden:boolean):void{
 const normal=DRAW_SIGNATURE.subarray(0,3);
 if(!Number.isInteger(pointer)||pointer<0||pointer+DRAW_SIGNATURE.length>heap.length||
  !DRAW_SIGNATURE.subarray(3).every((b,j)=>heap[pointer+3+j]===b)||
  ![normal,HIDDEN_DRAW].some(sig=>sig.every((b,j)=>heap[pointer+j]===b)))throw new Error('The draw routine was modified: access denied.');
 heap.set(hidden?HIDDEN_DRAW:normal,pointer);
}

/** Release only this frame's native mixer. The parent audio session must survive. */
export function detachNativeMixer(module:Pick<CoreModule,'AL'>):void{
 const slots=[...Object.values(module.AL?.contexts??{}),module.AL?.currentCtx];
 for(const slot of new Set(slots))try{slot?.gain?.disconnect();}catch{}
}
