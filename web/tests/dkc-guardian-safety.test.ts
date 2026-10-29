import{it,expect,vi}from'vitest';
import{DkcGame}from'../src/dkc-game';import{Controls}from'../src/controls';import{DKC}from'../src/dkc-profile';import{writeWord}from'../src/profile';import type{Emulator}from'../src/engine';import type{SpriteAtlas}from'../src/atlas';import{DkcGuardian}from'../src/dkc-guardian';
it('keeps native exits gated through a temporary missing hero during an unfinished fight',()=>{
 const w=new Uint8Array(0x20000);for(const[p,v]of[[DKC.height,512],[DKC.loadedScene,22],[DKC.id+2,1],[DKC.id+6,0x6a],[DKC.x+6,280],[DKC.y+6,200],[DKC.x+2,140],[DKC.y+2,200]])writeWord(w,p,v);
 const guardian=new DkcGuardian();guardian.update(w,1,()=>true);Object.assign(guardian.state!,{phase:'fight',hp:4});
 const hooks={sync:vi.fn(),isMapExit:()=>true,music:vi.fn()},finish={sync:vi.fn()};
 const ctx=new Proxy({}as CanvasRenderingContext2D,{get:(t,k)=>k in t?Reflect.get(t,k):vi.fn()});
 const game=new DkcGame({Module:{HEAPU8:w},gameManager:{simulateInput:vi.fn(),functions:{getFrameNum:()=>2}}}as unknown as Emulator,new Controls(),{getContext:()=>ctx}as unknown as HTMLCanvasElement,{guardianReady:()=>true,prepareGuardian:()=>Promise.resolve()}as unknown as SpriteAtlas,vi.fn());
 game.wramBase=0;game.ready=true;Object.assign(game,{dkGuardian:guardian,dkBossHooks:hooks,dkBossFinish:finish,teamInitialized:true});
 writeWord(w,DKC.id+2,0);game.tick(100);expect(hooks.sync).toHaveBeenLastCalledWith(true);expect(finish.sync).toHaveBeenLastCalledWith(true);expect(guardian.state?.hp).toBe(4);
});
