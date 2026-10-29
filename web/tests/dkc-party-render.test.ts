import{it,expect,vi}from'vitest';
import{DkcGame}from'../src/dkc-game';import{Controls}from'../src/controls';import{readDkcScene,DKC}from'../src/dkc-profile';import{writeWord}from'../src/profile';import type{Character}from'../src/adventure';import type{Emulator}from'../src/engine';import type{SpriteAtlas}from'../src/atlas';
function fixture(first:Character,second:Character){
 const w=new Uint8Array(0x20000);for(const[p,v]of[[0x40,22],[0x4a,512],[DKC.id+2,1],[DKC.id+4,2],[DKC.state+4,5],[DKC.x+2,156],[DKC.y+2,175],[0x12a7,1]])writeWord(w,p,v);w[0x51a]=15;
 const c={clearRect:vi.fn(),globalAlpha:1},atlas={draw:vi.fn(),drawMarioYoshi:vi.fn()},canvas={getContext:()=>c}as unknown as HTMLCanvasElement,controls=new Controls();
 const game=new DkcGame({Module:{HEAPU8:w}}as unknown as Emulator,controls,canvas,atlas as unknown as SpriteAtlas,vi.fn());game.wramBase=0;game.adventure.setTeam(first,second);controls.activate('roll',1000);
 const draw=()=>{(game as unknown as{drawDkc:(now:number,s:ReturnType<typeof readDkcScene>)=>void}).drawDkc(1100,readDkcScene(w));};return{w,c,atlas,draw};
}
it.each(['violet','pink','dk','diddy'] as const)('keeps Yoshi rolling while %s follows without copying the attack',partner=>{
 const f=fixture('mario',partner);f.draw();expect(f.atlas.drawMarioYoshi.mock.calls[0][1]).toBe('roll');expect(f.atlas.draw.mock.calls.find(a=>a[1]===partner)?.[2]).toBe('walk');
});
it('does not spin a following Yoshi when another hero rolls',()=>{const f=fixture('pink','mario');f.draw();expect(f.atlas.draw.mock.calls.find(a=>a[1]==='pink')?.[2]).toBe('roll');expect(f.atlas.drawMarioYoshi.mock.calls[0][1]).toBe('walk');});
it('preserves native partner damage/flee animations during the leaders roll',()=>{const f=fixture('mario','violet');writeWord(f.w,DKC.state+4,0xd);f.draw();expect(f.atlas.draw.mock.calls.find(a=>a[1]==='violet')?.[2]).toBe('jump');});
