import {afterEach,describe,expect,it,vi} from 'vitest';
import {configureOverlay,overlayScale} from '../src/overlay';

afterEach(()=>vi.unstubAllGlobals());
describe('mobile sprite resolution budget',()=>{
 it('preserves available detail in portrait and landscape on high density screens',()=>{
  expect(overlayScale(390,292.5,3,239)).toBe(2);
  expect(overlayScale(520,390,3,239)).toBe(2);
  expect(overlayScale(256,239,1,239)).toBe(1);
 });
 it('bounds even tablet and 4K buffers to 512 by native height times two',()=>{
  for(const h of [224,239,256])expect(overlayScale(3840,2160,4,h)).toBe(2);
  expect(overlayScale(0,0,NaN,239)).toBe(1);
 });
 it('keeps logical coordinates and reallocates only when resolution changes',()=>{
  const setTransform=vi.fn(),addEventListener=vi.fn();let onResize=()=>{};
  vi.stubGlobal('window',{devicePixelRatio:3,addEventListener});
  vi.stubGlobal('ResizeObserver',class{constructor(callback:()=>void){onResize=callback;}observe=vi.fn();});
  const bounds={width:390,height:292.5};
  const canvas={width:256,height:239,getContext:()=>({setTransform}),getBoundingClientRect:()=>bounds} as unknown as HTMLCanvasElement;
  configureOverlay(canvas,239);
  expect([canvas.width,canvas.height]).toEqual([512,478]);
  expect(setTransform).toHaveBeenLastCalledWith(2,0,0,2,0,0);
  bounds.width=520;bounds.height=390;onResize();onResize();
  expect(setTransform).toHaveBeenCalledTimes(1);
  bounds.width=80;bounds.height=60;onResize();
  expect([canvas.width,canvas.height]).toEqual([256,239]);
  expect(setTransform).toHaveBeenLastCalledWith(1,0,0,1,0,0);
  expect(addEventListener).toHaveBeenCalledWith('resize',expect.any(Function),{passive:true});
 });
});
