import {describe,it,expect,vi} from 'vitest';
import {restoreGameSound,nativeAudioContexts,resumeNativeAudio,requestPlaybackAudio,unlockMediaPlayback} from '../src/audio';
import type {CoreModule} from '../src/engine';
const context=(state='suspended',resume=vi.fn().mockResolvedValue(undefined))=>({state,resume}) as unknown as AudioContext;
describe('native OpenAL audio',()=>{
 it('supports the numeric-keyed object used by the real core and deduplicates currentCtx',()=>{
  const audioCtx=context(),module={AL:{contexts:{17:{audioCtx}},currentCtx:{audioCtx}}} as Pick<CoreModule,'AL'>;
  expect(nativeAudioContexts(module)).toEqual([audioCtx]);
 });
 it('also accepts sparse arrays and a current context without a registry',()=>{
  const audioCtx=context(),contexts=[];contexts[8]={audioCtx};
  expect(nativeAudioContexts({AL:{contexts}} as Pick<CoreModule,'AL'>)).toEqual([audioCtx]);
  expect(nativeAudioContexts({AL:{currentCtx:{audioCtx}}} as Pick<CoreModule,'AL'>)).toEqual([audioCtx]);
 });
 it('resumes all contexts and sets volume synchronously within the gesture',async()=>{
  const a=context(),b=context('interrupted'),volume=vi.fn();
  const pending=resumeNativeAudio({AL:{contexts:{1:{audioCtx:a},8:{audioCtx:b}}}} as Pick<CoreModule,'AL'>,volume);
  expect(a.resume).toHaveBeenCalledOnce();expect(b.resume).toHaveBeenCalledOnce();expect(volume).toHaveBeenCalledOnce();await pending;
 });
 it('does not let a blocked context prevent the others or hang the game',async()=>{
  vi.useFakeTimers();try{
   const a=context('suspended',vi.fn(()=>{throw new Error('blocked');})),b=context('suspended',vi.fn(()=>new Promise(()=>{}))),c=context();
   const pending=resumeNativeAudio({AL:{contexts:{1:{audioCtx:a},2:{audioCtx:b},3:{audioCtx:c}}}} as Pick<CoreModule,'AL'>,vi.fn());
   expect(c.resume).toHaveBeenCalledOnce();await vi.advanceTimersByTimeAsync(500);await pending;
  }finally{vi.useRealTimers();}
 });
});

describe('iPhone playback session',()=>{
 it('requests playback before unlocking instead of leaving running Web Audio ambient',()=>{
  const host={audioSession:{type:'ambient'}};
  expect(requestPlaybackAudio(host)).toBe(true);expect(host.audioSession.type).toBe('playback');
 });
 it('supports browsers without the API and denied session changes',()=>{
  expect(requestPlaybackAudio({})).toBe(false);
  expect(requestPlaybackAudio({get audioSession():{type:string}{throw new Error('unsupported');}})).toBe(false);
 });
});

describe('iPhone media playback recovery',()=>{
 it('starts media synchronously in the gesture even when a running context was silent',()=>{
 const media={play:vi.fn().mockResolvedValue(undefined)};unlockMediaPlayback(media);expect(media.play).toHaveBeenCalledOnce();
 });
 it('does not crash startup when media playback is refused',async()=>{
 expect(()=>unlockMediaPlayback({play:()=>{throw new Error('blocked');}})).not.toThrow();
 unlockMediaPlayback({play:()=>Promise.reject(new Error('gesture required'))});await Promise.resolve();
 });
 it('requests resume even if state still says running during an interruption',async()=>{
 const audioCtx=context('running');await resumeNativeAudio({AL:{currentCtx:{audioCtx}}} as Pick<CoreModule,'AL'>,vi.fn());expect(audioCtx.resume).toHaveBeenCalledOnce();
 });
 it('leaves an active playback session untouched instead of reconfiguring it on each tap',()=>{
 const setter=vi.fn();const session={get type(){return 'playback';},set type(value:string){setter(value);}};expect(requestPlaybackAudio({audioSession:session})).toBe(true);expect(setter).not.toHaveBeenCalled();
 });
});

it('the sound action resumes a paused menu before restoring mixer volume, even when the context already says running',async()=>{const ctx=context('running');let volume=0;const game={paused:true,unlockAudio:()=>resumeNativeAudio({AL:{currentCtx:{audioCtx:ctx}}}as Pick<CoreModule,'AL'>,()=>{volume=game.paused?0:1;})};const resume=vi.fn(()=>{game.paused=false;});const pending=restoreGameSound(game,resume);expect(resume).toHaveBeenCalledOnce();expect(volume).toBe(1);expect(ctx.resume).toHaveBeenCalled();await pending;});
it('restores audio in an already playing game without toggling its pause state',async()=>{const resume=vi.fn(),unlockAudio=vi.fn().mockResolvedValue(undefined);await restoreGameSound({paused:false,unlockAudio},resume);expect(resume).not.toHaveBeenCalled();expect(unlockAudio).toHaveBeenCalledOnce();});
