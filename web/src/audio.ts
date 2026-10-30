import type {CoreModule} from './engine';
import {bounded} from './startup';
/** WebKit otherwise treats Web Audio as ambient and can mute a running context
 * with the iPhone silent switch. Configure this before creating/resuming it. */
export function requestPlaybackAudio(host: {audioSession?:{type:string}}):boolean{
 try{if(!host.audioSession)return false;if(host.audioSession.type!=='playback')host.audioSession.type='playback';return host.audioSession.type==='playback';}catch{return false;}
}
/** Emscripten OpenAL uses numeric object keys, not an Array. */
export function nativeAudioContexts(module:Pick<CoreModule,'AL'>):AudioContext[]{
 const entries=Object.values(module.AL?.contexts??{});
 if(module.AL?.currentCtx)entries.push(module.AL.currentCtx);
 return [...new Set(entries.map(entry=>entry?.audioCtx).filter((ctx):ctx is AudioContext=>Boolean(ctx)))];
}
/** Invoke resume synchronously in the tap handler, before waiting on any promise. */
export async function resumeNativeAudio(module:Pick<CoreModule,'AL'>,volume:()=>void):Promise<void>{
 const pending=nativeAudioContexts(module).map(ctx=>{
  try{return ctx.resume().catch(()=>{});}catch{return Promise.resolve();}
 });
 volume();await bounded(Promise.all(pending),500,[]);
}

/** An unmuted silent media element activates iOS media playback independently of
 * Web Audio's ambient route (WebKit bug 237322). Call inside the original gesture. */
export function unlockMediaPlayback(media:Pick<HTMLMediaElement,'play'>):void{
 try{void media.play().catch(()=>{});}catch{}
}

/** The sound action is also a playback action: a running context remains silent
 * while the pause/menu policy holds the native mixer at volume zero. */
export function restoreGameSound(game:{paused:boolean;unlockAudio():Promise<void>},resume:()=>void):Promise<void>{
 if(game.paused)resume();
 return game.unlockAudio();
}
