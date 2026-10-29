import {afterEach,describe,expect,it,vi} from 'vitest';
import {PipeAudio,travelThroughPipe} from '../src/pipe';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
function fixture(){
 const source={connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:undefined as undefined|(()=>void),buffer:undefined};
 const gain={connect:vi.fn(),disconnect:vi.fn(),gain:{value:0}};
 const context={state:'running',destination:{},decodeAudioData:vi.fn().mockResolvedValue({duration:.659}),createBufferSource:vi.fn(()=>source),createGain:vi.fn(()=>gain)};
 const fetcher=vi.fn().mockResolvedValue({ok:true,arrayBuffer:async()=>new ArrayBuffer(10)});vi.stubGlobal('fetch',fetcher);
 return{source,gain,context:context as unknown as AudioContext,fetcher};
}
describe('Mario pipe between both maps',()=>{
 it('waits for a successful save and the whole sound before navigating',async()=>{
  const events:string[]=[];let ended!:()=>void;
  const result=travelThroughPipe(async()=>{events.push('save');},()=>new Promise<void>(resolve=>{events.push('pipe');ended=resolve;}),()=>events.push('navigate'));
  await Promise.resolve();expect(events).toEqual(['save','pipe']);ended();await result;expect(events).toEqual(['save','pipe','navigate']);
 });
 it('stays on the current map when saving fails; audio failure still allows travel',async()=>{
  const play=vi.fn(),navigate=vi.fn();await expect(travelThroughPipe(async()=>{throw Error('disk');},play,navigate)).rejects.toThrow('disk');expect(play).not.toHaveBeenCalled();expect(navigate).not.toHaveBeenCalled();
  await travelThroughPipe(async()=>{},async()=>{throw Error('audio');},navigate);expect(navigate).toHaveBeenCalledOnce();
 });
 it('preloads once, uses the existing audio context and resolves on the actual ending',async()=>{
  const f=fixture(),audio=new PipeAudio();await Promise.all([audio.prepare(f.context),audio.prepare(f.context)]);expect(f.fetcher).toHaveBeenCalledOnce();
  let finished=false;const played=audio.play(f.context).then(value=>{finished=true;return value;});await Promise.resolve();expect(f.source.start).toHaveBeenCalledOnce();expect(finished).toBe(false);expect(f.gain.connect).toHaveBeenCalledWith(f.context.destination);
  f.source.onended!();expect(await played).toBe(true);expect(audio.played).toBe(1);
 });
 it('does not hang on unavailable or suspended audio, and retries a failed download',async()=>{
  const f=fixture(),audio=new PipeAudio();expect(await audio.play(undefined)).toBe(false);
  f.fetcher.mockRejectedValueOnce(Error('offline'));await audio.prepare(f.context);await audio.prepare(f.context);expect(f.fetcher).toHaveBeenCalledTimes(2);
  Object.assign(f.context,{state:'suspended'});expect(await audio.play(f.context)).toBe(false);expect(f.source.start).not.toHaveBeenCalled();
 });
 it('bounds the transition if a mobile device never dispatches ended',async()=>{
  vi.useFakeTimers();const f=fixture(),audio=new PipeAudio();await audio.prepare(f.context);const played=audio.play(f.context);await Promise.resolve();await vi.advanceTimersByTimeAsync(1200);expect(await played).toBe(true);expect(f.source.disconnect).toHaveBeenCalledOnce();
 });
});
