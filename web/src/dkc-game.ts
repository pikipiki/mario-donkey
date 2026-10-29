import{LiveGame}from'./game';
import{dkcStageName}from'./dkc-levels';
import{Adventure,type Character,type Mount}from'./adventure';
import{type Emulator,INPUT,resolveMemory,waitForNativeFrames,waitForNativePause}from'./engine';
import{Controls}from'./controls';
import{SpriteAtlas}from'./atlas';
import{configureOverlay}from'./overlay';
import{loadFile,storeFile}from'./storage';
import{readBeforeDeadline}from'./startup';
import{decodeWorldParty,WORLD_PARTY_KEY}from'./world';
import {DkcGuardian} from './dkc-guardian';
import {DkcBossFinishHooks,pendingBossVictory} from './dkc-boss-finish';
import {DkcBossRomHooks} from './dkc-boss-rom';
import {drawDkcGuardian} from './dkc-guardian-draw';
import {word} from './profile';
import{DkcCombat}from'./dkc-combat';
import{decodeDkcSave,encodeDkcSave,DKC_SAVE_KEY,DKC_MAP_KEY}from'./dkc-save';
import{validateDkcNativeState}from'./snapshot';
import{readDkcScene,dkcEnemies,killDkcEnemy}from'./dkc-profile';
export class DkcGame extends LiveGame{
 private combat=new DkcCombat();private dkGuardian=new DkcGuardian();private dkBossHooks?:DkcBossRomHooks;private dkBossFinish?:DkcBossFinishHooks;private dkMusicHeld=false;private dkLastSave=0;private dkSaving?:Promise<void>;private dkCapturing=false;private dkMap=false;private dkHeight=224;private dkFrame=0;private dkAnimation='';private dkAnimationAt=0;private dkStage='';private dkRoom?:number;
 constructor(emulator:Emulator,controls:Controls,private dkCanvas:HTMLCanvasElement,private dkAtlas:SpriteAtlas,private dkStatus:(message:string)=>void,private dkChanged:()=>void=()=>{}){super(emulator,controls,dkCanvas,dkAtlas,dkStatus,dkChanged);}
 override get world():'yoshi'|'dkc'{return 'dkc';}
 override get isMap():boolean{return this.ready&&readDkcScene(this.wram).isMap;}
 override get canRepairDisplay():boolean{return this.ready;}
 override get eggsUnlimited():boolean{return this.dkGuardian.active;}
 override get eggCount():number{return this.combat.eggs;}
 override get messageOpen():boolean{return false;}
 override get aiming():boolean{return Boolean(this.combat.aiming);}
 override get stageLabel():string{const s=readDkcScene(this.wram);return s.isMap?'Donkey Goonk · World map':s.playing?`Donkey Goonk · ${dkcStageName(s.level)}`:'Donkey Kong Country · Select your game';}
 override get room():string{return `dkc:${readDkcScene(this.wram).level}`;}
 override set character(value:Character){if(this.adventure.select(value))this.dkChanged();}
 override get character():Character{return this.adventure.active;}
 override mount(value:Mount):void{if(this.adventure.ride(value))this.dkChanged();}
 override async prepare():Promise<void>{
  const m=this.emulator.gameManager;await this.unlockAudio().catch(()=>{});
  await waitForNativeFrames(m);this.wramBase=await resolveMemory(m,0x7e1fe0,0x1fe0,0x20000,false);
  this.dkBossHooks=new DkcBossRomHooks(this.emulator.Module.HEAPU8);this.dkBossHooks.sync(true);this.dkBossFinish=new DkcBossFinishHooks(this.emulator.Module.HEAPU8);m.toggleMainLoop(1);
  const fresh=import.meta.env.DEV&&new URLSearchParams(location.search).has('fresh');
  const saved=fresh?undefined:await readBeforeDeadline(loadFile(DKC_SAVE_KEY),4000);
  if(saved){const data=decodeDkcSave(saved);m.loadState(data.state);await waitForNativeFrames(m);this.adventure=new Adventure(data.adventure);this.combat.restore(data.combat);this.dkGuardian.restore(data.guardian);}
  else{
   const r=await fetch(`${import.meta.env.BASE_URL}bootstrap/dkc-map-snes9x-2.0.2.state`);
   if(r.ok&&!r.headers.get('content-type')?.includes('text/html')){const state=new Uint8Array(await r.arrayBuffer());validateDkcNativeState(state);m.loadState(state);await waitForNativeFrames(m);}
   else throw new Error('The Donkey Goonk map could not be loaded. Reload to try again. Your saves are kept.');
  }
  const party=decodeWorldParty(await readBeforeDeadline(loadFile(WORLD_PARTY_KEY),3000).catch(()=>undefined));
  if(party){this.adventure=new Adventure(party);await storeFile(WORLD_PARTY_KEY,new Uint8Array());}
  const height=m.functions.getVideoDimensions('height');if(height>=224&&height<=256)this.dkHeight=height;
  const savedGuardian=this.dkGuardian.state;this.dkMusicHeld=Boolean(savedGuardian?.phase==='released'&&savedGuardian.music!==undefined&&word(this.wram,0x51d)===0);
  configureOverlay(this.dkCanvas,this.dkHeight);this.dkRoom=readDkcScene(this.wram).level;this.ready=true;this.dkLastSave=performance.now();this.stop();m.toggleMainLoop(1);this.dkChanged();this.dkStatus(this.stageLabel);
 }
 override stop():void{this.bossAudio.pause();this.dkGuardian.pause();this.animalAudio.stop();this.controls.stop();this.combat.resetClock();for(let b=0;b<12;b++)this.emulator.gameManager.simulateInput(0,b,0);}
 override setPaused(value:boolean):void{this.stop();this.paused=value;if(!this.dkCapturing)this.emulator.gameManager.toggleMainLoop(value?0:1);this.emulator.setVolume(value?0:1);if(value)void this.save().catch(e=>this.dkStatus((e as Error).message));else void this.unlockAudio();}
 override skipDialogue():void{if(!readDkcScene(this.wram).playing)this.controls.pulse(INPUT.start,performance.now());}
 override goToMap():void{void this.returnToMap();}
 private async returnToMap():Promise<void>{
  const bytes=await loadFile(DKC_MAP_KEY);if(!bytes){this.dkStatus('Return through the native stage exit to reach the DKC map.');return;}
  const saved=decodeDkcSave(bytes),m=this.emulator.gameManager;await this.save();await waitForNativePause(m);this.stop();m.loadState(saved.state);m.toggleMainLoop(1);await waitForNativeFrames(m);this.paused=false;this.combat.shots=[];this.dkGuardian.clear();this.dkBossHooks?.sync(false);this.dkBossFinish?.sync(false);this.bossAudio.stop();this.dkMusicHeld=false;this.dkStatus('Donkey Goonk · World map');
 }
 override async repairDisplay():Promise<void>{await this.returnToMap();}
 override async saveForWorldSwitch():Promise<void>{if(!this.ready)throw new Error('The game is not ready.');await this.save();}
 override save():Promise<void>{
  if(!this.ready)return Promise.resolve();
  if(this.dkSaving)return this.dkSaving;
  this.dkSaving=(async()=>{
   const m=this.emulator.gameManager;this.dkCapturing=true;
   try{
    await waitForNativePause(m);
    const bytes=encodeDkcSave({state:new Uint8Array(m.getState()),adventure:this.adventure.serialize(),combat:this.combat.serialize(),guardian:this.dkGuardian.state});
    await storeFile(DKC_SAVE_KEY,bytes);if(this.isMap)await storeFile(DKC_MAP_KEY,bytes);this.dkLastSave=performance.now();
   }finally{this.dkCapturing=false;if(!this.paused)m.toggleMainLoop(1);}
  })().finally(()=>{this.dkSaving=undefined;});return this.dkSaving;
 }
 override tick(now:number):void{
  if(!this.ready||this.paused||this.dkCapturing)return;
  const m=this.emulator.gameManager,w=this.wram,s=readDkcScene(w);
  if(this.dkRoom!==s.level){this.dkRoom=s.level;this.combat.shots=[];this.combat.resetClock();}
  const bossResult=this.dkGuardian.update(w,m.functions.getFrameNum(),slot=>this.dkBossHooks?.isMapExit(w,slot)??false,pendingBossVictory(w));
  this.dkBossHooks?.sync(s.playing&&this.dkGuardian.state?.phase!=='released');
  this.dkBossFinish?.sync(this.dkGuardian.state?.phase!=='released');
  const guardian=this.dkGuardian.state;
  const musicPlaying=this.bossAudio.sync(this.audio,s.playing&&guardian?{world:'yoshi',id:'burt',phase:guardian.phase}:undefined);
  // Native music dispatch is performed by the guarded exit routine.
  if(musicPlaying&&guardian){
   guardian.music??=word(w,0x523);this.dkBossHooks?.music('stop',guardian.music);this.dkMusicHeld=true;
  }else if(this.dkMusicHeld){
   if(s.playing&&guardian?.music!==undefined){this.dkBossHooks?.music('resume',guardian.music);if(word(w,0x51d)!==0)this.dkMusicHeld=false;}
   else{this.dkBossHooks?.music('none');this.dkMusicHeld=false;}
  }else this.dkBossHooks?.music('none');
  if(bossResult.effect)this.bossAudio.effect(bossResult.effect,'burt');
  if(bossResult.notice)this.dkStatus(bossResult.notice);
  const map=s.isMap;if(map&&!this.dkMap){this.combat.shots=[];this.combat.resetClock();void this.save();this.dkStatus(this.stageLabel);}this.dkMap=map;
  const next=new Set<number>();const move=this.controls.movement(now),vertical=this.controls.verticalAxis(now);
  if(move)next.add(move<0?INPUT.left:INPUT.right);if(vertical)next.add(vertical<0?INPUT.up:INPUT.down);
  if(this.controls.jumpPressed(now))next.add(INPUT.b);if(now<this.controls.rollUntil&&s.playing)next.add(INPUT.y);
  if(!s.playing&&(this.controls.eggPressed(now)||now<this.controls.tongueUntil))next.add(INPUT.b);
  for(const[b,until]of this.controls.extra)if(now<until)next.add(b);
  for(let b=0;b<12;b++)m.simulateInput(0,b,next.has(b)?1:0);
  this.dkFrame=m.functions.getFrameNum();
  if(s.playing){
   const result=this.combat.update(this.dkFrame,now,{x:s.x,y:s.y,facing:this.controls.facing},dkcEnemies(w),this.controls.eggPressed(now),now<this.controls.tongueUntil,this.controls.tongueUpPressed(now),target=>{if(target.slot===-1){const accepted=this.dkGuardian.hit();if(accepted)this.bossAudio.effect(this.dkGuardian.state?.phase==='dying'?'defeat':'hit','burt');return accepted;}return killDkcEnemy(w,target.slot);},this.dkGuardian.target(),{down:vertical>0,direction:this.controls.tongueDirection(now)});
   if(result.threw)this.animalAudio.play('enguarde-attack');
   this.kills+=result.killed+Number(result.ate);if(result.ate){this.dkStatus('Enemy in mouth · Press Down to make an egg');this.dkChanged();}else if(result.madeEgg){this.dkStatus('Egg ready · Aim, then throw');this.dkChanged();}else if(result.threw)this.dkStatus('Egg thrown');
  }else{this.combat.shots=[];this.combat.resetClock();}
  if(this.dkStage!==this.stageLabel){this.dkStage=this.stageLabel;this.dkChanged();this.dkStatus(this.dkStage);}
  this.drawDkc(now,s);
  if(now-this.dkLastSave>20000&&!this.dkSaving)void this.save().catch(e=>this.dkStatus((e as Error).message));
 }
 private drawDkc(now:number,s:ReturnType<typeof readDkcScene>):void{
  const c=this.dkCanvas.getContext('2d')!;c.clearRect(0,0,256,this.dkHeight);const brightness=this.wram[0x51a];if(!s.playing||(brightness&0x80))return;c.globalAlpha=(brightness&15)/15;
  const x=s.x-s.cameraX,y=s.y-s.cameraY,pad=(this.dkHeight-224)>>1;
  for(const p of this.combat.eggTrail)this.dkAtlas.drawEgg(c,p.x-s.cameraX,p.y-s.cameraY+pad,now);
  const moving=Math.abs(this.controls.runAxis())>.1,rolling=now<this.controls.rollUntil;
  const animation=rolling?'roll':!s.grounded?'jump':moving?'walk':'idle';if(this.dkAnimation!==animation){this.dkAnimation=animation;this.dkAnimationAt=now;}
  this.dkAtlas.draw(c,this.adventure.active,animation,x,y+pad,now-this.dkAnimationAt,this.controls.facing);
  const t=this.combat.tongue;
  if(t)this.dkAtlas.drawTongue(c,t.x-s.cameraX,t.y-s.cameraY+pad,t.endX-s.cameraX,t.endY-s.cameraY+pad,1-(t.until-now)/150);
  for(const p of this.combat.shots)this.dkAtlas.drawEgg(c,p.x-s.cameraX,p.y-s.cameraY+pad,p.age*1000,true);
  const aim=this.combat.aiming;
  if(aim){const ax=aim.endX-s.cameraX,ay=aim.endY-s.cameraY+pad;c.strokeStyle='#fff4ad';c.lineWidth=1;c.beginPath();c.arc(ax,ay,6,0,Math.PI*2);c.moveTo(ax-9,ay);c.lineTo(ax+9,ay);c.moveTo(ax,ay-9);c.lineTo(ax,ay+9);c.stroke();}
  drawDkcGuardian(c,this.dkAtlas,this.dkGuardian.state,s.cameraX,s.cameraY,pad);
  c.globalAlpha=1;
 }
 override diagnostics():Record<string,unknown>{return{bossFinish:this.dkBossFinish?.bases.map(base=>({base,hold:this.emulator.Module.HEAPU8[base+0x3bfbfe],banana:Array.from(this.emulator.Module.HEAPU8.slice(base+0x3f836c,base+0x3f8370))})),victory:pendingBossVictory(this.wram),nativeActors:Array.from({length:23},(_,i)=>6+i*2).map(slot=>({slot,id:word(this.wram,0xd45+slot),state:word(this.wram,0x1029+slot)})).filter(a=>a.id),native:{mode:this.wram[0x32]|this.wram[0x33]<<8,scene:this.wram[0x40]|this.wram[0x41]<<8,process:this.wram[0x508]|this.wram[0x509]<<8,brightness:this.wram[0x51a],playerIds:[this.wram[0xd45]|this.wram[0xd46]<<8,this.wram[0xd47]|this.wram[0xd48]<<8,this.wram[0xd49]|this.wram[0xd4a]<<8]},nativeMusic:{playing:word(this.wram,0x51d),song:word(this.wram,0x523),bank:word(this.wram,0x521)},guardian:this.dkGuardian.state,bossAudio:{playing:this.bossAudio.playing,played:this.bossAudio.played,last:this.bossAudio.lastEffect},world:'dkc',...readDkcScene(this.wram),eggs:this.eggCount,mouth:this.combat.mouth,aiming:this.combat.aiming,tongue:this.combat.tongue,shots:this.combat.shots,kills:this.kills,enemies:dkcEnemies(this.wram),frame:this.dkFrame,paused:this.paused,audio:this.audio?.state,party:this.adventure.serialize()};}
}
