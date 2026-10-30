import{waitForNativePause,waitForNativeFrames,INPUT,type GameManager}from'./engine';
import{readDkcScene,isDkcStageEntrance}from'./dkc-profile';
import{word}from'./profile';
/** A map actor can appear before the fade/VRAM loader has finished. */
export function stableDkcMap(w:Uint8Array):boolean{return readDkcScene(w).isMap&&w[0x51a]===15;}
export function canSaveDkcScene(w:Uint8Array):boolean{const s=readDkcScene(w);return w[0x51a]===15&&(s.isMap||s.playing);}
/** Loading while the async native loop is still executing can mix old video
 * and new CPU/RAM. Resume even when loadState throws, leaving the caller in control. */
export async function restoreDkcState(manager:GameManager,state:Uint8Array,restoreInputs:()=>void):Promise<void>{
 await waitForNativePause(manager);try{manager.loadState(state);restoreInputs();}finally{manager.toggleMainLoop(1);}await waitForNativeFrames(manager);
}
export type DkcScreenKind='stage'|'map'|'interior'|'travel'|'transition'|'menu';
export function dkcScreenKind(w:Uint8Array):DkcScreenKind{
 const s=readDkcScene(w),entrance=word(w,0x3e);
 if(w[0x51a]!==15)return'transition';
 if(s.playing)return'stage';
 if(entrance>=238&&entrance<=255)return'interior';
 if(word(w,0x57d)&0x100)return'travel';
 if(s.isMap)return'map';
 return entrance===0||word(w,0x523)===0xf?'menu':'transition';
}
/** Menu confirmation must not leak Start/A into visits or flight/fade code. */
export function confirmDkcMenu(w:Uint8Array,pressed:boolean,next:Set<number>):void{
 const kind=dkcScreenKind(w);if(!pressed||kind==='stage'||kind==='transition')return;
 next.add(INPUT.b);if(kind==='menu'){next.add(INPUT.start);next.add(INPUT.a);}
}
/** Only a witnessed Funky trip to Kongo Jungle can trigger this fallback.
 * Native frames avoid false timeouts while paused/backgrounded or on slow phones. */
export class DkcFunkyTransit{
 private visiting=false;private kongo=false;private blackAt?:number;private frame=0;private settledAt?:number;
 update(w:Uint8Array,frame:number):boolean{
  const entrance=word(w,0x3e);if(frame<this.frame){this.blackAt=undefined;this.settledAt=undefined;}this.frame=frame;
  if(entrance>=244&&entrance<=249||(word(w,0x57d)&0x100)&&[230,231,232,233,236,237].includes(entrance))this.visiting=true;
  if(!this.visiting)return false;
  if([230,231,232,233,236,237].includes(entrance))this.kongo=entrance===236;
  if(readDkcScene(w).playing){this.reset();return false;}
  if(stableDkcMap(w)&&entrance===22){this.settledAt??=frame;if(frame-this.settledAt>=60){this.reset();return false;}}else this.settledAt=undefined;
  if(w[0x51a]!==0){this.blackAt=undefined;return false;}
  this.blackAt??=frame;
  if(this.kongo&&frame-this.blackAt>=480){this.reset();return true;}return false;
 }
 private reset():void{this.visiting=false;this.kongo=false;this.blackAt=undefined;this.settledAt=undefined;}
}

/** Keep stage guards through a temporary missing hero, but never apply them
 * to Funky/visits, island maps or travel scenes. */
export function dkcExitGuardsAllowed(w:Uint8Array):boolean{return word(w,0x4a)>0&&isDkcStageEntrance(readDkcScene(w).level);}
