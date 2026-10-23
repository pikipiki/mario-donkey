import { describe, expect, it, vi } from 'vitest';
import { findUnique, resolveMemory, resolveDrawing, setNativeDrawing, type GameManager } from '../src/engine';
describe('accès mémoire protégé',()=>{
 it('refuse les signatures absentes ou ambiguës',()=>{expect(()=>findUnique(new Uint8Array([1,2,1,2]),new Uint8Array([1,2]))).toThrow();expect(()=>findUnique(new Uint8Array([0]),new Uint8Array([2]))).toThrow();});
 function core(apply=true){
  const heap=new Uint8Array(0x40000);heap.fill(0x37,0x10000,0x30000);const saved=heap.slice(),cheats:string[]=[];
  const manager={Module:{HEAPU8:heap},getState:()=>heap.slice(),loadState:vi.fn((state:Uint8Array)=>heap.set(state)),setCheat(_i:number,_e:boolean,code:string){cheats.push(code);},resetCheat:vi.fn(()=>{cheats.length=0;}),toggleMainLoop(playing:number){if(playing&&apply)for(const code of cheats){const addr=parseInt(code.slice(0,6),16)-0x7e0000;heap[0x10000+addr]=parseInt(code.slice(6),16);}}} as unknown as GameManager;
  return {heap,saved,manager};
 }
 it('résout une mémoire dont les cheats s’appliquent au prochain frame et restaure tout l’état',async()=>{
  vi.useFakeTimers();try{const {heap,saved,manager}=core();const pending=resolveMemory(manager,0x7e1fe0,0x1fe0,0x20000);await vi.runAllTimersAsync();expect(await pending).toBe(0x10000);expect(heap).toEqual(saved);expect(manager.loadState).toHaveBeenCalledOnce();expect(manager.resetCheat).toHaveBeenCalledOnce();}finally{vi.useRealTimers();}
 });
 it('restaure le jeu même si la sonde ne trouve pas de mémoire compatible',async()=>{
  vi.useFakeTimers();try{const {heap,saved,manager}=core(false);const result=resolveMemory(manager,0x7e1fe0,0x1fe0,0x20000).catch(e=>e);await vi.runAllTimersAsync();expect(await result).toBeInstanceOf(Error);expect(heap).toEqual(saved);expect(manager.loadState).toHaveBeenCalledOnce();}finally{vi.useRealTimers();}
 });
});

describe('restauration réversible du dessin natif',()=>{
 const sig=new Uint8Array([0xad,0x1a,0x61,0xf0,0x6e,0xad,0xae,0x61,0x0d,0x57,0x0b]);
 it('cache puis réaffiche Yoshi sans accumuler de cheats',async()=>{const heap=new Uint8Array(128);heap.set(sig,20);const m={Module:{HEAPU8:heap}} as GameManager;const p=await resolveDrawing(m);for(let i=0;i<10;i++){setNativeDrawing(heap,p,true);expect(heap[p]).toBe(0xa9);setNativeDrawing(heap,p,false);expect(heap.slice(p,p+11)).toEqual(sig);}});
 it('refuse une adresse dont les instructions ont changé',()=>{const heap=new Uint8Array(32);heap.set(sig,0);heap[4]=0;expect(()=>setNativeDrawing(heap,0,true)).toThrow();});
 it('sépare une copie de ROM du site réellement utilisé et restaure le jeu',async()=>{vi.useFakeTimers();try{const heap=new Uint8Array(64);heap.set(sig,4);heap.set(sig,32);const original=heap.slice();const m={Module:{HEAPU8:heap},getState:()=>new Uint8Array([12]),loadState:vi.fn(),resetCheat:vi.fn(),setCheat:vi.fn(),toggleMainLoop:(v:number)=>{if(v)heap.set([0xa9,0,0],32);}} as unknown as GameManager;const pending=resolveDrawing(m);await vi.runAllTimersAsync();expect(await pending).toBe(32);expect(m.setCheat).toHaveBeenCalledWith(100,true,'04faeba9');expect(heap).toEqual(original);expect(m.loadState).toHaveBeenCalledOnce();}finally{vi.useRealTimers();}});
});
