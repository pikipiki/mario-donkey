import type {CoreModule} from './engine';
import {bounded} from './startup';
/** Emscripten OpenAL uses numeric object keys, not an Array. */
export function nativeAudioContexts(module:Pick<CoreModule,'AL'>):AudioContext[]{
 const entries=Object.values(module.AL?.contexts??{});
 if(module.AL?.currentCtx)entries.push(module.AL.currentCtx);
 return [...new Set(entries.map(entry=>entry?.audioCtx).filter((ctx):ctx is AudioContext=>Boolean(ctx)))];
}
/** Invoke resume synchronously in the tap handler, before waiting on any promise. */
export async function resumeNativeAudio(module:Pick<CoreModule,'AL'>,volume:()=>void):Promise<void>{
 const pending=nativeAudioContexts(module).map(ctx=>{
  try{return ctx.state==='running'?Promise.resolve():ctx.resume().catch(()=>{});}catch{return Promise.resolve();}
 });
 volume();await bounded(Promise.all(pending),500,[]);
}
