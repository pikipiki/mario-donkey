import { describe, expect, it, vi } from 'vitest';
import { waitForNativeFrames, waitForNativePause, findUnique, resolveMemory, resolveDrawing, setNativeDrawing, type GameManager } from '../src/engine';
describe('accès mémoire protégé',()=>{
 it('refuse les signatures absentes ou ambiguës',()=>{expect(()=>findUnique(new Uint8Array([1,2,1,2]),new Uint8Array([1,2]))).toThrow();expect(()=>findUnique(new Uint8Array([0]),new Uint8Array([2]))).toThrow();});
 function core(apply=true){
  const heap=new Uint8Array(0x40000);heap.fill(0x37,0x10000,0x38000);const saved=heap.slice(),cheats:string[]=[];
  let playing=false,frame=0,pending:Uint8Array|undefined;
  const manager={Module:{HEAPU8:heap},getState:vi.fn(()=>heap.slice()),loadState:vi.fn((state:Uint8Array)=>{pending=state;}),setCheat(_i:number,_e:boolean,code:string){cheats.push(code);},resetCheat:vi.fn(()=>{cheats.length=0;}),toggleMainLoop:vi.fn((value:number)=>{playing=Boolean(value);}),functions:{getFrameNum(){
   if(playing){frame++;if(pending){heap.set(pending);pending=undefined;}if(apply)for(const code of cheats){const addr=parseInt(code.slice(0,6),16),base=addr>=0x7e0000?0x10000:0x30000;heap[base+(addr&0xffff)]=parseInt(code.slice(6),16);}}
   return frame;
  }}} as unknown as GameManager;
  return {heap,saved,manager};
 }
 it.each([
  ['WRAM',0x7e1fe0,0x1fe0,0x20000,0x10000],
  ['GSU',0x7007e0,0x7e0,0x8000,0x30000]
 ] as const)('sonde %s immédiatement sans exécuter ni recharger la console',async(_name,address,offset,length,base)=>{
  const heap=new Uint8Array(0x40000);heap.fill(0x37);const before=heap.slice(),originals=new Map<number,number>();
  const manager={Module:{HEAPU8:heap},getState:vi.fn(()=>heap.slice()),loadState:vi.fn(),toggleMainLoop:vi.fn(),setCheat:vi.fn((_i:number,_enabled:boolean,code:string)=>{
   const target=base+(parseInt(code.slice(0,6),16)&0xffff);originals.set(target,heap[target]);heap[target]=parseInt(code.slice(6),16);
  }),resetCheat:vi.fn(()=>{for(const [target,value]of originals)heap[target]=value;originals.clear();})} as unknown as GameManager;
  expect(await resolveMemory(manager,address,offset,length)).toBe(base);
  expect(manager.setCheat).toHaveBeenCalledTimes(8);expect(manager.resetCheat).toHaveBeenCalledOnce();
  expect(manager.loadState).not.toHaveBeenCalled();expect(manager.toggleMainLoop).not.toHaveBeenCalledWith(1);
  expect(manager.toggleMainLoop).toHaveBeenLastCalledWith(0);expect(heap).toEqual(before);
 });
 it('résout une mémoire dont les cheats s’appliquent au prochain frame et restaure tout l’état',async()=>{
  vi.useFakeTimers();try{const {heap,saved,manager}=core();const pending=resolveMemory(manager,0x7e1fe0,0x1fe0,0x20000);await vi.runAllTimersAsync();expect(await pending).toBe(0x10000);expect(heap).toEqual(saved);expect(manager.loadState).toHaveBeenCalledOnce();expect(manager.resetCheat).toHaveBeenCalledOnce();}finally{vi.useRealTimers();}
 });
 it('termine la restauration différée avant que la sonde GSU capture la mémoire',async()=>{
  vi.useFakeTimers();try{
   const {heap,saved,manager}=core();
   const wram=resolveMemory(manager,0x7e1fe0,0x1fe0,0x20000);await vi.runAllTimersAsync();expect(await wram).toBe(0x10000);
   expect(heap).toEqual(saved);expect(manager.toggleMainLoop).toHaveBeenLastCalledWith(0);
   const gsu=resolveMemory(manager,0x7007e0,0x7e0,0x8000);await vi.runAllTimersAsync();expect(await gsu).toBe(0x30000);
   expect(vi.mocked(manager.getState).mock.results[1].value).toEqual(saved);
   expect(heap).toEqual(saved);expect(manager.toggleMainLoop).toHaveBeenLastCalledWith(0);
  }finally{vi.useRealTimers();}
 });
 it('résout la mémoire au démarrage sans capturer ni recharger un état de titre',async()=>{
  vi.useFakeTimers();try{
   const {manager}=core();const pending=resolveMemory(manager,0x7e1fe0,0x1fe0,0x20000,false);
   await vi.runAllTimersAsync();expect(await pending).toBe(0x10000);
   expect(manager.getState).not.toHaveBeenCalled();expect(manager.loadState).not.toHaveBeenCalled();
   expect(manager.resetCheat).toHaveBeenCalledOnce();expect(manager.toggleMainLoop).toHaveBeenLastCalledWith(0);
  }finally{vi.useRealTimers();}
 });
 it('restaure le jeu même si la sonde ne trouve pas de mémoire compatible',async()=>{
  vi.useFakeTimers();try{const {heap,saved,manager}=core(false);const result=resolveMemory(manager,0x7e1fe0,0x1fe0,0x20000).catch(e=>e);await vi.runAllTimersAsync();expect(await result).toBeInstanceOf(Error);expect(heap).toEqual(saved);expect(manager.loadState).toHaveBeenCalledOnce();}finally{vi.useRealTimers();}
 });
});

describe('restauration réversible du dessin natif',()=>{
 const sig=new Uint8Array([0xad,0x1a,0x61,0xf0,0x6e,0xad,0xae,0x61,0x0d,0x57,0x0b]);
 it('cache puis réaffiche Yoshi sans accumuler de cheats',async()=>{const heap=new Uint8Array(128);heap.set(sig,20);const m={Module:{HEAPU8:heap}} as GameManager;const p=await resolveDrawing(m);for(let i=0;i<10;i++){setNativeDrawing(heap,p,true);expect(heap[p]).toBe(0xa9);setNativeDrawing(heap,p,false);expect(heap.slice(p,p+11)).toEqual(sig);}});
 it('identifie la copie ROM active immédiatement et restaure ses octets sans rechargement',async()=>{
  const heap=new Uint8Array(96);heap.set(sig,4);heap.set(sig,32);heap[80]=7;const before=heap.slice(),originals=new Map<number,number>();
  const manager={Module:{HEAPU8:heap},getState:vi.fn(()=>heap.slice(64)),loadState:vi.fn(),toggleMainLoop:vi.fn(),setCheat:vi.fn((_i:number,_enabled:boolean,code:string)=>{
   const target=32+parseInt(code.slice(0,6),16)-0x04faeb;originals.set(target,heap[target]);heap[target]=parseInt(code.slice(6),16);
  }),resetCheat:vi.fn(()=>{for(const [target,value]of originals)heap[target]=value;originals.clear();})} as unknown as GameManager;
  expect(await resolveDrawing(manager)).toBe(32);
  expect(manager.setCheat).toHaveBeenCalledTimes(3);expect(manager.resetCheat).toHaveBeenCalledOnce();
  expect(manager.loadState).not.toHaveBeenCalled();expect(manager.toggleMainLoop).not.toHaveBeenCalledWith(1);
  expect(manager.toggleMainLoop).toHaveBeenLastCalledWith(0);expect(heap).toEqual(before);
 });
 it('attend la restauration native après une sonde du dessin et rend le cœur arrêté',async()=>{
  vi.useFakeTimers();try{
   const heap=new Uint8Array(96);heap.set(sig,4);heap.set(sig,32);heap[80]=7;const original=heap.slice();
   let playing=false,cheats=false,frame=0,pending:Uint8Array|undefined;
   const manager={Module:{HEAPU8:heap},getState:()=>heap.slice(64),loadState:vi.fn((state:Uint8Array)=>{pending=state;}),resetCheat:()=>{cheats=false;},setCheat:()=>{cheats=true;},toggleMainLoop:vi.fn((value:number)=>{playing=Boolean(value);}),functions:{getFrameNum(){
    if(playing){frame++;if(pending){heap.set(pending,64);pending=undefined;}if(cheats){heap.set([0xa9,0,0],32);heap[80]=99;}}
    return frame;
   }}} as unknown as GameManager;
   const result=resolveDrawing(manager);await vi.runAllTimersAsync();expect(await result).toBe(32);
   expect(heap).toEqual(original);expect(manager.toggleMainLoop).toHaveBeenLastCalledWith(0);
  }finally{vi.useRealTimers();}
 });
 it('refuse une adresse dont les instructions ont changé',()=>{const heap=new Uint8Array(32);heap.set(sig,0);heap[4]=0;expect(()=>setNativeDrawing(heap,0,true)).toThrow();});
 it('sépare une copie de ROM du site réellement utilisé et restaure le jeu',async()=>{vi.useFakeTimers();try{const heap=new Uint8Array(64);heap.set(sig,4);heap.set(sig,32);const original=heap.slice();let cheats=false;const m={Module:{HEAPU8:heap},getState:()=>new Uint8Array([12]),loadState:vi.fn(),resetCheat:vi.fn(()=>{cheats=false;}),setCheat:vi.fn(()=>{cheats=true;}),toggleMainLoop:(v:number)=>{if(v&&cheats)heap.set([0xa9,0,0],32);}} as unknown as GameManager;const pending=resolveDrawing(m);await vi.runAllTimersAsync();expect(await pending).toBe(32);expect(m.setCheat).toHaveBeenCalledWith(100,true,'04faeba9');expect(heap).toEqual(original);expect(m.loadState).toHaveBeenCalledOnce();}finally{vi.useRealTimers();}});
});

describe('native frames after loading a snapshot',()=>{
 it('handles a frame counter that resets backwards during restore',async()=>{
  vi.useFakeTimers();try{
   const getFrameNum=vi.fn().mockReturnValueOnce(9000).mockReturnValueOnce(9000).mockReturnValueOnce(15).mockReturnValue(16);
   const pending=waitForNativeFrames({functions:{getFrameNum}} as unknown as GameManager);
   await vi.advanceTimersByTimeAsync(100);await pending;
  }finally{vi.useRealTimers();}
 });
 it('reports a stopped core instead of waiting indefinitely',async()=>{
  vi.useFakeTimers();try{
   const pending=waitForNativeFrames({functions:{getFrameNum:()=>10}} as unknown as GameManager).catch(error=>error);
   await vi.advanceTimersByTimeAsync(10100);expect(await pending).toBeInstanceOf(Error);
  }finally{vi.useRealTimers();}
 });
});


describe('native pause before snapshot capture',()=>{
 it('does not let a snapshot be captured in the pause request turn',async()=>{
  vi.useFakeTimers();try{
   const manager={toggleMainLoop:vi.fn(),getState:vi.fn(),functions:{getFrameNum:()=>42}} as unknown as GameManager;
   const capture=waitForNativePause(manager).then(()=>manager.getState());
   expect(manager.toggleMainLoop).toHaveBeenCalledWith(0);expect(manager.getState).not.toHaveBeenCalled();
   await vi.advanceTimersByTimeAsync(100);expect(manager.getState).not.toHaveBeenCalled();
   await vi.advanceTimersByTimeAsync(12);await capture;
   expect(manager.getState).toHaveBeenCalledOnce();expect(manager.toggleMainLoop).not.toHaveBeenCalledWith(1);
  }finally{vi.useRealTimers();}
 });
 it.each([43,2])('restarts the quiet interval when a final native frame changes the counter to %s',async(next)=>{
  vi.useFakeTimers();try{
   let frame=42,finished=false;
   const manager={toggleMainLoop:vi.fn(),functions:{getFrameNum:()=>frame}} as unknown as GameManager;
   const pause=waitForNativePause(manager).then(()=>{finished=true;});
   await vi.advanceTimersByTimeAsync(64);frame=next;
   await vi.advanceTimersByTimeAsync(100);expect(finished).toBe(false);
   await vi.advanceTimersByTimeAsync(28);await pause;expect(finished).toBe(true);
   expect(manager.toggleMainLoop).not.toHaveBeenCalledWith(1);
  }finally{vi.useRealTimers();}
 });
 it('rejects a core that continues advancing and never permits a capture',async()=>{
  vi.useFakeTimers();try{
   let frame=0;
   const manager={toggleMainLoop:vi.fn(),getState:vi.fn(),functions:{getFrameNum:()=>frame++}} as unknown as GameManager;
   const result=waitForNativePause(manager).then(()=>manager.getState()).catch(error=>error);
   await vi.advanceTimersByTimeAsync(2000);expect(await result).toBeInstanceOf(Error);
   expect(manager.getState).not.toHaveBeenCalled();expect(manager.toggleMainLoop).not.toHaveBeenCalledWith(1);
  }finally{vi.useRealTimers();}
 });
 it('refuses to claim a pause without an observable frame counter',async()=>{
  const manager={toggleMainLoop:vi.fn(),functions:{}} as unknown as GameManager;
  await expect(waitForNativePause(manager)).rejects.toThrow('could not be verified');
  expect(manager.toggleMainLoop).toHaveBeenLastCalledWith(0);
 });
});
