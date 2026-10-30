import{LiveGame}from'./game';import{Adventure,type Character,type Mount}from'./adventure';
import{INPUT,waitForNativeFrames,type Emulator}from'./engine';import{word,writeWord,signed16}from'./profile';
import{NATIVE_ARENAS,nativeYoshiAnchor,arenaOutcome,type NativeArenaBoss,type ArenaTrip}from'./native-arena';import{readCampaign}from'./campaign';import{cheatOptions}from'./cheats';
import type{Controls}from'./controls';import type{SpriteAtlas}from'./atlas';
/** Real Yoshi ROM scene. No donor sprite simulation, custom gravity, roll
 * damage, camera writes, egg refill or replacement victory is run here. */
export class NativeArenaGame extends LiveGame{
 private entered=false;private entering=true;private completing=false;private lastArenaSave=0;
 constructor(emulator:Emulator,controls:Controls,private canvas:HTMLCanvasElement,private art:SpriteAtlas,private status:(s:string)=>void,private partyChanged:()=>void,readonly trip:ArenaTrip,private complete:(phase:'won'|'lost'|'abandoned')=>Promise<void>){super(emulator,controls,canvas,art,status,partyChanged);this.nativeArenaMode=true;}
 override get canRepairDisplay():boolean{return true;}
 override get stageLabel():string{return`${NATIVE_ARENAS[this.trip.boss as NativeArenaBoss].name} · Original arena`;}
 override get eggsUnlimited():boolean{return false;}
 override async prepare():Promise<void>{
  const saved=await readCampaign();await super.prepare();this.ready=false;
  if(!saved){
   this.adventure=new Adventure(this.trip.party);this.stop();
   const w=this.wram,s=NATIVE_ARENAS[this.trip.boss as NativeArenaBoss];writeWord(w,0x379,this.trip.lives);
   writeWord(w,0x218,0);writeWord(w,0x21a,s.stage);w.set([s.room,s.x,s.y,0],0x17e00);writeWord(w,0x38e,0);writeWord(w,0x38c,1);w[0x118]=0xf;
   this.emulator.gameManager.toggleMainLoop(1);const start=performance.now();
   while(w[0x118]!==0x13){if(performance.now()-start>20000)throw Error('The arena did not start. Reload to try again; your DKC adventure is safe.');await waitForNativeFrames(this.emulator.gameManager);}
  }
  this.entered=true;this.entering=false;this.ready=true;this.lastArenaSave=performance.now();this.partyChanged();this.status(this.stageLabel);await this.save();
 }
 testNativeDefeatSequence():boolean{
  if(!import.meta.env.DEV||this.trip.boss!=='raphael')return false;const w=this.wram,g=this.gsu;
  for(let i=0;i<24;i++){const o=i*4;if(word(g,0xf00+o)&&word(g,0x1360+o)===0xc){writeWord(g,0x1900+o,1);writeWord(g,0x1402+o,0);for(const[p,v]of[[0x105e,0x42],[0x105f,0x80],[0x1060,0x80],[0x1061,13],[0x1062,0xa0],[0x1063,0xa0]])w[p]=v;return true;}}return false;
 }
 override skipDialogue():void{this.controls.pulse(INPUT.a,performance.now());}
 override goToMap():void{void this.finish('abandoned');}
 override async repairDisplay():Promise<void>{await this.finish('abandoned');}
 override mount(_value:Mount):void{this.status('This battle uses Yoshi’s original abilities.');}
 override requestTeamSwap():boolean{if(!this.ready||this.paused||this.completing)return false;this.adventure.swapTeam();this.animalAudio.play('animal-hit');this.partyChanged();return true;}
 override configureTeam(first:Character,second:Character):boolean{const ok=this.adventure.setTeam(first,second);if(ok)this.partyChanged();return ok;}
 private async finish(phase:'won'|'lost'|'abandoned'):Promise<void>{if(this.completing)return;this.completing=true;this.stop();try{await this.complete(phase);}catch(e){this.completing=false;this.status((e as Error).message);}}
 override tick(now:number):void{
  if(!this.ready||this.paused||this.entering||this.completing)return;
  const w=this.wram,g=this.gsu;
  if(cheatOptions().infiniteLives)writeWord(w,0x379,99);
  const result=arenaOutcome(w,g,this.trip.boss as NativeArenaBoss,this.entered);if(result){void this.finish(result);return;}
  const next=new Set<number>(),axis=this.controls.runAxis(),vertical=this.controls.verticalAxis(now);
  if(axis)next.add(axis<0?INPUT.left:INPUT.right);if(vertical)next.add(vertical<0?INPUT.up:INPUT.down);
  if(this.controls.jumpPressed(now))next.add(INPUT.b);if(now<this.controls.tongueUntil)next.add(INPUT.y);
  // Original ground-pound input: jump, then Down. One accessible attack tap.
  if(now<this.controls.rollUntil)next.add(INPUT.down);
  if(this.controls.eggPressed(now))next.add(INPUT.a);
  for(const[b,until]of this.controls.extra)if(now<until)next.add(b);
  for(let b=0;b<12;b++)this.emulator.gameManager.simulateInput(0,b,next.has(b)?1:0);
  this.drawRider(now);
  if(now-this.lastArenaSave>=20000){this.lastArenaSave=now;void this.save().catch(e=>this.status((e as Error).message));}
 }
 private drawRider(now:number):void{
  const c=this.canvas.getContext('2d')!;c.clearRect(0,0,256,this.videoHeight);
  const w=this.wram,g=this.gsu;if(w[0x118]!==0x13||w[0x200]&0x80||this.adventure.active==='mario')return;
  // Let original shrink/swallow/warp poses remain visible during cinematics.
  if(word(g,0xac)===0x1a||word(g,0xae)!==0)return;
  const scale=1,anchor=nativeYoshiAnchor(g,16,signed16(word(g,0x8c)-word(w,0x39))+12);
  if(!anchor)return;const x=anchor.x,y=anchor.y+((this.videoHeight-224)>>1);
  c.save();c.globalAlpha=(w[0x200]&15)/15;c.translate(x,y);c.scale(scale,scale);this.art.draw(c,this.adventure.active,'ride',0,0,now,this.controls.facing);c.restore();
 }
}
