import {describe,it,expect,vi} from 'vitest';
import {bounded,mobileDevice} from '../src/startup';
describe('mobile startup',()=>{
 it.each([
  ['Mozilla/5.0 (iPhone) CriOS/140','iPhone',5],
  ['Mozilla/5.0 (Linux; Android 15) Chrome/140','Linux armv8l',5],
  ['Mozilla/5.0 Macintosh Safari','MacIntel',5]
 ])('uses normal speed on %s',(userAgent,platform,maxTouchPoints)=>expect(mobileDevice({userAgent,platform,maxTouchPoints})).toBe(true));
 it('preserves desktop acceleration',()=>expect(mobileDevice({userAgent:'Macintosh Chrome',platform:'MacIntel',maxTouchPoints:0})).toBe(false));
 it('continues when browser audio or storage never settles',async()=>{
  vi.useFakeTimers();try{const pending=bounded(new Promise<string>(()=>{}),500,'continue');await vi.advanceTimersByTimeAsync(500);expect(await pending).toBe('continue');}finally{vi.useRealTimers();}
 });
 it('keeps successful operations and clears its timer',async()=>{vi.useFakeTimers();try{expect(await bounded(Promise.resolve('save'),500,'fallback')).toBe('save');expect(vi.getTimerCount()).toBe(0);}finally{vi.useRealTimers();}});
});
