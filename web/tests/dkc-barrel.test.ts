import{describe,it,expect}from'vitest';
import{DkcBarrelControl,heldDkcBarrel}from'../src/dkc-barrel';
import{Controls}from'../src/controls';import{DKC}from'../src/dkc-profile';import{writeWord}from'../src/profile';
function fixture(player=2,id=0x23){const w=new Uint8Array(0x20000),c=new DkcBarrelControl(),controls=new Controls();const put=(p:number,n:number)=>writeWord(w,p,n);put(DKC.height,512);put(DKC.loadedScene,22);put(DKC.currentKong,player===4?2:1);put(DKC.id+player,player===4?2:1);put(0x12a5+player,1);const carry=()=>{put(0x16f5+player-2,8);put(0x137d,player);put(DKC.id+8,id);put(DKC.state+8,1);};return{w,c,controls,put,carry,update:(now:number)=>c.update(w,controls.rollSequence,now<controls.rollUntil)};}
describe('two-tap native DKC barrel control',()=>{
 it.each([0x22,0x23,0x24,0x26,0x27])('keeps native barrel %i held after the first pulse and throws only on the next tap',id=>{const f=fixture(2,id);f.controls.activate('roll',0);expect(f.update(0)).toBe(true);f.carry();expect(f.update(16)).toBe(true);const bytes=f.w.slice();for(const t of[600,5000,60000])expect(f.update(t)).toBe(true);expect(f.w).toEqual(bytes);f.controls.activate('roll',60001);expect(f.update(60001)).toBe(false);expect(f.update(60020)).toBe(false);f.put(DKC.state+8,2);f.put(0x16f5,0);expect(f.update(60040)).toBe(false);expect(f.c.handling).toBe(true);f.controls.activate('roll',61000);expect(f.update(61000)).toBe(true);expect(f.c.handling).toBe(false);});
 it('accepts the second tap before the old580ms roll pulse has expired',()=>{const f=fixture();f.controls.activate('roll',0);f.update(0);f.carry();f.update(20);f.controls.activate('roll',100);expect(f.controls.rollSequence).toBe(2);expect(f.update(100)).toBe(false);});
 it('re-adopts an already carried barrel after pause/save without throwing it',()=>{const f=fixture(4);f.carry();expect(f.update(0)).toBe(true);f.c.reset();f.controls.stop();expect(f.update(5000)).toBe(true);f.controls.activate('roll',5100);expect(f.update(5100)).toBe(false);});
 it('rejects stale links, someone else’s barrel, thrown objects and barrel cannons',()=>{for(const change of[(f:ReturnType<typeof fixture>)=>f.put(0x137d,4),(f:ReturnType<typeof fixture>)=>f.put(DKC.state+8,2),(f:ReturnType<typeof fixture>)=>f.put(DKC.id+8,0x38),(f:ReturnType<typeof fixture>)=>f.put(0x16f5,7)]){const f=fixture();f.carry();change(f);expect(heldDkcBarrel(f.w)).toBeUndefined();expect(f.update(1000)).toBe(false);}});
 it('lets native damage drop the barrel and does not hand its latch to another Kong/room',()=>{const f=fixture();f.carry();f.update(0);f.put(DKC.hit+2,1);expect(f.update(10)).toBe(false);f.put(DKC.hit+2,0);f.update(20);f.put(DKC.currentKong,2);f.put(DKC.id+4,2);expect(f.update(30)).toBe(false);f.put(DKC.height,0);expect(f.update(40)).toBe(false);});
 it('recognizes explicit SNES Y taps as distinct presses too',()=>{const f=fixture();f.controls.pulse(1,0);expect(f.c.update(f.w,f.controls.rollSequence,true)).toBe(true);f.carry();f.c.update(f.w,f.controls.rollSequence,false);f.controls.pulse(1,1000);expect(f.c.update(f.w,f.controls.rollSequence,true)).toBe(false);});
});

import{vi}from'vitest';import{DkcGame}from'../src/dkc-game';import{INPUT,type Emulator}from'../src/engine';import type{SpriteAtlas}from'../src/atlas';
it('wires the toggle to native Y, suppresses forced rolling while carrying and preserves the hold across Stop',()=>{
 const f=fixture();f.w[0x51a]=15;const simulateInput=vi.fn(),atlas={draw:vi.fn(),drawMarioYoshi:vi.fn(),drawYoshi:vi.fn()};let frame=1;
 const ctx=new Proxy({}as CanvasRenderingContext2D,{get:(t,k)=>k in t?Reflect.get(t,k):vi.fn()});
 const emulator={Module:{HEAPU8:f.w},gameManager:{simulateInput,functions:{getFrameNum:()=>frame}}}as unknown as Emulator;
 const game=new DkcGame(emulator,f.controls,{getContext:()=>ctx}as unknown as HTMLCanvasElement,atlas as unknown as SpriteAtlas,vi.fn());game.wramBase=0;game.ready=true;(game as unknown as{teamInitialized:boolean}).teamInitialized=true;
 const tick=(now:number)=>{simulateInput.mockClear();frame++;game.tick(now);};
 f.controls.activate('roll',0);tick(0);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.y,1);
 f.carry();tick(16);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.y,1);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.right,0);expect(atlas.draw.mock.lastCall?.[2]).toBe('idle');
 game.stop();expect(simulateInput.mock.calls.filter(a=>a[1]===INPUT.y).at(-1)?.[2]).toBe(1);tick(1000);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.y,1);
 f.controls.setStick(0,1);f.controls.activate('roll',1100);tick(1100);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.down,0);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.y,0);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.right,0);
 game.stop();expect(simulateInput.mock.calls.filter(a=>a[1]===INPUT.y).at(-1)?.[2]).toBe(0);
 f.put(DKC.state+8,2);f.put(0x16f5,0);tick(1116);expect(simulateInput).toHaveBeenCalledWith(0,INPUT.y,0);expect(atlas.draw.mock.lastCall?.[2]).toBe('idle');
});
