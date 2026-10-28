import { nativeAudioContexts, resumeNativeAudio } from './audio';
import { loadStartState } from './bootstrap';
import { readBeforeDeadline } from './startup';
import {breakTerrain,tileAddress,replaceTile} from './terrain';
import { Controls } from './controls';
import { type Emulator, INPUT, primeAudio, resolveMemory, resolveDrawing, setNativeDrawing, waitForNativeFrames } from './engine';
import { PROFILE as P, KONG_JUMP_HOLD_MS, SQUAWKS_FLIGHT_VELOCITY, squawksFlightVelocity, NativeJumpBoost, NativeFlutterInput, canModifyJump, canWriteVelocity, hideNativePlayer, absorbHit, keepBabyVisible, applyRoll, babyIsLost, dkcRun, inGoal, signed16, skipOpenDialogue, word, writeWord } from './profile';
import { storeFile } from './storage';
import { Adventure, type Character, type Mount } from './adventure';
import { SpriteAtlas } from './atlas';
import { configureOverlay } from './overlay';
import {campaignStageLabel,isWorldMap,needsLevelReturn,MapConfirmInput} from './menu';
import { type Campaign,readCampaign,writeCampaign } from './campaign';
export type { Character } from './adventure';
const sleep=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
const INITIAL='campaign-eu-map-v3-snes9x-2.0.2';
export class LiveGame {
 keepBabyOnScreen=true;
 wramBase=0;gsuBase=0;ready=false;paused=false;kills=0;walls=0;adventure=new Adventure();autoSkip=false;
 private drawSite=0;private animationKey='';private animationStart=0;private previousX=0;private topPadding=0;private hidden?:boolean;private previousBabyLost=false;private previousLives=0;
 private skipUntil=0;private lastSave=0;private saving?:Promise<void>;private queuedSave?:Campaign;private jumpSequence=0;private lastStage='';private wasFinishing=false;
 private mapConfirm=new MapConfirmInput();private jumpBoost=new NativeJumpBoost();private flutterInput=new NativeFlutterInput();
 private videoHeight=239;
 private particles:Array<{x:number;y:number;until:number}>=[];
 constructor(public emulator:Emulator,public controls:Controls,private overlay:HTMLCanvasElement,private atlas:SpriteAtlas,private onStatus:(message:string)=>void,private changed:()=>void=()=>{}){}
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
  await resumeNativeAudio(this.emulator.Module,()=>this.emulator.setVolume(this.paused?0:1));
 }
 async prepare():Promise<void>{
  const m=this.emulator.gameManager,start=performance.now();
  await this.unlockAudio().catch(()=>{});
  while(m.functions.getFrameNum()<5&&performance.now()-start<15000){if(m.functions.getFrameNum()<1)await this.unlockAudio().catch(()=>{});await sleep(30);}
  if(m.functions.getFrameNum()<1)throw new Error('The SNES core is not drawing. Try again.');
  m.toggleMainLoop(0);
  try{this.wramBase=await resolveMemory(m,0x7e1fe0,0x1fe0,0x20000);this.gsuBase=await resolveMemory(m,0x7007e0,0x7e0,0x8000);this.drawSite=await resolveDrawing(m);}finally{m.toggleMainLoop(1);}
  const fresh=import.meta.env.DEV&&new URLSearchParams(location.search).has('fresh');
  const campaign=fresh?undefined:await readBeforeDeadline(readCampaign().catch(e=>{console.warn('KONG_READ_ERROR',e);return undefined;}),4000);
  if(campaign){
   this.onStatus('Resuming your saved game…');m.toggleMainLoop(0);
   try{
    m.loadState(campaign.state);
    this.stop();m.toggleMainLoop(1);
    // RetroArch queues load_state: the core must run before WRAM reflects it.
    await waitForNativeFrames(m);m.toggleMainLoop(0);
    if(this.wram[P.mode]<=0x50){
     this.adventure=new Adventure(campaign.adventure);
     // Start the saved native scene only after the bridge and partners are ready.
     // A held touch/key from the previous session must not survive the restore.
     this.stop();this.jumpSequence=this.controls.jumpSequence;
     this.finishBoot();return;
    }
    throw new Error('Your saved game could not be restored. Reload the page to retry.');
   }finally{m.toggleMainLoop(1);}
  }
  this.onStatus('Opening the stage selection…');
  m.functions.toggleFastForward(0);
  // Use a verified bundled snapshot instead of driving title-screen menus.
  const initial=await loadStartState();m.loadState(initial);await waitForNativeFrames(m);
  if(this.wram[P.mode]!==0x26)throw new Error('The starting level could not be restored. Reload the page to retry.');
  void storeFile(INITIAL,initial).catch(()=>{});
  this.finishBoot();
 }

 private finishBoot():void{
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
 mount(mount:Mount):void{if(this.adventure.ride(mount)){this.updateVisibility();this.changed();}}
 stop():void{this.controls.stop();this.mapConfirm.reset();this.jumpBoost.reset();this.flutterInput.reset();this.setInputs(new Set());}
 setPaused(value:boolean):void{this.stop();this.paused=value;this.emulator.gameManager.toggleMainLoop(value?0:1);if(value){this.emulator.setVolume(0);void this.save();}else void this.unlockAudio();}
 /** Native fade-out and overworld initialization; keeps completed-level progress. */
 goToMap():void{
  this.stop();this.wram[P.mode]=0x23;writeWord(this.wram,0x200,0x010f);
 }
 skipDialogue():void{this.skipUntil=performance.now()+5000;}
 save():Promise<void>{
  if(!this.ready)return Promise.resolve();const m=this.emulator.gameManager;
  try{
   // Capture immediately, including pagehide while an older autosave is writing.
   // Queue only the latest snapshot, so a delayed write cannot lose that position.
   m.toggleMainLoop(0);
   try{this.queuedSave={state:new Uint8Array(m.getState()),adventure:structuredClone(this.adventure.serialize())};}
   finally{if(!this.paused)m.toggleMainLoop(1);}
  }catch(e){console.warn('KONG_SAVE_ERROR',e);return this.saving??Promise.resolve();}
  return this.saving??(this.saving=this.flushSaves());
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
  if(!this.ready||this.paused)return;
  const g=this.gsu;
  const goalHandoff=this.wram[P.mode]===P.gameplay&&inGoal(g);
  const finishing=goalHandoff||this.wram[P.mode]===P.victory;
  // A sticky direction/roll must not carry through the ceremony onto the map.
  // Clear once on entry so new confirmation presses still work afterwards.
  if(finishing&&!this.wasFinishing){this.stop();this.jumpSequence=this.controls.jumpSequence;}
  this.wasFinishing=finishing;
  if(goalHandoff){this.jumpBoost.reset();this.setInputs(new Set());this.updateVisibility();this.draw(now,false);return;}
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
  if(gameplay){
   const stars=word(this.wram,0x3b6);
   if(!dialogue&&!(lost&&stars<=0))absorbHit(g,this.wram);
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
    const hits=applyRoll(g,this.controls.facing);this.kills+=hits.length;for(const hit of hits)this.particles.push({...hit,until:now+420});
   }
   if(jumpVelocity!==undefined&&canWriteVelocity(g,'y',jumpVelocity))writeWord(g,P.vy,jumpVelocity);
   // Keep the native takeoff (including stronger spring/enemy impulses).
   // Once airborne, holding Jump sustains ascent; release restores gravity.
   if(interactive&&squawks&&word(g,0xc0)!==0&&this.controls.jumpPressed(now)&&canWriteVelocity(g,'y',SQUAWKS_FLIGHT_VELOCITY))writeWord(g,P.vy,squawksFlightVelocity(signed16(word(g,P.vy)),signed16(word(g,P.y)-word(this.wram,P.cameraY))));
   const walls=breakTerrain(this.wram,g,this.controls.facing,rolling&&interactive&&!lost);this.walls+=walls.length;
   for(const hit of walls)this.particles.push({...hit,until:now+500});
   const x=word(g,P.x),y=word(g,P.y),grounded=signed16(word(g,P.vy))===0&&interactive&&!lost;
   this.adventure.observe(this.room,x,y,grounded);
   const collected=this.adventure.breakNearby(this.room,x,y,rolling&&interactive&&!lost);
   if(collected.length){writeWord(g,P.sound,0x11);this.updateVisibility();this.changed();for(const item of collected)this.particles.push({x:item.x,y:item.y,until:now+500});}
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
  this.previousX=x;this.particles=this.particles.filter(p=>p.until>now);
  for(const p of this.particles){const age=1-(p.until-now)/500;c.fillStyle='#ffdd72';for(let i=0;i<6;i++){const a=i*Math.PI/3;c.fillRect(signed16(p.x-cx)+Math.cos(a)*age*28,signed16(p.y-cy)+this.topPadding+Math.sin(a)*age*22-15,3,3);}}
 }
 /** DEV fixture: real map16 wall in empty space ahead; no campaign fixture is shipped. */
 testWall():number{const g=this.gsu,x=(word(g,P.x)+48)&~15,y=word(g,P.y)&~15;let count=0;for(const dy of [0,16]){const address=tileAddress(g,x,y+dy);if(address!==undefined&&replaceTile(this.wram,g,x,y+dy,0x7b00,0xa022))count++;}return count;}
 diagnostics():Record<string,unknown>{return {mapMenu:{tab:this.wram[0x1119],state:this.wram[0x111a],tile:this.wram[0x1114],worldRaw:this.wram[0x218],stageRaw:this.wram[P.stage]},babyDetails:{mode:word(this.gsu,0x19d6),returning:word(this.wram,0xd9c),targetY:word(this.wram,0xdb4),x:word(this.gsu,0x10e2),y:word(this.gsu,0x1182),screenY:signed16(word(this.gsu,0x1182)-word(this.wram,P.cameraY)),vy:signed16(word(this.gsu,0x1222)),cameraY:word(this.wram,P.cameraY)},mode:this.wram[P.mode].toString(16),stage:this.stageLabel,room:this.room,x:word(this.gsu,P.x),y:word(this.gsu,P.y),form:word(this.gsu,0xae),babyLost:babyIsLost(this.gsu),rescueStars:word(this.wram,0x3b6),playerState:word(this.gsu,0xac),playerLock:word(this.gsu,0x1ae),spriteLock:word(this.gsu,0x1b0),goal:inGoal(this.gsu),contacts:word(this.gsu,0xfc),nativeVx:signed16(word(this.gsu,0xa8)),vx:signed16(word(this.gsu,P.vx)),vy:signed16(word(this.gsu,P.vy)),airborne:word(this.gsu,0xc0),flutter:word(this.gsu,0xd2),inputs:{axis:this.controls.runAxis(),jump:this.controls.jumpUntil,jumpHeld:this.controls.jumpHeld,roll:this.controls.rollUntil},kills:this.kills,walls:this.walls,terrain:{queue:word(this.wram,0x9ef),terminator:word(this.wram,0x9f1),left:word(this.gsu,0xa4),top:word(this.gsu,0xa6),ahead:[0,16,32].map(d=>{const x=(word(this.gsu,P.x)+48)&~15,y=(word(this.gsu,P.y)+d)&~15;return {x,y,tile:word(this.wram,tileAddress(this.gsu,x,y)??0).toString(16)};})},party:this.adventure.serialize(),message:this.wram[0xd11],messageScript:word(this.gsu,0x406e),videoHeight:this.videoHeight,overlaySize:[this.overlay.width,this.overlay.height],frame:this.emulator.gameManager.functions.getFrameNum(),paused:this.paused,audio:this.audio?.state??'unavailable',nativeDrawHidden:this.hidden,dynamicTiles:word(this.gsu,0x1ecc),eggs:this.eggCount,aiming:this.aiming,eggState:word(this.gsu,0xde),mouth:word(this.gsu,0x150),ammo:word(this.gsu,0x16a),tongueRelative:{x:signed16(word(this.gsu,0x152)),y:signed16(word(this.gsu,0x154))},sprites:Array.from({length:24},(_,i)=>({slot:i,state:word(this.gsu,0xf00+i*4),id:word(this.gsu,0x1360+i*4),x:word(this.gsu,0x10e2+i*4),y:word(this.gsu,0x1182+i*4)})).filter(s=>s.state===0x10)};}
}
