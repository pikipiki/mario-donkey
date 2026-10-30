import{waitForNativePause,waitForNativeFrames,INPUT,type GameManager}from'./engine';
import{readDkcScene}from'./dkc-profile';
/** A map actor can appear before the fade/VRAM loader has finished. */
export function stableDkcMap(w:Uint8Array):boolean{return readDkcScene(w).isMap&&w[0x51a]===15;}
export function canSaveDkcScene(w:Uint8Array):boolean{const s=readDkcScene(w);return w[0x51a]===15&&(s.isMap||s.playing);}
/** Loading while the async native loop is still executing can mix old video
 * and new CPU/RAM. Resume even when loadState throws, leaving the caller in control. */
export async function restoreDkcState(manager:GameManager,state:Uint8Array,restoreInputs:()=>void):Promise<void>{
 await waitForNativePause(manager);try{manager.loadState(state);restoreInputs();}finally{manager.toggleMainLoop(1);}await waitForNativeFrames(manager);
}
/** Jump/egg/tongue confirm native title, file-select and Game Over menus too.
 * Never send Start on a world map or during gameplay. */
export function confirmDkcMenu(w:Uint8Array,pressed:boolean,next:Set<number>):void{const s=readDkcScene(w);if(pressed&&!s.playing){next.add(INPUT.b);if(!s.isMap){next.add(INPUT.start);next.add(INPUT.a);}}}
