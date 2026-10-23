import { bounded, mobileDevice, readBeforeDeadline } from './startup';
import {breakTerrain,tileAddress,replaceTile} from './terrain';
import { Controls } from './controls';
import { type Emulator, INPUT, primeAudio, resolveMemory, resolveDrawing, setNativeDrawing } from './engine';
import { PROFILE as P, absorbHit, applyRoll, babyIsLost, dkcRun, inGoal, signed16, skipOpenDialogue, word, writeWord } from './profile';
import { loadFile,storeFile } from './storage';
import { Adventure, type Character, type Mount } from './adventure';
import { SpriteAtlas } from './atlas';
import { readCampaign,writeCampaign } from './campaign';
export type { Character } from './adventure';
const sleep=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
const INITIAL='campaign-original-eu-start-v2-snes9x-2.0.2';
export class LiveGame {
 wramBase=0;gsuBase=0;ready=false;paused=false;kills=0;walls=0;adventure=new Adventure();autoSkip=false;
 private drawSite=0;private animationKey='';private animationStart=0;private previousX=0;private topPadding=0;private hidden?:boolean;private previousBabyLost=false;private previousLives=0;
 private skipUntil=0;private lastSave=0;private saving=false;private jumpSequence=0;private lastStage='';
 private particles:Array<{x:number;y:number;until:number}>=[];
 constructor(public emulator:Emulator,public controls:Controls,private overlay:HTMLCanvasElement,private atlas:SpriteAtlas,private onStatus:(message:string)=>void,private changed:()=>void=()=>{}){}
 get eggCount():number{return Math.min(6,word(this.gsu,0x1df6)>>>1);}
 get messageOpen():boolean{return this.ready&&this.wram[0xd11]!==0;}
 get aiming():boolean{return word(this.gsu,0xec)!==0;}
 get character():Character{return this.adventure.active;}
 set character(character:Character){if(this.adventure.select(character))this.changed();}
 get wram():Uint8Array{return this.emulator.Module.HEAPU8.subarray(this.wramBase,this.wramBase+0x20000);}
 get gsu():Uint8Array{return this.emulator.Module.HEAPU8.subarray(this.gsuBase,this.gsuBase+0x8000);}
 get audio():AudioContext|undefined{return this.emulator.Module.AL?.currentCtx?.audioCtx??this.emulator.Module.AL?.contexts?.find(c=>c?.audioCtx)?.audioCtx;}
 get stageLabel():string{return `World ${this.wram[0x218]+1} · ${this.wram[P.stage]<8?'Level '+(this.wram[P.stage]+1):'Extra / bonus'}`;}
 get room():string{return `${this.wram[0x218]}:${this.wram[P.stage]}:${word(this.wram,0x32).toString(16)}:${this.wram[0x34]}`;}
 async unlockAudio():Promise<void>{
  primeAudio();
  const contexts=this.emulator.Module.AL?.contexts?.map(c=>c.audioCtx)??[];
  if(this.audio)contexts.push(this.audio);
  await bounded(Promise.all([...new Set(contexts.filter(Boolean))].map(async ctx=>{try{if(ctx.state!=='running')await ctx.resume();}catch{}})),500,[]);
  this.emulator.setVolume(1);
 }
 async prepare():Promise<void>{
  const m=this.emulator.gameManager,start=performance.now();
  await this.unlockAudio().catch(()=>{});
  while(m.functions.getFrameNum()<5&&performance.now()-start<15000){if(m.functions.getFrameNum()<1)await this.unlockAudio().catch(()=>{});await sleep(30);}
  if(m.functions.getFrameNum()<1)throw new Error('The SNES core is not drawing. Try again.');
  m.toggleMainLoop(0);
  try{this.wramBase=await resolveMemory(m,0x7e1fe0,0x1fe0,0x20000);this.gsuBase=await resolveMemory(m,0x7007e0,0x7e0,0x8000);this.drawSite=await resolveDrawing(m);}finally{m.toggleMainLoop(1);}
  const fresh=import.meta.env.DEV&&new URLSearchParams(location.search).has('fresh');
  const campaign=fresh?undefined:await readBeforeDeadline(readCampaign().catch(()=>undefined),4000);
  if(campaign){
   m.loadState(campaign.state);await sleep(100);
   if(this.wram[P.mode]<=0x50){this.adventure=new Adventure(campaign.adventure);this.finishBoot();return;}
  }
  const initial=fresh?undefined:await readBeforeDeadline(loadFile(INITIAL).catch(()=>undefined),4000);
  if(initial){m.loadState(initial);await sleep(100);if(this.wram[P.mode]===P.gameplay){this.finishBoot();return;}}
  const mobile=mobileDevice(navigator)||(import.meta.env.DEV&&new URLSearchParams(location.search).has('mobile'));
  this.onStatus('Getting your first adventure ready…');
  m.functions.setFastForwardRatio(mobile?1:6);m.functions.toggleFastForward(mobile?0:1);
  const began=performance.now();let skipped=false,lastPress=-100,lastFrame=m.functions.getFrameNum(),lastAdvance=began,lastStatus=0;
  try{
   while(performance.now()-began<(mobile?90000:35000)){
    const now=performance.now(),frame=m.functions.getFrameNum(),mode=this.wram[P.mode];
    if(frame!==lastFrame){lastFrame=frame;lastAdvance=now;}
    if(now-lastStatus>1000){this.onStatus(`Preparing adventure · ${Math.floor((now-began)/1000)}s`);lastStatus=now;}
    if(now-lastAdvance>12000)throw new Error(`The SNES core stopped at frame ${frame} (mode ${mode.toString(16)}). Reload and tap Play again.`);
    if(mode===P.gameplay&&word(this.gsu,P.x)>0){
     m.toggleMainLoop(0);try{await bounded(storeFile(INITIAL,new Uint8Array(m.getState())),1500,undefined);}catch{}finally{m.toggleMainLoop(1);}
     this.finishBoot();return;
    }
    if(!skipped&&(mode===0x3c||mode===0x3d)){this.wram[P.mode]=0x23;writeWord(this.wram,0x200,0x010f);writeWord(this.wram,0x218,0);writeWord(this.wram,0x21a,0);skipped=true;}
    else if(frame-lastPress>20){lastPress=frame;this.setInputs(new Set([mode<0xd?INPUT.start:INPUT.b]));
     const pressed=performance.now();while(m.functions.getFrameNum()<frame+3&&performance.now()-pressed<1500)await sleep(16);
     this.setInputs(new Set());
    }
    await sleep(25);
   }
   throw new Error('The game did not start. Reload the page to try again.');
  }finally{m.functions.toggleFastForward(0);this.setInputs(new Set());}
 }
 private finishBoot():void{
  const h=this.emulator.gameManager.functions.getVideoDimensions('height');if(h>=224&&h<=256){this.overlay.height=h;this.topPadding=(h-224)>>1;}
  this.ready=true;this.previousX=word(this.gsu,P.x);this.previousBabyLost=babyIsLost(this.gsu);this.previousLives=this.wram[0x379];this.lastSave=performance.now();
  this.updateVisibility();this.onStatus(this.stageLabel+' · Your turn');this.changed();
 }
 private setInputs(next:Set<number>):void{for(let button=0;button<12;button++)this.emulator.gameManager.simulateInput(0,button,next.has(button)?1:0);}
 private updateVisibility():void{
  // Modify the verified ROM copy directly. Persistent cheats can restore stale
  // bytes when toggled, leaving native Yoshi hidden after a mount change.
  const hide=this.adventure.mount!=='yoshi'&&word(this.gsu,0xae)===0;
  setNativeDrawing(this.emulator.Module.HEAPU8,this.drawSite,hide);this.hidden=hide;
 }
 mount(mount:Mount):void{if(this.adventure.ride(mount)){this.updateVisibility();this.changed();}}
 stop():void{this.controls.stop();this.setInputs(new Set());}
 setPaused(value:boolean):void{this.stop();this.paused=value;this.emulator.gameManager.toggleMainLoop(value?0:1);if(value){void this.audio?.suspend();void this.save();}else void this.unlockAudio();}
 skipDialogue():void{this.skipUntil=performance.now()+5000;}
 async save():Promise<void>{
  if(!this.ready||this.saving)return;this.saving=true;const m=this.emulator.gameManager;
  try{m.toggleMainLoop(0);let state:Uint8Array;try{state=new Uint8Array(m.getState());}finally{if(!this.paused)m.toggleMainLoop(1);}await writeCampaign(state,this.adventure.serialize());this.lastSave=performance.now();}
  catch(e){console.warn('KONG_SAVE_ERROR',e);}finally{this.saving=false;}
 }
 tick(now:number):void{
  if(!this.ready||this.paused)return;
  const g=this.gsu;
  if(inGoal(g)){this.setInputs(new Set());this.draw(now,false);return;}
  const next=new Set<number>(),direction=this.controls.movement(now),rolling=now<this.controls.rollUntil;
  const yoshi=this.adventure.mount==='yoshi',jumpFrom=this.controls.jumpUntil-750,hop=now<this.controls.jumpUntil&&now<jumpFrom+150;
  if(direction)next.add(direction<0?INPUT.left:INPUT.right);
  if(yoshi?now<this.controls.jumpUntil:hop)next.add(INPUT.b);
  if(now<this.controls.tongueUntil)next.add(INPUT.y);
  // Patient scheme supports two separate taps on touch, mouse and keyboard.
  if(this.wram[P.mode]===P.gameplay)writeWord(g,0x82,0);
  const confirming=this.wram[0xd11]!==0&&this.controls.eggPressed(now);
  if(confirming)this.skipUntil=now+5000;else if(this.controls.eggPressed(now))next.add(INPUT.a);
  const vertical=this.controls.verticalAxis(now);if(vertical)next.add(vertical<0?INPUT.up:INPUT.down);
  for(const [button,until]of this.controls.extra)if(now<until)next.add(button);
  this.setInputs(next);
  if((this.autoSkip||now<this.skipUntil)&&skipOpenDialogue(this.wram,g))this.skipUntil=now+1000;
  const gameplay=this.wram[P.mode]===P.gameplay;
  this.updateVisibility();
  if(gameplay){
   const lost=babyIsLost(g),stars=word(this.wram,0x3b6);
   if(!(lost&&stars<=0))absorbHit(g);
   if(lost&&!this.previousBabyLost){this.adventure.hit();this.updateVisibility();this.changed();}this.previousBabyLost=lost;
   const lives=this.wram[0x379];if(lives<this.previousLives)this.adventure.resetRoom(this.room);this.previousLives=lives;
   const disabled=word(g,0x1ae)!==0,onFoot=this.adventure.mount==='foot';
   if(onFoot&&!disabled&&word(g,0xae)===0){
    const axis=rolling?this.controls.facing:this.controls.runAxis();
    writeWord(g,P.vx,rolling?this.controls.facing*0x360:dkcRun(signed16(word(g,P.vx)),axis));
   }
   if(rolling&&!disabled){
    writeWord(g,P.invincible,Math.max(word(g,P.invincible),4));
    if(yoshi&&word(g,0xae)===0)writeWord(g,P.vx,this.controls.facing*0x360);
    const hits=applyRoll(g,this.controls.facing);this.kills+=hits.length;for(const hit of hits)this.particles.push({...hit,until:now+420});
   }
   if(this.controls.jumpSequence!==this.jumpSequence){this.jumpSequence=this.controls.jumpSequence;if(!disabled&&this.adventure.mount==='winky')writeWord(g,P.vy,-0x700);else if(!disabled&&!yoshi)writeWord(g,P.vy,-0x4c0);}
   if(this.adventure.mount==='squawks'&&now<this.controls.jumpUntil&&!disabled)writeWord(g,P.vy,-0x180);
   const walls=breakTerrain(this.wram,g,this.controls.facing,rolling&&onFoot);this.walls+=walls.length;
   for(const hit of walls)this.particles.push({...hit,until:now+500});
   const x=word(g,P.x),y=word(g,P.y),grounded=signed16(word(g,P.vy))===0&&!disabled&&!lost&&word(g,0xae)===0;
   this.adventure.observe(this.room,x,y,grounded);
   const collected=this.adventure.breakNearby(this.room,x,y,rolling&&!disabled);
   if(collected.length){writeWord(g,P.sound,0x11);this.updateVisibility();this.changed();for(const item of collected)this.particles.push({x:item.x,y:item.y,until:now+500});}
   if(this.lastStage!==this.stageLabel){this.lastStage=this.stageLabel;this.onStatus(this.stageLabel);this.changed();}
  }
  this.draw(now,rolling);
  if(now-this.lastSave>20000&&!this.saving)void this.save();
 }
 private draw(now:number,rolling:boolean):void{
  const c=this.overlay.getContext('2d')!;c.clearRect(0,0,256,this.overlay.height);if(this.wram[P.mode]!==P.gameplay)return;
  const brightness=this.wram[0x200];if(brightness&0x80)return;c.globalAlpha=(brightness&15)/15;
  const g=this.gsu,x=word(g,P.x),y=word(g,P.y),cx=word(this.wram,P.cameraX),cy=word(this.wram,P.cameraY);
  const sx=signed16(x-cx)+12,sy=signed16(y-cy)+32+this.topPadding;
  for(const item of this.adventure.nearby(this.room)){
   const px=signed16(item.x-cx)+12,py=signed16(item.y-cy)+32+this.topPadding;
   if(px>=-64&&px<=320&&py>=-64&&py<=this.overlay.height+64)this.atlas.draw(c,item.kind==='barrel'?'barrel':'crate-'+item.kind,'idle',px,py,now);
  }
  if(word(g,0xae)===0){
   const moving=Math.abs(signed16(word(g,P.vx)))>8||x!==this.previousX,jumping=word(g,0xc0)!==0||Math.abs(signed16(word(g,P.vy)))>80;
   const state=rolling?'roll':jumping?'jump':moving?'walk':'idle',mount=this.adventure.mount;
   const key=`${this.character}:${mount}:${state}`;if(key!==this.animationKey){this.animationKey=key;this.animationStart=now;}const animationTime=now-this.animationStart;
   if(mount!=='foot'&&mount!=='yoshi')this.atlas.draw(c,mount,state,sx,sy,animationTime,this.controls.facing);
   if(!(mount==='yoshi'&&rolling))this.atlas.draw(c,this.character,mount==='foot'?state:'ride',sx,sy,animationTime,this.controls.facing);
   // Keep the native tongue's reach visible when Yoshi's body is hidden.
   if(mount!=='yoshi'&&(Math.abs(signed16(word(g,0x152)))+Math.abs(signed16(word(g,0x154)))>12)){const tx=signed16(word(g,0x15a)-cx),ty=signed16(word(g,0x15c)-cy)+this.topPadding;c.strokeStyle='#e8788e';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(sx+this.controls.facing*12,sy-23);c.lineTo(tx,ty);c.stroke();}
  }
  this.previousX=x;this.particles=this.particles.filter(p=>p.until>now);
  for(const p of this.particles){const age=1-(p.until-now)/500;c.fillStyle='#ffdd72';for(let i=0;i<6;i++){const a=i*Math.PI/3;c.fillRect(signed16(p.x-cx)+Math.cos(a)*age*28,signed16(p.y-cy)+this.topPadding+Math.sin(a)*age*22-15,3,3);}}
 }
 /** DEV fixture: real map16 wall in empty space ahead; no campaign fixture is shipped. */
 testWall():number{const g=this.gsu,x=(word(g,P.x)+48)&~15,y=word(g,P.y)&~15;let count=0;for(const dy of [0,16]){const address=tileAddress(g,x,y+dy);if(address!==undefined&&replaceTile(this.wram,g,x,y+dy,0x7b00,0xa022))count++;}return count;}
 diagnostics():Record<string,unknown>{return {mode:this.wram[P.mode].toString(16),stage:this.stageLabel,room:this.room,x:word(this.gsu,P.x),y:word(this.gsu,P.y),form:word(this.gsu,0xae),babyLost:babyIsLost(this.gsu),kills:this.kills,walls:this.walls,terrain:{queue:word(this.wram,0x9ef),terminator:word(this.wram,0x9f1),left:word(this.gsu,0xa4),top:word(this.gsu,0xa6),ahead:[0,16,32].map(d=>{const x=(word(this.gsu,P.x)+48)&~15,y=(word(this.gsu,P.y)+d)&~15;return {x,y,tile:word(this.wram,tileAddress(this.gsu,x,y)??0).toString(16)};})},party:this.adventure.serialize(),message:this.wram[0xd11],messageScript:word(this.gsu,0x406e),videoHeight:this.overlay.height,frame:this.emulator.gameManager.functions.getFrameNum(),paused:this.paused,audio:this.audio?.state??'unavailable',nativeDrawHidden:this.hidden,eggs:this.eggCount,aiming:this.aiming,eggState:word(this.gsu,0xde),mouth:word(this.gsu,0x150),ammo:word(this.gsu,0x16a),sprites:Array.from({length:24},(_,i)=>({slot:i,state:word(this.gsu,0xf00+i*4),id:word(this.gsu,0x1360+i*4),x:word(this.gsu,0x10e2+i*4),y:word(this.gsu,0x1182+i*4)})).filter(s=>s.state===0x10)};}
}
