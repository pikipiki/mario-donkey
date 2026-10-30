import{canSaveDkcScene,stableDkcMap,restoreDkcState,confirmDkcMenu}from'./dkc-runtime';
import{createDkcRecoveryState}from'./dkc-recovery';
import{soundEnabled}from'./sound-preference';
import{nativeArenaBoss,type NativeArenaBoss,type ArenaTrip}from'./native-arena';
import{DkcDefeat}from'./dkc-defeat';
import{bootLifeCheat,trackLifeSnapshot,confirmLifeSnapshot,applyDkcCheats}from'./cheats';
import{DkcFlight}from'./dkc-flight';
import{writeWord}from'./profile';
import{DkcWater,dkcSwimming}from'./dkc-water';
import{DkcBarrelControl,heldDkcBarrel}from'./dkc-barrel';
import{nativeDkcMount,dkcSaddle}from'./dkc-mount';
import{DkcFlutter}from'./dkc-flutter';
import{DkcIdleVoice}from'./dkc-idle-voice';
import{DkcCollectibleHooks,dkcCollectibleTargets,hitDkcCollectible}from'./dkc-collectibles';
import{YoshiCombatAudio}from'./yoshi-combat-audio';
import{DkcTeamDamage,initializeDkcTeam,dkcAvailableHeroes}from'./dkc-team-damage';
import {DkcBossContact}from'./dkc-boss-contact';
import {DkcNativeBossHitHooks,DkcDrumEncounter,dkcNativeBossTargets,hitDkcNativeBoss,type DkcNativeBossAttack}from'./dkc-native-boss-hit';
import type{DkcTarget}from'./dkc-combat';
import {drawTagContact}from'./team-tag';
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
import{DKC,readDkcScene,dkcEnemies,killDkcEnemy}from'./dkc-profile';
export class DkcGame extends LiveGame{
 private dkExitTrace:Record<string,unknown>[]=[];private dkExitTraceKey="";private dkWater=new DkcWater();private dkFlutter=new DkcFlutter();private dkFlight=new DkcFlight();private dkIdleVoice?:DkcIdleVoice;private dkCollectibles?:DkcCollectibleHooks;private yoshiCombatAudio=new YoshiCombatAudio();private teamDamage=new DkcTeamDamage();private teamInitialized=false;
 private dkRecovering=false;private dkArenaReceipt?:string;private dkDefeat=new DkcDefeat();private dkNativeHits?:DkcNativeBossHitHooks;private dkDrum=new DkcDrumEncounter();private dkBossContact=new DkcBossContact();
 private dkBarrel=new DkcBarrelControl();private combat=new DkcCombat();private dkGuardian=new DkcGuardian();private dkBossHooks?:DkcBossRomHooks;private dkBossFinish?:DkcBossFinishHooks;private dkMusicHeld=false;private dkLastSave=0;private dkSaving?:Promise<void>;private dkCapturing=false;private dkMap=false;private dkHeight=224;private dkFrame=0;private dkAnimation='';private dkAnimationAt=0;private dkStage='';private dkRoom?:number;
 constructor(emulator:Emulator,controls:Controls,private dkCanvas:HTMLCanvasElement,private dkAtlas:SpriteAtlas,private dkStatus:(message:string)=>void,private dkChanged:()=>void=()=>{}){super(emulator,controls,dkCanvas,dkAtlas,dkStatus,dkChanged);}
 override async unlockAudio():Promise<void>{await super.unlockAudio();if(soundEnabled())void this.yoshiCombatAudio.prepare(this.audio);}
 override get nativeArenaBoss():NativeArenaBoss|undefined{const s=this.dkGuardian.state;return !this.nativeArenaMode&&!this.dkDefeat.active&&dkcAvailableHeroes(this.wram)>0&&word(this.wram,DKC.state+readDkcScene(this.wram).playerSlot)<=8&&s&&(s.phase==='intro'||s.phase==='fight')&&nativeArenaBoss(s.id)?s.id:undefined;}
 override async finishNativeArena(trip:ArenaTrip):Promise<void>{
  const s=this.dkGuardian.state;if(trip.phase==='consumed'||this.dkArenaReceipt===trip.id)return;
  if(!s||s.level!==trip.sourceLevel||s.id!==trip.boss||readDkcScene(this.wram).level!==trip.sourceLevel)throw Error('The saved DKC battle does not match this arena. Your adventure is safe.');
  if(!['won','lost','abandoned','relocated'].includes(trip.phase))throw Error('The battle result has not been confirmed yet.');
  this.controls.stop();this.adventure.setTeam(trip.party.team?.[0]??trip.party.active,trip.party.team?.[1]??this.adventure.partner);this.adventure.select(trip.party.active);writeWord(this.wram,0x575,trip.lives);
  if(trip.phase==='won'){s.hp=0;s.phase='released';s.phaseTime=0;this.bossAudio.stop();this.dkBossHooks?.sync(false);this.dkBossFinish?.sync(false);this.dkMusicHeld=s.music!==undefined;this.dkStatus('Boss defeated · Take the stage exit');}
  else if(trip.phase==='lost'||trip.phase==='abandoned')await this.returnToMap(false);else if(trip.phase!=='relocated')throw Error('The battle result has not been confirmed yet.');
  this.dkArenaReceipt=trip.id;await this.saveForWorldSwitch();this.dkChanged();
 }
 override get world():'yoshi'|'dkc'{return 'dkc';}
 override get isMap():boolean{return this.ready&&stableDkcMap(this.wram);}
 override get canRepairDisplay():boolean{return this.ready;}
 override get eggsUnlimited():boolean{return this.dkGuardian.active||this.nativeBossPresent();}
 private nativeBossPresent():boolean{const w=this.wram,s=readDkcScene(w);if(!s.playing||![0xe0,0xe1,0xe2,0xe3,0xe4,0xe5,0x68].includes(s.level))return false;for(let slot=6;slot<0x34;slot+=2)if(word(w,0xd45+slot)===0x70&&[5,6,7,8,9,11].includes(word(w,0x1029+slot)))return true;return false;}
 private hitNativeBoss(target:DkcTarget,kind:DkcNativeBossAttack):boolean{if(this.dkDrum.state?.slot===target.slot){const ok=this.dkDrum.hit(this.wram,target,kind);if(ok)this.animalAudio.play('animal-hit');return ok;}return hitDkcNativeBoss(this.wram,target,kind);}
 /** Private acceptance fixture: exercises the actual clock/exit hooks, not ROM clear flags. */
 testGuardianFinalHit():boolean{if(!import.meta.env.DEV||!this.dkGuardian.state||this.dkGuardian.state.phase!=='fight')return false;this.dkGuardian.state.hp=1;this.dkGuardian.state.hitUntil=0;return this.dkGuardian.hit();}
 /** Isolated regression fixture: native victory request with a living guardian. */
 testPrematureVictoryRequest():boolean{const s=this.dkGuardian.state;if(!import.meta.env.DEV||!s||s.phase!=='fight'||!s.exitKind||word(this.wram,DKC.id+s.slot)!==0x74)return false;writeWord(this.wram,DKC.state+s.slot,1);writeWord(this.wram,0x1e2b,1);return true;}
 /** Fire through the ordinary web collision path at a native bonus bitmap. */
 testBonusEgg():boolean{if(!import.meta.env.DEV||!this.ready)return false;const s=readDkcScene(this.wram),target=dkcCollectibleTargets(this.wram).filter(t=>t.banana).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0];if(!target)return false;this.combat.eggs=6;this.combat.shots.push({x:target.x-20,y:target.y-4,vx:300,vy:0,age:0});return true;}
 private restoreBarrelInput():void{this.dkBarrel.reset();const held=this.dkBarrel.update(this.wram,this.controls.rollSequence,false);this.emulator.gameManager.simulateInput(0,INPUT.y,held?1:0);}
 get swimming():boolean{return this.ready&&dkcSwimming(this.wram);}
 get aquaticMount():Mount{return nativeDkcMount(this.wram)?.kind??this.adventure.mount;}
 get carryingBarrel():boolean{return this.ready&&Boolean(heldDkcBarrel(this.wram));}
 override get eggCount():number{return this.combat.eggs;}
 override get messageOpen():boolean{return false;}
 override get aiming():boolean{return Boolean(this.combat.aiming);}
 override get stageLabel():string{const s=readDkcScene(this.wram);return s.isMap?'Donkey Goonk · World map':s.playing?`Donkey Goonk · ${dkcStageName(s.level)}`:'Donkey Kong Country · Select your game';}
 get nativeMenu():boolean{const s=readDkcScene(this.wram);return this.ready&&!s.isMap&&!s.playing;}
 override get room():string{return `dkc:${readDkcScene(this.wram).level}`;}
 override set character(value:Character){if(this.adventure.select(value))this.dkChanged();}
 override get character():Character{return this.adventure.active;}
 override mount(value:Mount):void{if(this.adventure.ride(value))this.dkChanged();}
 override async prepare():Promise<void>{
  const m=this.emulator.gameManager;await this.unlockAudio().catch(()=>{});
  await waitForNativeFrames(m);this.wramBase=await resolveMemory(m,0x7e1fe0,0x1fe0,0x20000,false);
  this.dkBossHooks=new DkcBossRomHooks(this.emulator.Module.HEAPU8);this.dkBossHooks.sync(true);this.dkBossFinish=new DkcBossFinishHooks(this.emulator.Module.HEAPU8);this.dkNativeHits=new DkcNativeBossHitHooks(this.emulator.Module.HEAPU8);this.dkCollectibles=new DkcCollectibleHooks(this.emulator.Module.HEAPU8);this.dkIdleVoice=new DkcIdleVoice(this.emulator.Module.HEAPU8);m.toggleMainLoop(1);
  const fresh=import.meta.env.DEV&&new URLSearchParams(location.search).has('fresh');
  const saved=fresh?undefined:await readBeforeDeadline(loadFile(DKC_SAVE_KEY),4000);
  if(saved){const data=decodeDkcSave(saved);this.dkArenaReceipt=data.nativeArenaReceipt;this.teamInitialized=data.teamInitialized===true;this.dkDrum.restore(data.drum);this.dkNativeHits.requestDrumDefeat(this.dkDrum.state?.defeatRequested?this.dkDrum.state.slot:null);this.dkGuardian.restore(data.guardian);await restoreDkcState(m,data.state,()=>{this.dkBossFinish?.sync(data.guardian?.phase!=='released',Boolean(data.guardian&&data.guardian.phase!=='released'));this.restoreBarrelInput();});this.adventure=new Adventure(data.adventure);this.combat.restore(data.combat);}
  else{
   const r=await fetch(`${import.meta.env.BASE_URL}bootstrap/dkc-map-snes9x-2.0.2.state`);
   if(r.ok&&!r.headers.get('content-type')?.includes('text/html')){const state=new Uint8Array(await r.arrayBuffer());validateDkcNativeState(state);await restoreDkcState(m,state,()=>this.restoreBarrelInput());}
   else throw new Error('The Donkey Goonk map could not be loaded. Reload to try again. Your saves are kept.');
  }
  const party=decodeWorldParty(await readBeforeDeadline(loadFile(WORLD_PARTY_KEY),3000).catch(()=>undefined));
  if(party){this.adventure=new Adventure(party);await storeFile(WORLD_PARTY_KEY,new Uint8Array());}
  bootLifeCheat('dkc',this.wram,Boolean(saved));applyDkcCheats(this.wram);this.teamInitialized=initializeDkcTeam(this.wram,this.teamInitialized);
  const height=m.functions.getVideoDimensions('height');if(height>=224&&height<=256)this.dkHeight=height;
  const savedGuardian=this.dkGuardian.state;this.dkMusicHeld=Boolean(savedGuardian?.phase==='released'&&savedGuardian.music!==undefined&&word(this.wram,0x51d)===0);
  configureOverlay(this.dkCanvas,this.dkHeight);this.dkRoom=readDkcScene(this.wram).level;this.ready=true;this.dkLastSave=performance.now();this.stop();m.toggleMainLoop(1);this.dkChanged();this.dkStatus(this.stageLabel);
 }
 override stop():void{
  this.dkWater.reset();this.dkFlutter.reset();this.dkFlight.reset();this.teamTag.cancel();this.bossAudio.pause();this.dkGuardian.pause();this.animalAudio.stop();this.yoshiCombatAudio.stop();this.controls.stop();this.combat.resetClock();
  const keepBarrel=this.ready&&this.dkBarrel.update(this.wram,this.controls.rollSequence,false);
  for(let b=0;b<12;b++)this.emulator.gameManager.simulateInput(0,b,b===INPUT.y&&keepBarrel?1:0);
 }
 override setPaused(value:boolean):void{this.stop();this.paused=value;if(!this.dkCapturing)this.emulator.gameManager.toggleMainLoop(value?0:1);this.applySoundPreference();if(value)void this.save().catch(e=>this.dkStatus((e as Error).message));else void this.unlockAudio();}
 override requestTeamSwap():boolean{if(!this.ready||this.paused||this.teamTag.swapping)return false;const s=readDkcScene(this.wram);if(s.isMap){this.adventure.swapTeam();this.dkChanged();return true;}if(!s.playing||!this.teamDamage.canTag(this.wram)||!s.grounded||word(this.wram,0x1029+s.playerSlot)>0xb||word(this.wram,0x1595+s.playerSlot)!==0)return false;this.controls.stop();const keepBarrel=this.dkBarrel.update(this.wram,this.controls.rollSequence,false);for(let b=0;b<12;b++)this.emulator.gameManager.simulateInput(0,b,b===INPUT.y&&keepBarrel?1:0);return this.teamTag.begin(this.adventure,{...s,facing:this.controls.facing});}
 override skipDialogue():void{if(!readDkcScene(this.wram).playing)this.controls.pulse(INPUT.start,performance.now());}
 override goToMap():void{void this.returnToMap();}
 private async returnToMap(saveCurrent=true):Promise<void>{
  if(this.dkRecovering)return;
  const bytes=await loadFile(DKC_MAP_KEY);if(!bytes){this.dkStatus('Return through the native stage exit to reach the DKC map.');return;}
  const saved=decodeDkcSave(bytes),m=this.emulator.gameManager,lives=word(this.wram,0x575);if(saveCurrent)await this.save();this.dkRecovering=true;try{this.stop();await restoreDkcState(m,saved.state,()=>this.restoreBarrelInput());writeWord(this.wram,0x575,lives);this.refreshLifeCheat();this.paused=false;this.combat.shots=[];this.dkGuardian.clear();this.dkDrum.reset();this.dkNativeHits?.requestDrumDefeat(null);this.dkBossContact.reset();this.dkBossHooks?.sync(false);this.dkBossFinish?.sync(false);this.bossAudio.stop();this.dkMusicHeld=false;this.dkStatus('Donkey Goonk · World map');}finally{this.dkRecovering=false;if(!this.paused)m.toggleMainLoop(1);}
 }
 override async repairDisplay():Promise<void>{
  if(this.dkRecovering)return;this.dkRecovering=true;const m=this.emulator.gameManager;let old:Uint8Array|undefined;
  try{
   const response=await fetch(`${import.meta.env.BASE_URL}bootstrap/dkc-map-snes9x-2.0.2.state`);if(!response.ok)throw Error('The clean map could not be loaded. Your save is kept.');const clean=new Uint8Array(await response.arrayBuffer());validateDkcNativeState(clean);
   await waitForNativePause(m);this.stop();old=new Uint8Array(m.getState());
   const backup=encodeDkcSave({state:old,adventure:this.adventure.serialize(),combat:this.combat.serialize(),teamInitialized:this.teamInitialized,guardian:this.dkGuardian.state,drum:this.dkDrum.serialize()??undefined});
   await storeFile(DKC_SAVE_KEY+'-before-display-repair',backup);
   await restoreDkcState(m,createDkcRecoveryState(clean,old),()=>this.restoreBarrelInput());
   if(!stableDkcMap(this.wram))throw Error('The rebuilt map did not settle. Your original save is kept.');
   this.combat.shots=[];this.combat.resetClock();this.dkGuardian.clear();this.dkDrum.reset();this.dkNativeHits?.requestDrumDefeat(null);this.dkBossContact.reset();this.dkBossHooks?.sync(false);this.dkBossFinish?.sync(false);this.bossAudio.stop();this.dkMusicHeld=false;this.paused=false;this.applySoundPreference();
  }catch(error){if(old)await restoreDkcState(m,old,()=>this.restoreBarrelInput());throw error;}
  finally{this.dkRecovering=false;if(!this.paused)m.toggleMainLoop(1);}
  await this.saveForWorldSwitch();this.dkChanged();this.dkStatus('Map rebuilt · Completed stages and your duo are kept');
 }
 override async saveForWorldSwitch():Promise<void>{if(!this.ready)throw new Error('The game is not ready.');if(this.dkSaving)await this.dkSaving;await this.save();}
 override save():Promise<void>{
  if(!this.ready||this.dkRecovering)return Promise.resolve();
  if(!canSaveDkcScene(this.wram))return Promise.resolve();
  if(this.dkSaving)return this.dkSaving;
  this.dkSaving=(async()=>{
   const m=this.emulator.gameManager;this.dkCapturing=true;let bytes:Uint8Array,state:Uint8Array,map:boolean;
   try{
    await waitForNativePause(m);
    if(!canSaveDkcScene(this.wram))return;
    state=new Uint8Array(m.getState());trackLifeSnapshot(state,'dkc',this.wram);map=this.isMap;
    bytes=encodeDkcSave({state,adventure:this.adventure.serialize(),combat:this.combat.serialize(),nativeArenaReceipt:this.dkArenaReceipt,teamInitialized:this.teamInitialized,guardian:this.dkGuardian.state,drum:this.dkDrum.serialize()??undefined});
   }finally{this.dkCapturing=false;if(!this.paused)m.toggleMainLoop(1);}
   // IndexedDB can stall on mobile. Only the settled in-memory capture needs
   // a paused core: disk latency must never hold the controls or native loop.
   await storeFile(DKC_SAVE_KEY,bytes);if(map)await storeFile(DKC_MAP_KEY,bytes);confirmLifeSnapshot(state);
  })().finally(()=>{this.dkLastSave=performance.now();this.dkSaving=undefined;});return this.dkSaving;
 }
 override tick(now:number):void{
  if(!this.ready||this.paused||this.dkCapturing||this.dkRecovering)return;
  const m=this.emulator.gameManager,w=this.wram,s=readDkcScene(w);applyDkcCheats(w);this.dkCollectibles?.sync(w);this.dkIdleVoice?.sync(s.playing&&this.character!=='dk');
  this.teamInitialized=initializeDkcTeam(w,this.teamInitialized);
  if(this.dkRoom!==s.level){this.dkRoom=s.level;this.dkWater.reset();this.dkFlutter.reset();this.dkFlight.reset();this.dkBossContact.reset();this.combat.shots=[];this.combat.resetClock();}
  if(this.teamDamage.update(w,this.adventure)){this.teamTag.reset();this.controls.stop();this.dkChanged();}
  if(this.teamDamage.transitioning){this.teamTag.reset();this.controls.stop();}
  if(s.playing&&word(w,0x1029+s.playerSlot)<=0xb&&word(w,0x1595+s.playerSlot)===0){if(this.teamTag.update(m.functions.getFrameNum(),String(s.level),{...s,facing:this.controls.facing},this.adventure)){this.animalAudio.play('animal-hit');this.dkChanged();}}else this.teamTag.reset();
  const defeat=this.dkDefeat.update(w,this.dkGuardian.active,m.functions.getFrameNum());
  if(this.dkDefeat.active&&s.playing){this.controls.stop();this.teamTag.reset();this.dkGuardian.pause();}
  const barrelY=this.dkBarrel.update(w,this.controls.rollSequence,now<this.controls.rollUntil||now<(this.controls.extra.get(INPUT.y)??0));
  const water=dkcSwimming(w),rolling=now<this.controls.rollUntil&&!this.dkBarrel.handling&&!water;
  const drum=this.dkDrum.sync(w,Math.min(4,Math.max(0,m.functions.getFrameNum()-this.dkFrame)));this.dkNativeHits?.requestDrumDefeat(drum?.defeatRequested?drum.slot:null);
  this.dkBossContact.update(w,rolling,[...dkcNativeBossTargets(w),...this.dkDrum.targets(w)],(target,kind)=>this.hitNativeBoss(target,kind));
  const interruptedGuardian=s.isMap&&this.dkGuardian.state&&this.dkGuardian.state.phase!=='released'?this.dkGuardian.state.id:undefined;
  const exitSample={frame:m.functions.getFrameNum(),level:s.level,playing:s.playing,map:s.isMap,command:word(w,0x1e2b),states:[word(w,DKC.state+2),word(w,DKC.state+4)],animations:[word(w,0x16ad),word(w,0x16af)],hits:[word(w,DKC.hit+2),word(w,DKC.hit+4)],banana:pendingBossVictory(w),bananaStates:Array.from({length:23},(_,i)=>6+i*2).filter(slot=>word(w,DKC.id+slot)===0x74).map(slot=>({slot,state:word(w,DKC.state+slot)})),guardian:this.dkGuardian.state?{hp:this.dkGuardian.state.hp,phase:this.dkGuardian.state.phase}:undefined};
  const exitKey=JSON.stringify({...exitSample,frame:0});if(exitKey!==this.dkExitTraceKey){this.dkExitTraceKey=exitKey;this.dkExitTrace.push(exitSample);if(this.dkExitTrace.length>80)this.dkExitTrace.shift();}
  const bossResult=this.nativeArenaMode||this.dkDefeat.active?{}:this.dkGuardian.update(w,m.functions.getFrameNum(),slot=>this.dkBossHooks?.isMapExit(w,slot)??false,pendingBossVictory(w),{rolling,visualReady:!this.dkGuardian.state||this.dkAtlas.guardianReady(this.dkGuardian.state.id)});
  this.dkBossHooks?.sync(!this.nativeArenaMode&&this.dkGuardian.state?.phase!=='released');
  this.dkBossFinish?.sync(!this.nativeArenaMode&&this.dkGuardian.state?.phase!=='released',Boolean(this.dkGuardian.state&&this.dkGuardian.state.phase!=='released'));
  const guardian=this.dkGuardian.state;if(guardian&&guardian.phase!=='released')void this.dkAtlas.prepareGuardian(guardian.id).catch(()=>this.dkStatus('Loading original boss animation…'));
  const musicPlaying=this.bossAudio.sync(this.audio,s.playing&&guardian&&!this.dkDefeat.active?{world:'yoshi',id:guardian.id,phase:guardian.phase}:undefined);
  // Native music dispatch is performed by the guarded exit routine.
  if(this.dkDefeat.active||defeat.returned){this.dkBossHooks?.music(this.dkDefeat.musicRequest(w),0x11);this.dkMusicHeld=false;}else if(musicPlaying&&guardian){
   guardian.music??=word(w,0x523);this.dkBossHooks?.music('stop',guardian.music);this.dkMusicHeld=true;
  }else if(this.dkMusicHeld){
   if(s.playing&&guardian?.music!==undefined){this.dkBossHooks?.music('resume',guardian.music);if(word(w,0x51d)!==0)this.dkMusicHeld=false;}
   else{this.dkBossHooks?.music('none');this.dkMusicHeld=false;}
  }else this.dkBossHooks?.music('none');
  if(bossResult.effect)this.bossAudio.effect(bossResult.effect,guardian?.id);
  if(bossResult.notice)this.dkStatus(bossResult.notice);
  if(this.dkDefeat.active&&s.playing){
   // Let the original death/fade/map script run without mod attacks, mount
   // abilities or stale held inputs. Do not pause, reload or award a stage.
   this.controls.stop();for(let b=0;b<12;b++)m.simulateInput(0,b,0);
   this.combat.shots=[];this.combat.resetClock();this.dkFlight.reset();this.dkFlutter.reset();this.dkWater.reset();
   this.dkFrame=m.functions.getFrameNum();this.dkStatus('Defeated · Returning to the map…');this.drawDkc(now,s);return;
  }
  const map=s.isMap;if(map&&!this.dkMap){this.combat.shots=[];this.combat.resetClock();void this.save();this.dkStatus(this.stageLabel);}this.dkMap=map;
  const next=new Set<number>();const axis=this.controls.runAxis(),move=this.dkBarrel.handling||water?(axis<0?-1:axis>0?1:0):this.controls.movement(now),vertical=this.controls.verticalAxis(now);
  const aquatic=this.dkWater.update(w,now,this.adventure.mount,this.controls.jumpPressed(now),vertical,this.controls.facing,!this.teamTag.swapping&&!this.dkBarrel.handling&&now<this.controls.rollUntil);
  this.kills+=aquatic.killed;if(aquatic.stabbed)this.animalAudio.play('enguarde-attack');
  const enguarde=water&&this.aquaticMount==='enguarde',charging=enguarde&&now<this.dkWater.chargeUntil;
  if(enguarde&&this.controls.jumpPressed(now)&&vertical<=0)next.add(INPUT.up);
  if(charging)next.add(this.dkWater.chargeDirection<0?INPUT.left:INPUT.right);else if(move)next.add(move<0?INPUT.left:INPUT.right);if(vertical&&!(vertical>0&&this.dkBarrel.releasing))next.add(vertical<0?INPUT.up:INPUT.down);
  if(this.controls.jumpPressed(now)&&!enguarde)next.add(INPUT.b);if(barrelY&&!enguarde)next.add(INPUT.y);
  confirmDkcMenu(w,this.controls.jumpPressed(now)||this.controls.eggPressed(now)||now<this.controls.tongueUntil,next);
  for(const[b,until]of this.controls.extra)if(now<until&&(b!==INPUT.y||!s.playing))next.add(b);
  if(enguarde){next.delete(INPUT.b);next.delete(INPUT.y);}
  if(this.teamTag.swapping){next.clear();if(barrelY&&this.carryingBarrel)next.add(INPUT.y);}
  for(let b=0;b<12;b++)m.simulateInput(0,b,next.has(b)?1:0);
  this.dkFrame=m.functions.getFrameNum();
  this.dkFlight.update(w,this.controls.jumpPressed(now),this.adventure.mount==='squawks'&&!this.teamTag.swapping&&!this.teamDamage.transitioning);
  if(this.dkFlutter.update(w,this.dkFrame,this.controls.jumpSequence,this.controls.jumpHeld,this.adventure.mount==='yoshi'&&!this.teamTag.swapping&&!this.teamDamage.transitioning&&!rolling))this.yoshiCombatAudio.play('flutter');
  if(s.playing){
   const result=this.combat.update(this.dkFrame,now,{x:s.x,y:s.y,facing:this.controls.facing},[...dkcEnemies(w),...dkcNativeBossTargets(w),...this.dkDrum.targets(w),...dkcCollectibleTargets(w)],!this.teamTag.swapping&&this.controls.eggPressed(now),!this.teamTag.swapping&&now<this.controls.tongueUntil,this.controls.tongueUpPressed(now),target=>{if(target.slot===-1){const accepted=this.dkGuardian.hit();if(accepted)this.bossAudio.effect('hit',this.dkGuardian.state?.id);return accepted;}if(target.collectible)return hitDkcCollectible(w,target);if(target.nativeBoss)return this.hitNativeBoss(target,'egg');return killDkcEnemy(w,target.slot);},this.dkGuardian.target(),{unlimited:this.eggsUnlimited,down:vertical>0,direction:this.controls.tongueDirection(now)});
   if(result.aimed)this.yoshiCombatAudio.play('aim');if(result.tongued)this.yoshiCombatAudio.play('tongue');if(result.ate)this.yoshiCombatAudio.play('swallow');if(result.madeEgg)this.yoshiCombatAudio.play('make');if(result.threw)this.yoshiCombatAudio.play('throw');if(result.impacted)this.yoshiCombatAudio.play('impact');
   this.kills+=result.killed+Number(result.ate);if(result.ate){this.dkStatus('Enemy in mouth · Press Down to make an egg');this.dkChanged();}else if(result.madeEgg){this.dkStatus('Egg ready · Aim, then throw');this.dkChanged();}else if(result.threw)this.dkStatus('Egg thrown');
  }else{this.combat.shots=[];this.combat.resetClock();}
  if(this.dkStage!==this.stageLabel){this.dkStage=this.stageLabel;this.dkChanged();this.dkStatus(this.dkStage);}
  if(this.dkDefeat.active)this.dkStatus('Game Over · Tap Start / Confirm to continue');else if(defeat.returned)this.dkStatus('Defeated · Choose a stage to try again');else if(interruptedGuardian)this.dkStatus('Combat interrupted · Boss still alive · Stage not completed');
  this.drawDkc(now,s);
  if(now-this.dkLastSave>20000&&!this.dkSaving)void this.save().catch(e=>this.dkStatus((e as Error).message));
 }
 private drawDkc(now:number,s:ReturnType<typeof readDkcScene>):void{
  const c=this.dkCanvas.getContext('2d')!;c.clearRect(0,0,256,this.dkHeight);const brightness=this.wram[0x51a];if(!s.playing||(brightness&0x80))return;c.globalAlpha=(brightness&15)/15*this.dkDefeat.overlayOpacity(this.emulator.gameManager?.functions?.getFrameNum?.()??this.dkFrame);if(c.globalAlpha<=0)return;
  const x=s.x-s.cameraX,y=s.y-s.cameraY,pad=(this.dkHeight-224)>>1;
  if(!this.dkDefeat.active)for(const p of this.combat.eggTrail)this.dkAtlas.drawEgg(c,p.x-s.cameraX,p.y-s.cameraY+pad,now);
  const moving=Math.abs(this.controls.runAxis())>.1,rolling=now<this.controls.rollUntil&&!this.dkBarrel.handling&&!(dkcSwimming(this.wram)&&this.aquaticMount==='enguarde');
  const animation=this.dkDefeat.active?'jump':this.teamTag.swapping?'jump':rolling?'roll':this.dkFlight.active?'jump':this.dkFlutter.active?'flutter':dkcSwimming(this.wram)?(moving||Math.abs(s.vy)>128?'walk':'idle'):!s.grounded?'jump':moving?'walk':'idle';if(this.dkAnimation!==animation){this.dkAnimation=animation;this.dkAnimationAt=now;}
  const heroAlpha=c.globalAlpha,g=this.dkGuardian.state;if(g&&g.elapsed<(g.heroHitUntil??0)&&Math.floor(now/100)%2)c.globalAlpha*=.35;
  const poses=this.teamTag.poses({...s,facing:this.controls.facing},this.adventure),back=this.teamDamage.nativePartner(this.wram,this.adventure)??poses.partner;
  // The follower owns no attack: rolling belongs to the active hero only.
  // Preserve native hurt/flee poses; a healthy companion follows on foot.
  const backAnimation='animation'in back&&typeof back.animation==='string'?back.animation:this.teamTag.swapping?'jump':!s.grounded?'jump':moving||rolling?'walk':'idle';
  if(this.teamDamage.hasPartner(this.wram)){if(back.character==='mario')this.dkAtlas.drawMarioYoshi(c,backAnimation,back.x-s.cameraX,back.y-s.cameraY+pad,now-this.dkAnimationAt,back.facing);else this.dkAtlas.draw(c,back.character,backAnimation,back.x-s.cameraX,back.y-s.cameraY+pad,now-this.dkAnimationAt,back.facing);}
  const throwing=now<this.combat.throwUntil,recoil=throwing?-this.controls.facing*2:0;
  const leaderY=poses.leader.y-s.cameraY+pad,leaderFacing=this.teamDamage.transitioning?s.facing:this.controls.facing;drawTagContact(c,x,leaderY-24,poses.contact);
  const nativeMount=nativeDkcMount(this.wram);
  if(this.adventure.active==='mario'&&!nativeMount)this.dkAtlas.drawMarioYoshi(c,this.teamTag.swapping?'jump':animation,x+recoil,leaderY,now-this.dkAnimationAt,leaderFacing);
  else{
   const mount=nativeMount?.kind??this.adventure.mount;
   const mounted=mount!=='foot',mx=nativeMount?nativeMount.x-s.cameraX:x,my=nativeMount?nativeMount.y-s.cameraY+pad:leaderY;
   if(mounted){if(mount==='yoshi')this.dkAtlas.drawYoshi(c,animation,mx,my,now-this.dkAnimationAt,leaderFacing);else this.dkAtlas.draw(c,mount,mount==='enguarde'&&now<this.dkWater.stabUntil?'roll':animation,mx,my,now-this.dkAnimationAt,leaderFacing);}
   const seat=mounted?dkcSaddle(mount,this.adventure.active):{x:0,y:0};
   this.dkAtlas.draw(c,this.adventure.active,mounted?'ride':this.teamTag.swapping?'jump':animation,mx+recoil+seat.x*leaderFacing,my+seat.y,now-this.dkAnimationAt,leaderFacing);
  }
  c.globalAlpha=heroAlpha;if(this.dkDefeat.active){c.globalAlpha=1;return;}
  const t=this.combat.tongue;
  if(t)this.dkAtlas.drawTongue(c,t.x-s.cameraX,t.y-s.cameraY+pad,t.endX-s.cameraX,t.endY-s.cameraY+pad,1-(t.until-now)/150);
  for(const p of this.combat.shots)this.dkAtlas.drawEgg(c,p.x-s.cameraX,p.y-s.cameraY+pad,p.age*1000,true);
  const launch=this.combat.launch;if(launch&&launch.until>now)this.dkAtlas.drawEggEffect(c,'smoke',launch.x-s.cameraX,launch.y-s.cameraY+pad,180-(launch.until-now));
  for(const p of this.combat.impacts)this.dkAtlas.drawEggEffect(c,'smoke',p.x-s.cameraX,p.y-s.cameraY+pad,210-(p.until-now));
  const aim=this.combat.aiming;
  if(aim)this.dkAtlas.drawEggEffect(c,'reticle',aim.endX-s.cameraX,aim.endY-s.cameraY+pad,now);
  const drum=this.dkDrum.state;if(drum){c.fillStyle='#10201bea';c.fillRect(5,pad+5,246,24);c.fillStyle='#fff5d6';c.font='bold 9px sans-serif';c.fillText(`Dumb Drum · ${drum.hp}/${drum.maxHp}`,10,pad+16);c.fillStyle='#a5d96c';c.fillRect(10,pad+21,235*drum.hp/drum.maxHp,4);}
  drawDkcGuardian(c,this.dkAtlas,this.dkGuardian.state,s.cameraX,s.cameraY,pad,dkcAvailableHeroes(this.wram));
  c.globalAlpha=1;
 }
 override diagnostics():Record<string,unknown>{return{mountDetails:{bananas:word(this.wram,0x57b),native:nativeDkcMount(this.wram),links:[word(this.wram,0x512),word(this.wram,0x514)],players:[2,4].map(slot=>({slot,id:word(this.wram,DKC.id+slot),state:word(this.wram,DKC.state+slot),x:word(this.wram,DKC.x+slot),y:word(this.wram,DKC.y+slot)})),mode:word(this.wram,0x32),bananaMask:this.wram[0xc4],formations:Array.from(this.wram.slice(0xc000,0xc030)),collectibles:dkcCollectibleTargets(this.wram).slice(0,4)},exitTrace:this.dkExitTrace,bossFinish:this.dkBossFinish?.bases.map(base=>({base,hold:this.emulator.Module.HEAPU8[base+0x3bfbfe],banana:Array.from(this.emulator.Module.HEAPU8.slice(base+0x3f836c,base+0x3f8370))})),victory:pendingBossVictory(this.wram),nativeActors:Array.from({length:23},(_,i)=>6+i*2).map(slot=>({slot,id:word(this.wram,0xd45+slot),state:word(this.wram,0x1029+slot),hp:word(this.wram,0x14f9+slot),sub:word(this.wram,0x152d+slot),hit:word(this.wram,0x1595+slot)})).filter(a=>a.id),native:{mode:this.wram[0x32]|this.wram[0x33]<<8,scene:this.wram[0x40]|this.wram[0x41]<<8,process:this.wram[0x508]|this.wram[0x509]<<8,brightness:this.wram[0x51a],playerStates:[word(this.wram,0x102b),word(this.wram,0x102d)],teamInitialized:this.teamInitialized,playerIds:[this.wram[0xd45]|this.wram[0xd46]<<8,this.wram[0xd47]|this.wram[0xd48]<<8,this.wram[0xd49]|this.wram[0xd4a]<<8]},flight:this.dkFlight.active,water:{swimming:this.swimming,mount:this.aquaticMount,stabUntil:this.dkWater.stabUntil},nativeMusic:{playing:word(this.wram,0x51d),song:word(this.wram,0x523),bank:word(this.wram,0x521)},nativeDrum:this.dkDrum.state,defeat:this.dkDefeat.active,guardian:this.dkGuardian.state,bossAudio:{playing:this.bossAudio.playing,played:this.bossAudio.played,last:this.bossAudio.lastEffect},yoshiCombatAudio:{ready:this.yoshiCombatAudio.ready,played:this.yoshiCombatAudio.played,last:this.yoshiCombatAudio.lastEffect},flutter:this.dkFlutter.active,flutterStarts:this.dkFlutter.starts,world:'dkc',...readDkcScene(this.wram),eggs:this.eggCount,mouth:this.combat.mouth,aiming:this.combat.aiming,tongue:this.combat.tongue,shots:this.combat.shots,kills:this.kills,enemies:dkcEnemies(this.wram),frame:this.dkFrame,paused:this.paused,audio:this.audio?.state,animalAudio:{ready:this.animalAudio.ready,played:this.animalAudio.played,last:this.animalAudio.lastEffect},teamSwap:this.teamTag.swapping,party:this.adventure.serialize()};}
}
