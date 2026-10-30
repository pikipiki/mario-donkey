import{DkcGame}from'./dkc-game';import{Adventure}from'./adventure';import{INPUT,waitForNativeFrames,type Emulator}from'./engine';import{word,writeWord}from'./profile';
import{readDkcScene}from'./dkc-profile';import{dkcArenaOutcome,DKC_ARENAS,type ArenaTrip,type NativeDkcBoss}from'./native-arena';import{loadFile}from'./storage';import{DKC_SAVE_KEY}from'./dkc-save';import type{Controls}from'./controls';import type{SpriteAtlas}from'./atlas';
/** Original DKC boss actors, terrain, projectiles, music and death scripts.
 * Retains the existing playable skins/tongue/egg bridge; no added Yoshi boss. */
export class NativeDkcArenaGame extends DkcGame{
 private entering=true;private entered=false;private completing=false;
 constructor(emulator:Emulator,controls:Controls,canvas:HTMLCanvasElement,atlas:SpriteAtlas,private status:(s:string)=>void,private partyChanged:()=>void,readonly trip:ArenaTrip,private complete:(phase:'won'|'lost'|'abandoned')=>Promise<void>){super(emulator,controls,canvas,atlas,status,partyChanged);this.nativeArenaMode=true;}
 override get eggsUnlimited():boolean{return this.entered&&!this.completing;}
 override get canRepairDisplay():boolean{return true;}
 override get stageLabel():string{return`${DKC_ARENAS[this.trip.boss as NativeDkcBoss].name} · Original arena`;}
 override async prepare():Promise<void>{
  const saved=await loadFile(DKC_SAVE_KEY);await super.prepare();this.ready=false;
  if(!saved){
   this.adventure=new Adventure(this.trip.party);const m=this.emulator.gameManager,start=performance.now();
   m.simulateInput(0,INPUT.b,1);while(!readDkcScene(this.wram).playing){if(performance.now()-start>15000)throw Error('The DKC arena did not start. Your Yoshi adventure is safe.');await waitForNativeFrames(m);}m.simulateInput(0,INPUT.b,0);
   for(let i=0;i<10;i++)await waitForNativeFrames(m);
   const level=DKC_ARENAS[this.trip.boss as NativeDkcBoss].entrance,w=this.wram;
   for(const[p,v]of[[0x3e,level],[0x40,level],[0x527,0],[0x50a,0x81e3],[0x50c,0],[0x508,0x8279]])writeWord(w,p,v);
   for(let i=0;i<50;i++)await waitForNativeFrames(m);writeWord(w,0x575,this.trip.lives);
  }
  this.entered=true;this.entering=false;this.ready=true;this.partyChanged();this.status(this.stageLabel);await this.save();
 }
 override goToMap():void{void this.finish('abandoned');}
 override async repairDisplay():Promise<void>{await this.finish('abandoned');}
 private async finish(phase:'won'|'lost'|'abandoned'):Promise<void>{if(this.completing)return;this.completing=true;this.stop();try{await this.complete(phase);}catch(e){this.completing=false;this.status((e as Error).message);}}
 override tick(now:number):void{
  if(!this.ready||this.paused||this.entering||this.completing)return;
  // Native giant banana exists only after the genuine boss defeat, including
  // K.Rool's real final phase. A map, HP copy or fake-out is never a victory.
  const result=dkcArenaOutcome(this.wram,this.trip.boss as NativeDkcBoss,this.entered);if(result){void this.finish(result);return;}
  super.tick(now);
 }
}
