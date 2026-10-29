import {WORLD_PARTY_KEY,decodeWorldParty} from './world';
import {BossRomHooks} from './boss-rom';
import {StageBosses,guardianHitbox} from './boss';
import {NativeBossEggs,NativeEggFlights} from './boss-eggs';
import {drawStageBoss} from './boss-draw';
import {BossAudio} from './boss-audio';
import {captureYoshiBossSong,stopYoshiBossSong,restoreYoshiBossSong} from './native-boss-music';
import {AnimalAudio,AnimalSoundTracker,isAnimalMount} from './animal-sound';
import { nativeAudioContexts, resumeNativeAudio } from './audio';
import { loadStartState } from './bootstrap';
import {createRecoveryState} from './recovery';
import { readBeforeDeadline } from './startup';
import {breakTerrain,tileAddress,replaceTile} from './terrain';
import { Controls } from './controls';
import { type Emulator, INPUT, primeAudio, resolveMemory, resolveDrawing, setNativeDrawing, waitForNativeFrames, waitForNativePause } from './engine';
import { queueNativeSound, PROFILE as P, KONG_JUMP_HOLD_MS, SQUAWKS_FLIGHT_VELOCITY, squawksFlightVelocity, NativeJumpBoost, NativeFlutterInput, canModifyJump, canWriteVelocity, hideNativePlayer, absorbHit, keepBabyVisible, applyRoll, babyIsLost, dkcRun, inGoal, signed16, skipOpenDialogue, word, writeWord } from './profile';
import { loadFile,storeFile } from './storage';
import { Adventure, type Character, type Mount } from './adventure';
import { SpriteAtlas } from './atlas';
import { configureOverlay } from './overlay';
import {campaignStageLabel,isWorldMap,needsLevelReturn,MapConfirmInput} from './menu';
import { type Campaign,readCampaign,writeCampaign,backupCampaign } from './campaign';
export type { Character } from './adventure';
const sleep=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
const INITIAL='campaign-eu-map-v3-snes9x-2.0.2';
export class LiveGame {
 private bosses=new StageBosses();private bossHooks?:BossRomHooks;private nativeBossEggs?:NativeBossEggs;private eggFlights=new NativeEggFlights();
 protected bossAudio=new BossAudio();private nativeBossSongHeld=false;
 protected animalAudio=new AnimalAudio();private animalSounds=new AnimalSoundTracker();
 keepBabyOnScreen=true;
 wramBase=0;gsuBase=0;ready=false;paused=false;kills=0;walls=0;adventure=new Adventure();autoSkip=false;
 private drawSite=0;private animationKey='';private animationStart=0;private previousX=0;private topPadding=0;private hidden?:boolean;private previousBabyLost=false;private previousLives=0;
 private skipUntil=0;private lastSave=0;private saving?:Promise<void>;private queuedSave?:Campaign;private jumpSequence=0;private lastStage='';private wasFinishing=false;
 private originalCampaign?:Campaign;private loadedCampaign=false;private recovering=false;private capturing=false;private capture?:Promise<Campaign|undefined>;private lastCapture?:Campaign;private mapConfirm=new MapConfirmInput();private jumpBoost=new NativeJumpBoost();private flutterInput=new NativeFlutterInput();
 private videoHeight=239;
 private particles:Array<{x:number;y:number;until:number}>=[];
 constructor(public emulator:Emulator,public controls:Controls,private overlay:HTMLCanvasElement,private atlas:SpriteAtlas,private onStatus:(message:string)=>void,private changed:()=>void=()=>{}){}
 get world():'yoshi'|'dkc'{return 'yoshi';}
 get isMap():boolean{return this.ready&&isWorldMap(this.wram);}
 get canRepairDisplay():boolean{return (this.ready||this.loadedCampaign)&&[0,P.gameplay,0x26].includes(this.wram[P.mode]);}
 get eggsUnlimited():boolean{return Boolean(this.bossHooks)&&this.bosses.eggsUnlimited;}
 get eggCount():number{return Math.min(6,word(this.gsu,0x1df6)>>>1);}
 get messageOpen():boolean{return this.ready&&this.wram[P.mode]===P.gameplay&&this.wram[0xd11]!==0;}
 get aiming():boolean{return word(this.gsu,0xec)!==0;}
 get character():Character{return this.adventure.active;}
 set character(character:Character){if(this.adventure.select(character))this.changed();}
 get wram():Uint8Array{return this.emulator.Module.HEAPU8.subarray(this.wramBase,this.wramBase+0x20000);}
 get gsu():Uint8Array{return this.emulator.Module.HEAPU8.subarray(this.gsuBase,this.gsuBase+0x8000);}
 get audio():AudioContext|undefined{return this.emulator.Module.AL?.currentCtx?.audioCtx??nativeAudioContexts(this.emulator.Module)[0];}
 get stageLabel():string{return campaignStageLabel(this.wram); }
 get room():string{return `${this.wram[0x218]}:${this.wram[P.stage]}:${word(this.wram,0x32).toString(16)}:${this.wram[0x34]}`;}
 async unlockAudio():Promise<void>{
  primeAudio();
  void this.animalAudio.prepare(this.audio);
  void this.bossAudio.prepare(this.audio,this.world==='yoshi'?'dkc':'yoshi',this.world==='dkc'?'burt':this.bosses.state?.id??'');
  await resumeNativeAudio(this.emulator.Module,()=>this.emulator.setVolume(this.paused?0:1));
 }
 async prepare():Promise<void>{
  const m=this.emulator.gameManager,start=performance.now();
  await this.unlockAudio().catch(()=>{});
  while(m.functions.getFrameNum()<5&&performance.now()-start<15000){if(m.functions.getFrameNum()<1)await this.unlockAudio().catch(()=>{});await sleep(30);}
  if(m.functions.getFrameNum()<1)throw new Error('The SNES core is not drawing. Try again.');
  m.toggleMainLoop(0);
  // These probes run only on the disposable title scene. The complete campaign
  // or bootstrap is loaded once afterwards; never queue intermediate title restores.
  try{this.wramBase=await resolveMemory(m,0x7e1fe0,0x1fe0,0x20000,false);this.gsuBase=await resolveMemory(m,0x7007e0,0x7e0,0x8000,false);this.drawSite=await resolveDrawing(m,false);}finally{m.toggleMainLoop(1);}
  this.bossHooks=new BossRomHooks(this.emulator.Module.HEAPU8,this.drawSite);this.nativeBossEggs=new NativeBossEggs(this.emulator.Module.HEAPU8,this.drawSite);
  const fresh=import.meta.env.DEV&&new URLSearchParams(location.search).has('fresh');
  const campaign=fresh?undefined:await readBeforeDeadline(readCampaign(),4000);
  if(campaign){
   // Keep the verified disk bytes independent of a native restore that may
   // leave RAM partially initialized. Recovery must not copy that damaged RAM.
   this.originalCampaign={state:campaign.state.slice(),adventure:structuredClone(campaign.adventure)};
   this.bosses.restore(campaign.adventure.guardian);this.bossHooks.sync(this.bosses.state?.kind,this.bosses.state?.phase);
   this.onStatus('Resuming your saved game…');m.toggleMainLoop(0);
   try{
    m.loadState(campaign.state);
    this.stop();m.toggleMainLoop(1);
    // RetroArch queues load_state: the core must run before WRAM reflects it.
    await waitForNativeFrames(m);m.toggleMainLoop(0);
    this.loadedCampaign=true;this.adventure=new Adventure(campaign.adventure);
    if(this.wram[P.mode]>0&&this.wram[P.mode]<=0x50){
     // Start the saved native scene only after the bridge and partners are ready.
     // A held touch/key from the previous session must not survive the restore.
     this.stop();this.jumpSequence=this.controls.jumpSequence;
     await this.applyWorldParty();this.finishBoot();return;
    }
    throw new Error(this.canRepairDisplay?'The saved screen could not resume. Open ☰ → Repair display to rebuild the map and keep your progress.':'Your saved game could not be restored. Reload the page to retry.');
   }finally{m.toggleMainLoop(1);}
  }
  this.onStatus('Opening the stage selection…');
  m.functions.toggleFastForward(0);
  // Use a verified bundled snapshot instead of driving title-screen menus.
  const initial=await loadStartState();m.loadState(initial);await waitForNativeFrames(m);
  if(this.wram[P.mode]!==0x26)throw new Error('The starting level could not be restored. Reload the page to retry.');
  void storeFile(INITIAL,initial).catch(()=>{});
  await this.applyWorldParty();this.finishBoot();
 }

 private async applyWorldParty():Promise<void>{
  const party=decodeWorldParty(await readBeforeDeadline(loadFile(WORLD_PARTY_KEY),3000).catch(()=>undefined));
  if(!party)return;
  const current=this.adventure.serialize();this.adventure=new Adventure({...current,...party,pickups:current.pickups,guardian:current.guardian});
  await storeFile(WORLD_PARTY_KEY,new Uint8Array()).catch(()=>{});
 }
 private finishBoot():void{
  this.adventure.guardian=this.bosses.state;
  const h=this.emulator.gameManager.functions.getVideoDimensions('height');if(h>=224&&h<=256){this.videoHeight=h;this.topPadding=(h-224)>>1;}
  configureOverlay(this.overlay,this.videoHeight);
  this.ready=true;this.previousX=word(this.gsu,P.x);this.previousBabyLost=babyIsLost(this.gsu);this.previousLives=this.wram[0x379];this.lastSave=performance.now();
  this.updateVisibility();this.onStatus(this.stageLabel+' · Your turn');this.changed();
 }
 private setInputs(next:Set<number>):void{for(let button=0;button<12;button++)this.emulator.gameManager.simulateInput(0,button,next.has(button)?1:0);}
 private updateVisibility():void{
  // Modify the verified ROM copy directly. Persistent cheats can restore stale
  // bytes when toggled, leaving native Yoshi hidden after a mount change.
  const hide=hideNativePlayer(this.wram[P.mode],this.adventure.mount,word(this.gsu,0xae),inGoal(this.gsu),this.messageOpen);
  setNativeDrawing(this.emulator.Module.HEAPU8,this.drawSite,hide);this.hidden=hide;
 }
 mount(mount:Mount):void{const previous=this.adventure.mount;if(this.adventure.ride(mount)){if(previous!==mount&&isAnimalMount(mount)&&this.ready&&!this.paused&&this.wram[P.mode]===P.gameplay)this.animalAudio.play('animal-mount');this.animalSounds.reset();this.updateVisibility();this.changed();}}
 stop():void{this.bossAudio.pause();this.bosses.pause();this.eggFlights.reset();this.nativeBossEggs?.sync(false);this.animalAudio.stop();this.animalSounds.reset();this.controls.stop();this.mapConfirm.reset();this.jumpBoost.reset();this.flutterInput.reset();this.setInputs(new Set());}
 setPaused(value:boolean):void{if(this.recovering||(!this.ready&&!value))return;this.stop();this.paused=value;if(!this.capturing)this.emulator.gameManager.toggleMainLoop(value?0:1);if(value){this.emulator.setVolume(0);void this.save();}else void this.unlockAudio();}
 /** Native fade-out and overworld initialization; keeps completed-level progress. */
 goToMap():void{
  this.bossAudio.stop();this.nativeBossSongHeld=false;this.bosses.clear();this.adventure.guardian=undefined;this.bossHooks?.sync();
  this.stop();this.wram[P.mode]=0x23;writeWord(this.wram,0x200,0x010f);
 }
 /** Rebuild the native map graphics without resetting SRAM or stage progress.
  * Keep a separate recovery copy before leaving the current position. */
 async repairDisplay():Promise<void>{
  if(this.recovering)return;
  if(!this.canRepairDisplay)throw new Error('Wait for the level or world map, then try Repair display again.');
  const m=this.emulator.gameManager;
  this.recovering=true;this.stop();this.paused=true;m.toggleMainLoop(0);
  let snapshot:Campaign|undefined,changed=false;
  try{
   await this.capture;await waitForNativePause(m);
   const original=!this.ready?this.originalCampaign:undefined;
   snapshot=original?{state:original.state.slice(),adventure:structuredClone(original.adventure)}:
    {state:new Uint8Array(m.getState()),adventure:structuredClone(this.adventure.serialize())};
   // Wait for any older autosave before making the independent recovery copy.
   await this.saving;await backupCampaign(snapshot);
   setNativeDrawing(this.emulator.Module.HEAPU8,this.drawSite,false);this.hidden=false;
   this.onStatus('Rebuilding the world map…');
   const clean=createRecoveryState(await loadStartState(),snapshot.state);
   changed=true;m.loadState(clean);m.toggleMainLoop(1);await waitForNativeFrames(m);m.toggleMainLoop(0);
   this.goToMap();m.toggleMainLoop(1);const started=performance.now();
   do{
    await waitForNativeFrames(m);
    if(performance.now()-started>12000)throw new Error('The display could not be rebuilt. Your previous save has been kept.');
   }while(this.wram[P.mode]!==0x26);
   m.toggleMainLoop(0);this.adventure=new Adventure(snapshot.adventure);this.finishBoot();
   this.onStatus('Display rebuilt · Select your level to start it again.');
  }catch(error){
   if(changed&&snapshot){
    // Roll back rather than save an unfinished transition as the next resume.
    m.loadState(snapshot.state);m.toggleMainLoop(1);
    try{await waitForNativeFrames(m);}
    catch{this.ready=false;throw new Error('The game could not be restored. Your save is kept. Reload the page to retry.');}
    finally{m.toggleMainLoop(0);}
    this.updateVisibility();
   }
   throw error;
  }finally{m.toggleMainLoop(0);this.recovering=false;}
 }
 skipDialogue():void{this.skipUntil=performance.now()+5000;}
 async saveForWorldSwitch():Promise<void>{
  if(!this.ready)throw new Error('The game is not ready to change worlds.');
  await this.save();const snapshot=await this.captureSave();
  if(!snapshot)throw new Error('The current game could not be saved. Stay here and try again.');
  await writeCampaign(snapshot.state,snapshot.adventure);
 }
 save():Promise<void>{
  if(!this.ready||this.recovering||this.wram[P.mode]===0)return Promise.resolve();
  if(!this.capture){
   const pending=this.captureSave();this.capture=pending;
   void pending.then(()=>{if(this.capture===pending)this.capture=undefined;});
  }
  return this.capture.then(snapshot=>{
   if(snapshot&&snapshot!==this.lastCapture){this.lastCapture=snapshot;this.queuedSave=snapshot;}
   return this.saving??(this.queuedSave?(this.saving=this.flushSaves()):Promise.resolve());
  });
 }
 private async captureSave():Promise<Campaign|undefined>{
  const m=this.emulator.gameManager;this.capturing=true;
  try{
   // toggleMainLoop only requests a stop. Serializing the still-running native
   // iteration can save inconsistent CPU/graphics state, even with intact RAM.
   await waitForNativePause(m);
   if(!this.ready||this.recovering||this.wram[P.mode]===0)return;
   return {state:new Uint8Array(m.getState()),adventure:structuredClone(this.adventure.serialize())};
  }catch(error){this.lastSave=performance.now();console.warn('KONG_SAVE_ERROR',error);return;}
  finally{this.capturing=false;if(!this.paused&&!this.recovering)m.toggleMainLoop(1);}
 }
 private async flushSaves():Promise<void>{
  try{
   while(this.queuedSave){
    const snapshot=this.queuedSave;this.queuedSave=undefined;
    try{await writeCampaign(snapshot.state,snapshot.adventure);this.lastSave=performance.now();}
    catch(e){console.warn('KONG_SAVE_ERROR',e);}
   }
  }
  finally{this.saving=undefined;}
 }
 tick(now:number):void{
  if(!this.ready||this.paused||this.recovering||this.capturing)return;
  const g=this.gsu;
  if(this.bossHooks){
   const box=guardianHitbox(this.bosses.state);
   const eggHit=this.wram[P.mode]===P.gameplay&&box?this.eggFlights.collide(g,box)>0:false;
   if(!box)this.eggFlights.reset();
   const result=this.bosses.update(this.wram,g,this.emulator.gameManager.functions.getFrameNum(),eggHit,this.videoHeight);
   this.nativeBossEggs?.sync(this.wram[P.mode]===P.gameplay&&this.bosses.eggsUnlimited);
   this.adventure.guardian=this.bosses.state;
   if(this.wram[P.mode]===P.victory)this.bossHooks.restore();else this.bossHooks.sync(this.bosses.state?.kind,this.bosses.state?.phase);
   const guardian=this.bosses.state,nativeGameplay=this.wram[P.mode]===P.gameplay&&!inGoal(g);
   const playing=this.bossAudio.sync(this.audio,nativeGameplay&&guardian?{world:'dkc',id:guardian.id,phase:guardian.phase}:undefined);
   if(playing&&!this.nativeBossSongHeld){
    if(guardian)guardian.music=captureYoshiBossSong(this.wram,guardian.music);
    stopYoshiBossSong(this.wram);this.nativeBossSongHeld=true;
   }else if(!playing&&this.nativeBossSongHeld){
    if(nativeGameplay)restoreYoshiBossSong(this.wram,guardian?.music,inGoal(g));
    this.nativeBossSongHeld=false;
   }
   if(result.sound==='hurt')queueNativeSound(this.wram,0x17);
   else if(result.sound==='hit')this.bossAudio.effect(guardian?.phase==='dying'?'defeat':'hit',guardian?.id);
   else if(result.sound==='attack'||result.sound==='land')this.bossAudio.effect(result.sound,guardian?.id);
   if(result.notice)this.onStatus(result.notice);
  }
  const goalHandoff=this.wram[P.mode]===P.gameplay&&inGoal(g);
  const finishing=goalHandoff||this.wram[P.mode]===P.victory;
  // A sticky direction/roll must not carry through the ceremony onto the map.
  // Clear once on entry so new confirmation presses still work afterwards.
  if(finishing&&!this.wasFinishing){this.stop();this.jumpSequence=this.controls.jumpSequence;}
  this.wasFinishing=finishing;
  if(goalHandoff){this.animalAudio.stop();this.animalSounds.reset();this.jumpBoost.reset();this.setInputs(new Set());this.updateVisibility();this.draw(now,false);return;}
  const gameplay=this.wram[P.mode]===P.gameplay,dialogue=this.messageOpen,lost=gameplay&&babyIsLost(g);
  // Resolve the rescue mount before inputs/physics so Yoshi can flutter this frame.
  if(gameplay){
   if(lost&&!this.previousBabyLost){this.adventure.hit();this.controls.rollUntil=0;this.updateVisibility();this.changed();}
   this.previousBabyLost=lost;
  }
  const jumpRequested=this.controls.jumpSequence!==this.jumpSequence;this.jumpSequence=this.controls.jumpSequence;
  const jumpVelocity=this.jumpBoost.update(g,this.adventure.mount,now,jumpRequested,gameplay&&!dialogue);
  const next=new Set<number>(),direction=this.controls.movement(now),rolling=now<this.controls.rollUntil;
  const menuPressed=this.controls.jumpPressed(now)||this.controls.eggPressed(now),mapAction=this.mapConfirm.update(this.wram,menuPressed);
  const yoshi=this.adventure.mount==='yoshi',jumpFrom=this.controls.jumpStartedAt,hop=this.controls.jumpPressed(now)&&now<jumpFrom+KONG_JUMP_HOLD_MS&&(!gameplay||this.adventure.mount!=='foot'||this.jumpBoost.inputPressed(now));
  if(direction)next.add(direction<0?INPUT.left:INPUT.right);
  const flutter=this.flutterInput.pressed(g,now,this.controls.jumpSequence,this.controls.jumpHeld,this.controls.jumpPressed(now),yoshi&&gameplay&&!dialogue&&canModifyJump(g));
  // Squawks uses native B only to leave the ground. Midair B would start
  // Yoshi's flutter as well as our flight, giving two competing movements.
  const squawks=this.adventure.mount==='squawks';
  if((yoshi?flutter:hop)&&!(squawks&&gameplay&&!dialogue&&word(g,0xc0)!==0))next.add(INPUT.b);
  if(now<this.controls.tongueUntil)next.add(INPUT.y);
  // Patient scheme supports two separate taps on touch, mouse and keyboard.
  if(this.wram[P.mode]===P.gameplay)writeWord(g,0x82,0);
  const confirming=this.wram[P.mode]===P.gameplay&&this.wram[0xd11]!==0&&this.controls.eggPressed(now);
  if(confirming)this.skipUntil=now+5000;else if(this.controls.eggPressed(now))next.add(this.wram[P.mode]===0x26?INPUT.b:INPUT.a);
  const vertical=this.controls.tongueUpPressed(now)?-1:this.controls.verticalAxis(now);if(vertical)next.add(vertical<0?INPUT.up:INPUT.down);
  for(const [button,until]of this.controls.extra)if(now<until)next.add(button);
  // A held confirmation must keep the same menu action after the tab closes.
  if(isWorldMap(this.wram)&&menuPressed){
   next.clear();if(mapAction==='enter')next.add(INPUT.b);else if(mapAction==='levels'&&needsLevelReturn(this.wram))next.add(INPUT.down);
  }
  this.setInputs(next);
  if((this.autoSkip||now<this.skipUntil)&&skipOpenDialogue(this.wram,g))this.skipUntil=now+1000;
  this.updateVisibility();
  if(!gameplay||dialogue||lost){this.animalSounds.reset();this.animalAudio.stop();}
  if(gameplay){
   let animalHit=false;
   const stars=word(this.wram,0x3b6);
   if(!dialogue&&!(lost&&stars<=0)&&!this.bosses.nativeHitPending)absorbHit(g,this.wram);
   if(this.keepBabyOnScreen)keepBabyVisible(g,this.wram);
   const lives=this.wram[0x379];if(lives<this.previousLives)this.adventure.resetRoom(this.room);this.previousLives=lives;
   const interactive=canModifyJump(g)&&!dialogue,onFoot=this.adventure.mount==='foot';
   if(onFoot&&interactive){
    const axis=rolling?this.controls.facing:this.controls.runAxis();
    const velocity=rolling?this.controls.facing*0x360:dkcRun(signed16(word(g,P.vx)),axis);
    if(canWriteVelocity(g,'x',velocity))writeWord(g,P.vx,velocity);
   }
   if(rolling&&interactive){
    writeWord(g,P.invincible,Math.max(word(g,P.invincible),4));
    if(yoshi&&canWriteVelocity(g,'x',this.controls.facing*0x360))writeWord(g,P.vx,this.controls.facing*0x360);
    const hits=applyRoll(g,this.controls.facing);animalHit=hits.length>0;this.kills+=hits.length;for(const hit of hits)this.particles.push({...hit,until:now+420});
   }
   if(jumpVelocity!==undefined&&canWriteVelocity(g,'y',jumpVelocity))writeWord(g,P.vy,jumpVelocity);
   // Keep the native takeoff (including stronger spring/enemy impulses).
   // Once airborne, holding Jump sustains ascent; release restores gravity.
   if(interactive&&squawks&&word(g,0xc0)!==0&&this.controls.jumpPressed(now)&&canWriteVelocity(g,'y',SQUAWKS_FLIGHT_VELOCITY))writeWord(g,P.vy,squawksFlightVelocity(signed16(word(g,P.vy)),signed16(word(g,P.y)-word(this.wram,P.cameraY))));
   const walls=breakTerrain(this.wram,g,this.controls.facing,rolling&&interactive&&!lost);this.walls+=walls.length;animalHit=animalHit||walls.length>0;
   for(const hit of walls)this.particles.push({...hit,until:now+500});
   const x=word(g,P.x),y=word(g,P.y),grounded=signed16(word(g,P.vy))===0&&interactive&&!lost;
   this.adventure.observe(this.room,x,y,grounded);
   const collected=this.adventure.breakNearby(this.room,x,y,rolling&&interactive&&!lost);
   if(collected.length){if(!this.animalAudio.play('crate-open'))writeWord(g,P.sound,0x11);this.animalAudio.play('animal-mount');this.animalSounds.reset();this.updateVisibility();this.changed();for(const item of collected)this.particles.push({x:item.x,y:item.y,until:now+500});}
   for(const effect of this.animalSounds.update({mount:this.adventure.mount,room:this.room,x,y,airborne:word(g,0xc0)!==0,vy:signed16(word(g,P.vy)),enabled:interactive&&!lost,rolling,flying:this.controls.jumpPressed(now),hit:animalHit},now))this.animalAudio.play(effect);
  }
  if(this.lastStage!==this.stageLabel){this.lastStage=this.stageLabel;this.onStatus(this.stageLabel);this.changed();}
  this.draw(now,rolling);
  if(now-this.lastSave>20000&&!this.saving)void this.save();
 }
 private draw(now:number,rolling:boolean):void{
  const c=this.overlay.getContext('2d')!;c.clearRect(0,0,256,this.videoHeight);if(this.wram[P.mode]!==P.gameplay||inGoal(this.gsu)||this.messageOpen)return;
  const brightness=this.wram[0x200];if(brightness&0x80)return;c.globalAlpha=(brightness&15)/15;
  const g=this.gsu,x=word(g,P.x),y=word(g,P.y),cx=word(this.wram,P.cameraX),cy=word(this.wram,P.cameraY);
  const sx=signed16(x-cx)+12,sy=signed16(y-cy)+32+this.topPadding;
  for(const item of this.adventure.nearby(this.room)){
   const px=signed16(item.x-cx)+12,py=signed16(item.y-cy)+32+this.topPadding;
   if(px>=-64&&px<=320&&py>=-64&&py<=this.videoHeight+64)this.atlas.draw(c,item.kind==='barrel'?'barrel':'crate-'+item.kind,'idle',px,py,now);
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
  drawStageBoss(c,this.atlas,this.bosses.state,word(this.wram,P.cameraX),word(this.wram,P.cameraY),this.topPadding);
  this.previousX=x;this.particles=this.particles.filter(p=>p.until>now);
  for(const p of this.particles){const age=1-(p.until-now)/500;c.fillStyle='#ffdd72';for(let i=0;i<6;i++){const a=i*Math.PI/3;c.fillRect(signed16(p.x-cx)+Math.cos(a)*age*28,signed16(p.y-cy)+this.topPadding+Math.sin(a)*age*22-15,3,3);}}
 }
 /** DEV fixture: real map16 wall in empty space ahead; no campaign fixture is shipped. */
 testWall():number{const g=this.gsu,x=(word(g,P.x)+48)&~15,y=word(g,P.y)&~15;let count=0;for(const dy of [0,16]){const address=tileAddress(g,x,y+dy);if(address!==undefined&&replaceTile(this.wram,g,x,y+dy,0x7b00,0xa022))count++;}return count;}
 diagnostics():Record<string,unknown>{return {nativeControls:{joy:word(this.wram,0x35),gsuJoy:word(this.gsu,0x70),cutscene:word(this.wram,0xb59),ending:word(this.wram,0xb5b),mosaic:word(this.wram,0xb57),hurt:word(this.wram,0xcce),scriptVx:word(this.gsu,0x17a),scriptVy:word(this.gsu,0x17c),frame:word(this.gsu,0xcc)},guardian:this.bosses.state,nativeMusic:{queued:this.wram[0x4d],previous:this.wram[0x4f]},bossAudio:{playing:this.bossAudio.playing,played:this.bossAudio.played,last:this.bossAudio.lastEffect},bossDamageRequests:this.bosses.damageEvents,eggsUnlimited:this.eggsUnlimited,animalAudio:{ready:this.animalAudio.ready,played:this.animalAudio.played,last:this.animalAudio.lastEffect},renderer:this.emulator.webgl2Enabled?'WebGL2':'legacy',mapMenu:{tab:this.wram[0x1119],state:this.wram[0x111a],tile:this.wram[0x1114],worldRaw:this.wram[0x218],stageRaw:this.wram[P.stage]},babyDetails:{mode:word(this.gsu,0x19d6),returning:word(this.wram,0xd9c),targetY:word(this.wram,0xdb4),x:word(this.gsu,0x10e2),y:word(this.gsu,0x1182),screenY:signed16(word(this.gsu,0x1182)-word(this.wram,P.cameraY)),vy:signed16(word(this.gsu,0x1222)),cameraY:word(this.wram,P.cameraY)},mode:this.wram[P.mode].toString(16),stage:this.stageLabel,room:this.room,x:word(this.gsu,P.x),y:word(this.gsu,P.y),form:word(this.gsu,0xae),babyLost:babyIsLost(this.gsu),rescueStars:word(this.wram,0x3b6),playerState:word(this.gsu,0xac),playerLock:word(this.gsu,0x1ae),spriteLock:word(this.gsu,0x1b0),goal:inGoal(this.gsu),contacts:word(this.gsu,0xfc),nativeVx:signed16(word(this.gsu,0xa8)),vx:signed16(word(this.gsu,P.vx)),vy:signed16(word(this.gsu,P.vy)),airborne:word(this.gsu,0xc0),flutter:word(this.gsu,0xd2),inputs:{axis:this.controls.runAxis(),jump:this.controls.jumpUntil,jumpHeld:this.controls.jumpHeld,roll:this.controls.rollUntil},kills:this.kills,walls:this.walls,terrain:{queue:word(this.wram,0x9ef),terminator:word(this.wram,0x9f1),left:word(this.gsu,0xa4),top:word(this.gsu,0xa6),ahead:[0,16,32].map(d=>{const x=(word(this.gsu,P.x)+48)&~15,y=(word(this.gsu,P.y)+d)&~15;return {x,y,tile:word(this.wram,tileAddress(this.gsu,x,y)??0).toString(16)};})},party:this.adventure.serialize(),message:this.wram[0xd11],messageScript:word(this.gsu,0x406e),videoHeight:this.videoHeight,overlaySize:[this.overlay.width,this.overlay.height],frame:this.emulator.gameManager.functions.getFrameNum(),paused:this.paused,audio:this.audio?.state??'unavailable',nativeDrawHidden:this.hidden,dynamicTiles:word(this.gsu,0x1ecc),eggs:this.eggCount,aiming:this.aiming,eggState:word(this.gsu,0xde),mouth:word(this.gsu,0x150),ammo:word(this.gsu,0x16a),tongueRelative:{x:signed16(word(this.gsu,0x152)),y:signed16(word(this.gsu,0x154))},sprites:Array.from({length:24},(_,i)=>({slot:i,state:word(this.gsu,0xf00+i*4),id:word(this.gsu,0x1360+i*4),x:word(this.gsu,0x10e2+i*4),y:word(this.gsu,0x1182+i*4)})).filter(s=>s.state===0x10)};}
}
