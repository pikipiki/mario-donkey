import {describe,it,expect,vi} from 'vitest';
import {bounded,readBeforeDeadline} from '../src/startup';
describe('mobile startup',()=>{
 it('continues when browser audio or storage never settles',async()=>{
  vi.useFakeTimers();try{const pending=bounded(new Promise<string>(()=>{}),500,'continue');await vi.advanceTimersByTimeAsync(500);expect(await pending).toBe('continue');}finally{vi.useRealTimers();}
 });
 it('keeps successful operations and clears its timer',async()=>{vi.useFakeTimers();try{expect(await bounded(Promise.resolve('save'),500,'fallback')).toBe('save');expect(vi.getTimerCount()).toBe(0);}finally{vi.useRealTimers();}});
});

it('does not treat a timed-out save read as a missing save',async()=>{
 vi.useFakeTimers();try{
  const result=readBeforeDeadline(new Promise<Uint8Array>(()=>{}),4000).catch(error=>error);
  await vi.advanceTimersByTimeAsync(4000);expect(await result).toBeInstanceOf(Error);
  expect(await readBeforeDeadline(Promise.resolve(undefined),4000)).toBeUndefined();
 }finally{vi.useRealTimers();}
});
