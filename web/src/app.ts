import './style.css';
import {parentAudioHost,syncHostRoute} from './audio-host';
import {PipeAudio,travelThroughPipe} from './pipe';
const pipeAudio=new PipeAudio();
import {installGameTouchGuards} from './touch';
import { Controls,type Button } from './controls';
import { launch,INPUT,primeAudio,detachNativeMixer,waitForNativeFrames,waitForNativePause } from './engine';
import { LiveGame } from './game';
import {DkcGame} from './dkc-game';
import {patchDkcDrawing} from './dkc-profile';
import {currentWorld,worldUrl,pipeArrival,encodeWorldParty,WORLD_PARTY_KEY,ACTIVE_WORLD_KEY,DKC_ROM_SHA256} from './world';
import {isWorldTab,needsLevelReturn} from './menu';
import { SpriteAtlas } from './atlas';
import { ANIMALS,CHARACTERS,CHARACTER_NAMES,type Character,type Mount } from './adventure';
import { ROM_SHA256,patchYoshiDrawing } from './profile';
import { loadFile,storeFile } from './storage';
const animalNames:Record<string,string>={foot:'On foot',yoshi:'Yoshi',rambi:'Rambi',winky:'Winky',expresso:'Expresso',enguarde:'Enguarde',squawks:'Squawks'};
const base=import.meta.env.BASE_URL;
let rememberedWorld:string|null=null;
try{if(!new URLSearchParams(location.search).has('test'))rememberedWorld=localStorage.getItem(ACTIVE_WORLD_KEY);}catch{}
const world=currentWorld(location.search,rememberedWorld),dkcWorld=world==='dkc';
const arrival=pipeArrival(location.href);if(arrival.arrival)history.replaceState(null,'',arrival.cleanUrl);
syncHostRoute(window);
const destination=dkcWorld?'yoshi':'dkc',destinationLabel=dkcWorld?'Yoshi’s Island':'Donkey Goonk';
const debug=import.meta.env.DEV&&new URLSearchParams(location.search).has('debug');
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<main class="shell">
 <header class="topbar"><div class="brand"><span class="brand-name">Kong <span>× Yoshi</span></span><small id="stage-name">The original adventure</small></div>
  <div class="toolbar">
  <button id="skip" class="tool skip" disabled aria-label="Skip dialogue or instructions">Skip <span aria-hidden="true">≫</span></button>
  <button id="pause" class="tool" disabled aria-label="Pause"><span aria-hidden="true">Ⅱ</span></button>
  <button id="fullscreen" class="tool" aria-label="Full screen"><span aria-hidden="true">⛶</span></button>
  <button id="options" class="tool" aria-label="Options and SNES buttons"><span aria-hidden="true">☰</span></button></div>
  <button id="sound-quick" class="tool sound-tool" disabled aria-label="Enable game sound">♪</button>
 </header>
 <section class="game-layout" aria-label="The game and its controls">
  <div class="play-column"><div class="screen-frame"><div class="screen">
   <div id="emulator" aria-label="SNES game screen"></div><canvas id="actor" width="256" height="239" aria-hidden="true"></canvas>
   <div id="welcome" class="welcome"><p class="eyebrow">DONKEY KONG COUNTRY × YOSHI’S ISLAND</p><h1>${dkcWorld?'Into the jungle.<br>The same heroes.':'One island.<br>A whole adventure.'}</h1><p class="intro">${dkcWorld?'PlushGoonk and the Kongs. Donkey Kong’s world.':'PlushGoonk and the Kongs. Yoshi’s world.'}</p><button id="play" class="play-button" disabled>Play / continue <span aria-hidden="true">↗</span></button></div>
   <div id="loading" class="loading" hidden><span aria-hidden="true">✳</span><p>Getting the adventure ready…</p></div>
  </div></div></div>
  <aside class="controller" aria-label="Touch controls">
   <div class="stick-wrap"><div id="stick" class="stick" role="group" aria-label="Move in every direction"><div id="stick-nub" class="stick-nub"></div></div></div>
   <div class="hud-side"><div class="party-row"><div class="character-picker" role="group" aria-label="Choose a character">${CHARACTERS.map(char=>`<button data-character="${char}" ${['violet','pink'].includes(char)?'':'hidden'} class="character ${char==='violet'?'selected':''}" aria-pressed="${char==='violet'}">${char==='violet'||char==='pink'?`<span class="plush-portrait ${char}" aria-hidden="true"></span>`:`<img src="${base}art/portraits/${char}.png" alt="">`}<span class="character-name">${CHARACTER_NAMES[char]}${char==='diddy'?'<small id="partner-status"></small>':''}</span></button>`).join('')}</div><button id="team-swap" class="team-button" disabled aria-label="Faire la tape pour changer de personnage">↔<span>Tape</span></button><button id="team-config" class="team-button" disabled aria-label="Choisir les deux personnages du duo">☷<span>Duo</span></button><label class="character-select" hidden><span>Character</span><select id="character" aria-label="Choose a character">${CHARACTERS.map(char=>`<option value="${char}">${CHARACTER_NAMES[char]}</option>`).join('')}</select></label></div>
   <div class="action-pad"><button data-control="jump" class="jump-button"><span aria-hidden="true">↗</span><strong id="jump-label">Jump</strong><small id="jump-hint">normal jump</small></button><button data-control="roll" class="roll-button"><span aria-hidden="true">↻</span><strong>Roll</strong><small>attack</small></button><button id="world-portal" class="world-portal" hidden aria-label="Take the Mario pipe to ${destinationLabel} world map"><svg class="portal-icon" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path fill="#174921" d="M8 12h24v28H8zM3 1h34v14H3z"/><path fill="#43ad39" d="M10 14h20v26H10zM5 3h30v10H5z"/><path fill="#a2ee69" d="M11 14h5v26h-5zM6 4h7v7H6z"/><path fill="#267b2c" d="M26 14h4v26h-4zM30 3h5v10h-5z"/><path fill="#d7ff99" d="M5 3h30v2H5z"/></svg><strong>${destinationLabel}</strong><small>Take the pipe</small></button><button data-control="tongue" class="tongue-button"><span aria-hidden="true">⌁</span><strong id="tongue-label">Tongue</strong><small id="tongue-hint">up: stick, then tap</small></button><button data-control="egg" class="egg-button"><span aria-hidden="true">◉</span><strong id="egg-label">Egg</strong><small id="egg-hint">throw · confirm · V</small></button></div></div>
  </aside>
 </section>
 <p id="status" class="status" role="status" aria-live="polite">Loading the game…</p>
 <dialog id="team-dialog" aria-labelledby="team-title"><div class="sheet-heading"><h2 id="team-title">Choisir le duo</h2><button id="team-close" class="tool" aria-label="Fermer le choix du duo">×</button></div><p class="sheet-hint">Le partenaire suit le héros. Tape ↔ ou T passe le relais au sol.</p><label class="team-field">Héros<select id="team-first">${CHARACTERS.map(c=>`<option value="${c}">${CHARACTER_NAMES[c]}</option>`).join('')}</select></label><label class="team-field">Partenaire<select id="team-second">${CHARACTERS.map(c=>`<option value="${c}">${CHARACTER_NAMES[c]}</option>`).join('')}</select></label><label class="mount-picker"><span>Partner</span><select id="mount" aria-label="Choose a mount"><option value="foot">On foot</option><option value="yoshi">Yoshi</option></select></label><p id="team-error" role="alert"></p><button id="team-apply" class="sheet-button">Jouer avec ce duo</button></dialog>
 <dialog id="settings" aria-labelledby="settings-title"><div class="sheet-heading"><h2 id="settings-title">At your pace.</h2><button id="close-settings" class="tool" aria-label="Close options">×</button></div><p class="sheet-hint">On the map, Up selects the world tabs and Down returns to the levels. Levels ↓ also returns from the current world tab. Unlocked stages and worlds can be selected with Left/Right. Hold the stick to move. Release it to stop. Hold Jump to flutter on Yoshi; the Kongs on foot have a normal jump. Walking after release is optional: enable Keep walking below, then touch the center to stop. The roll keeps moving on its own. To grab Baby Mario above you: push the stick up, release, then tap Tongue within two seconds. An egg can also bring his bubble closer. Egg: tap once to aim, again to throw, and tap it to confirm on-screen text. To make one: Tongue an enemy, then down on the stick. V aims, throws and confirms, arrow keys move.</p><label class="setting"><span>Keep walking after release</span><input id="sticky" type="checkbox"></label><label class="setting"><span>Keep Baby Mario on screen</span><input id="baby-visibility" type="checkbox" checked aria-describedby="baby-visibility-hint"></label><p id="baby-visibility-hint" class="sheet-hint">Slows his bubble near the top edge. Turn off for the original flight. The countdown stays the same.</p><label class="setting"><span>Skip instructions automatically</span><input id="auto-skip" type="checkbox"></label><button id="sound" class="sheet-button">♪ Enable game sound</button><button id="save" class="sheet-button" disabled>Save my game</button><button id="level-map" class="sheet-button" disabled>Choose a level · World map</button><button id="repair-display" class="sheet-button" disabled>Repair display · Return to map</button><p class="sheet-hint">If the image is scrambled: rebuild the map. Completed stages and partners stay saved; the current stage starts again. A copy of the previous state is kept on this device.</p><p class="sheet-hint">The campaign and your partners also save automatically on this device.</p><details><summary>More SNES buttons</summary><div class="native-buttons">${[['Y',1],['B',0],['A',8],['X',9],['L',10],['R',11],['Start',3],['Select',2]].map(([label,id])=>`<button data-native="${id}">${label}</button>`).join('')}</div><p class="sheet-hint">Keyboard: arrows, Space jump, X roll, C tongue, V egg or confirm, Esc pause.</p></details><details id="debug" ${debug?'':'hidden'}><summary>Development diagnostics</summary><pre id="diagnostic"></pre><button id="test-export-dkc" ${dkcWorld?'':'hidden'}>Export DKC map bootstrap (test)</button><button id="test-wall">Place a breakable wall (test)</button><button id="test-reset">Restart from the beginning (test)</button><button id="test-egg">Make a native egg (test)</button><button id="test-hit">Walk up to a Shy Guy</button><button id="test-roll">Roll into a Shy Guy</button><button id="test-dialogue">Open a native instruction (test)</button><button id="test-unlock">Unlock partners (test)</button><button id="test-audio">Check native audio signal (test)</button><button id="test-goal-save" ${import.meta.env.DEV&&debug?'':'hidden'}>Create stalled 1-2 save (DEV test)</button><button id="test-goal">Approach the 1-1 goal (test)</button><button id="test-boss-eggs">Fire boss eggs (test)</button><button id="test-protect">Protect boss test: off</button><button id="test-necky">Preview Necky guardian (test)</button><label>Native boss arena<select id="test-native-arena"><option value="224">Very Gnawty</option><option value="225">Master Necky</option><option value="226">Really Gnawty</option><option value="227">Dumb Drum</option><option value="228">Master Necky Snr</option><option value="229">Queen B</option><option value="104">K. Rool</option></select></label><button id="test-dkc-native-boss">Enter native boss arena (test)</button><button id="test-dkc-native-hit">Submit native final stomp (test)</button><button id="test-dkc-exit">Approach Jungle exit (test)</button><button id="test-castle">Enter original 1-4 boss room (test)</button><button id="test-burt-end">Run original Burt defeat sequence (test)</button></details></dialog>
</main>`;
installGameTouchGuards(document.querySelector<HTMLElement>('.shell')!);
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
function unlockFromGesture(event:Event):void{if(!event.isTrusted)return;primeAudio();void game?.unlockAudio().catch(()=>{});}
window.addEventListener('pointerup',unlockFromGesture,{capture:true});
window.addEventListener('touchend',unlockFromGesture,{capture:true});
window.addEventListener('click',unlockFromGesture,{capture:true});
window.addEventListener('keydown',unlockFromGesture,{capture:true});
// Prevent iOS long-press callouts on gameplay while preserving native form controls.
document.addEventListener('contextmenu',event=>{
 if(event.target instanceof Element&&event.target.closest('.shell')&&!event.target.closest('input,textarea,select'))event.preventDefault();
});
const controls=new Controls();let rom:Uint8Array|undefined,game:LiveGame|undefined,starting=false,menuResume=false;
const setStatus=(message:string)=>{$('status').textContent=message;$('loading').querySelector('p')!.textContent=message;};
function syncParty():void{
 const a=game?.adventure;
 document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(b=>{const char=b.dataset.character as Character,active=(a?.active??'violet')===char;b.hidden=!(a?.team??['violet','pink']).includes(char);b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));b.disabled=a?!a.available.includes(char):false;});
 const character=$<HTMLSelectElement>('character');character.value=a?.active??'violet';character.querySelectorAll('option').forEach(o=>{o.disabled=a?!a.available.includes(o.value as Character):false;});
 $('partner-status').textContent=a?.available.includes('diddy')?'':'';
 const mounts:Mount[]=['foot','yoshi',...(a?.animals??[])];const select=$<HTMLSelectElement>('mount');select.innerHTML=mounts.map(m=>`<option value="${m}">${animalNames[m]}</option>`).join('');select.value=a?.mount??'foot';select.closest('label')!.toggleAttribute('hidden',dkcWorld||a?.active==='mario');
 $('jump-hint').textContent=dkcWorld?'native jump':a?.mount==='yoshi'?'hold to flutter':a?.mount==='squawks'?'hold to fly':'normal jump';
 if(game?.ready)$('stage-name').textContent=game.stageLabel;
}
async function acceptRom(bytes:Uint8Array):Promise<void>{
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==(dkcWorld?DKC_ROM_SHA256:ROM_SHA256))throw new Error('This game data is invalid or incomplete.');
 if(!dkcWorld)patchYoshiDrawing(bytes); // Validate the exact draw routine, without patching the source ROM.
 rom=dkcWorld?patchDkcDrawing(bytes):bytes; // Bundled ROM loads independently of iOS/private storage availability.
 void storeFile(dkcWorld?'rom-dkc':'rom',bytes).catch(()=>{});if(!starting){setStatus('Ready · Play resumes your saved game.');$<HTMLButtonElement>('play').disabled=false;}
}
async function loadBundledRom():Promise<void>{
 const url=import.meta.env.DEV&&import.meta.env.VITE_DEV_ROM_URL?import.meta.env.VITE_DEV_ROM_URL:`${base}rom/${dkcWorld?'dkc-usa-rev2.sfc':'yoshi-eu.sfc'}`;
 const r=await fetch(url);if(!r.ok)throw new Error('Couldn’t load the game.');
 await acceptRom(new Uint8Array(await r.arrayBuffer()));
}
if(arrival.arrival){$('welcome').hidden=true;$('loading').hidden=false;setStatus('Travelling through the pipe…');}
void loadBundledRom().then(()=>{if(arrival.arrival)void startGame();}).catch(e=>{setStatus((e as Error).message);$('loading').hidden=true;$('welcome').hidden=false;});
async function startGame():Promise<void>{
 if(starting)return;if(game&&!game.ready){location.reload();return;}if(!rom){setStatus('The game is still loading…');return;}
 primeAudio();
 starting=true;$('welcome').hidden=true;$('loading').hidden=false;setStatus('Loading the SNES core…');
 try{const atlas=await SpriteAtlas.load();const emulator=await launch(rom,setStatus,dkcWorld?'Donkey Goonk DKC Rev2':'Kong Island');setStatus('Opening your saved adventure…');emulator.gameManager.toggleMainLoop(1);game=new (dkcWorld?DkcGame:LiveGame)(emulator,controls,$<HTMLCanvasElement>('actor'),atlas,setStatus,syncParty);game.autoSkip=$<HTMLInputElement>('auto-skip').checked;game.keepBabyOnScreen=$<HTMLInputElement>('baby-visibility').checked;await game.prepare();if(arrival.arrival&&!game.isMap){game.goToMap();const began=performance.now();while(!game.isMap){if(performance.now()-began>15000)throw Error('The destination map could not be opened. Retry Play to resume your saved game.');await waitForNativeFrames(emulator.gameManager);}}$('loading').hidden=true;
  for(const id of ['pause','skip','save','sound-quick','level-map','repair-display'])$<HTMLButtonElement>(id).disabled=false;
  await game.unlockAudio().catch(()=>{});void pipeAudio.prepare(game.audio);if(game.audio?.state!=='running')setStatus('Tap ♪ at the top to enable sound.');syncParty();
 }catch(e){console.error('KONG_START_ERROR',e);setStatus((e as Error).message);$('loading').hidden=true;$('welcome').hidden=false;if(game){game.setPaused(true);$('play').textContent='Reload the page';$<HTMLButtonElement>('repair-display').disabled=!game.canRepairDisplay;}starting=false;}
}
$('play').addEventListener('click',()=>{void startGame();});
function releaseUiFocus(target:EventTarget|null):void{const el=target instanceof HTMLElement?target:document.activeElement;if(el instanceof HTMLElement&&el.matches('button,select')&&!el.closest('dialog'))el.blur();}
document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(b=>b.addEventListener('click',()=>{if(game&&game.character!==b.dataset.character)requestTeamSwap();releaseUiFocus(b);}));
$('character').addEventListener('change',e=>{const select=e.target as HTMLSelectElement;if(game)game.character=select.value as Character;releaseUiFocus(select);});
$('mount').addEventListener('change',e=>{const select=e.target as HTMLSelectElement;game?.stop();game?.mount(select.value as Mount);releaseUiFocus(select);});
let worldSwitchPending=false,portalPreloaded=false;
function refreshButtons():void{
 const map=Boolean(game?.ready&&game.isMap);
 if(map&&!portalPreloaded){portalPreloaded=true;void fetch(`${base}rom/${destination==='dkc'?'dkc-usa-rev2.sfc':'yoshi-eu.sfc'}`,{cache:'force-cache'}).then(r=>r.ok?r.arrayBuffer():undefined).catch(()=>{});}
 $<HTMLButtonElement>('team-swap').disabled=!game?.ready||Boolean(game?.paused)||Boolean(game?.teamSwapping)||worldSwitchPending;
 $<HTMLButtonElement>('team-config').disabled=!game?.ready||worldSwitchPending;
 $('world-portal').hidden=!map;$<HTMLButtonElement>('world-portal').disabled=worldSwitchPending;
 document.querySelector<HTMLElement>('[data-control="roll"]')!.hidden=map;
}
$('world-portal').addEventListener('click',async()=>{
 if(!game?.ready||!game.isMap||worldSwitchPending)return;
 const audioUnlocked=game.unlockAudio().catch(()=>{});
 worldSwitchPending=true;const wasPaused=game.paused;pause(true);refreshButtons();
 setStatus(`Saving your adventure · Opening ${destinationLabel}…`);
 try{
  const currentGame=game;
  await travelThroughPipe(async()=>{
   await currentGame.saveForWorldSwitch();await storeFile(WORLD_PARTY_KEY,encodeWorldParty(currentGame.adventure.serialize()));
  },async()=>{await audioUnlocked;await pipeAudio.play(currentGame.audio);},()=>{
   try{if(!new URLSearchParams(location.search).has('test'))localStorage.setItem(ACTIVE_WORLD_KEY,destination);}catch{}
   location.replace(worldUrl(location.href,destination));
  });
 }catch(error){worldSwitchPending=false;pause(wasPaused);refreshButtons();setStatus(`The world could not be opened. ${(error as Error).message}`);}
 releaseUiFocus($('world-portal'));
});
const stick=$('stick'),nub=$('stick-nub');let stickPointer:number|undefined;
function placeStick(e:PointerEvent):void{
 const rect=stick.getBoundingClientRect(),radius=rect.width/2,max=radius*0.58;
 let dx=e.clientX-(rect.left+radius),dy=e.clientY-(rect.top+radius),dist=Math.hypot(dx,dy);
 if(dist>max&&dist>0){dx*=max/dist;dy*=max/dist;}
 nub.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
 controls.setStick(dx/max,dy/max,performance.now());refreshButtons();
}
stick.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();try{stick.setPointerCapture(e.pointerId);}catch{}stickPointer=e.pointerId;if(game?.ready&&!game.paused)void game.unlockAudio().catch(()=>{});placeStick(e);});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)placeStick(e);});
const releaseStick=()=>{stickPointer=undefined;nub.style.transform='translate(-50%, -50%)';controls.releaseStick();};
stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',()=>{releaseStick();game?.stop();controls.stop();refreshButtons();});
document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach(b=>{
 let pointerHandled=false;
 const activate=(source?:string)=>{if(game?.ready&&!game.paused){void game.unlockAudio().catch(()=>{});if(b.dataset.control==='jump'&&source)controls.holdJump(source,performance.now());else controls.activate(b.dataset.control as Button,performance.now());refreshButtons();}};
 b.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch{}pointerHandled=true;activate(`pointer:${e.pointerId}`);});b.addEventListener('pointerup',e=>{if(b.dataset.control==='jump')controls.releaseJump(`pointer:${e.pointerId}`,performance.now());controls.release(b.dataset.control as Button);refreshButtons();releaseUiFocus(b);});b.addEventListener('pointercancel',()=>{pointerHandled=false;game?.stop();refreshButtons();});b.addEventListener('click',e=>{if(e.detail===0||!pointerHandled)activate();pointerHandled=false;releaseUiFocus(b);});
});
function pause(value:boolean):void{game?.setPaused(value);$('pause').innerHTML=value?'▶':'Ⅱ';$('pause').setAttribute('aria-label',value?'Resume':'Pause');refreshButtons();}
$('pause').addEventListener('click',()=>{if(game)pause(!game.paused);releaseUiFocus($('pause'));});$('skip').addEventListener('click',()=>{if(game?.paused)pause(false);game?.skipDialogue();releaseUiFocus($('skip'));});
$('fullscreen').addEventListener('click',async()=>{try{const fullDoc=parentAudioHost(window)?window.parent.document:document;if(fullDoc.fullscreenElement)await fullDoc.exitFullscreen();else await fullDoc.documentElement.requestFullscreen();}catch{setStatus('The game already uses all the space in this browser.');}releaseUiFocus($('fullscreen'));});
const settings=$<HTMLDialogElement>('settings'),teamDialog=$<HTMLDialogElement>('team-dialog');let teamResume=false;
function requestTeamSwap():void{if(!game?.requestTeamSwap())setStatus('Pose-toi au sol pour faire la tape.');else setStatus('Tape · Passage de relais');releaseUiFocus($('team-swap'));}
$('team-swap').addEventListener('click',requestTeamSwap);
function closeTeam():void{teamDialog.close();if(teamResume)pause(false);teamResume=false;}
$('team-config').addEventListener('click',()=>{if(!game?.ready)return;teamResume=!game.paused;if(teamResume)pause(true);$<HTMLSelectElement>('team-first').value=game.character;$<HTMLSelectElement>('team-second').value=game.adventure.partner;$('team-error').textContent='';teamDialog.showModal();});
$('team-close').addEventListener('click',closeTeam);teamDialog.addEventListener('cancel',e=>{e.preventDefault();closeTeam();});
$('team-apply').addEventListener('click',()=>{const first=$<HTMLSelectElement>('team-first').value as Character,second=$<HTMLSelectElement>('team-second').value as Character;if(!game?.configureTeam(first,second)){$('team-error').textContent='Choisis deux personnages différents.';return;}syncParty();closeTeam();setStatus(`${CHARACTER_NAMES[first]} + ${CHARACTER_NAMES[second]}`);});
if(dkcWorld){
 $('skip').hidden=true;
 $('settings').querySelector('.sheet-hint')!.textContent='Choose a stage on the native Donkey Kong map with the stick, then tap Enter. In a stage, hold Jump for a native Kong jump and use Roll to attack. Aim the stick, release, then tap Tongue to swallow an enemy in that direction. Press Down to make an egg (up to six). Tap Eggs or press V once to aim and again to throw. Against bosses, six eggs follow you: tap once to aim, then again to throw along the reticle. C uses the tongue, X rolls, arrows move. Each world keeps its own local save; the green pipe on either map changes worlds with the same selected hero.';
 for(const id of ['baby-visibility','auto-skip'])$(id).closest('label')!.setAttribute('hidden','');
 $('baby-visibility-hint').hidden=true;
 $('level-map').textContent='Leave stage · World map';
 $('repair-display').textContent='Return to the last map checkpoint';
 $('repair-display').nextElementSibling!.textContent='Returning to the map restarts the current stage attempt from the last map checkpoint. Your separate Yoshi adventure is kept.';
}
function closeSettings():void{settings.close();if(menuResume)pause(false);menuResume=false;}
function resumeFromSettings():void{closeSettings();if(game?.ready&&game.paused)pause(false);}
$('options').addEventListener('click',()=>{menuResume=Boolean(game?.ready&&!game.paused);if(menuResume)pause(true);settings.showModal();});$('close-settings').addEventListener('click',closeSettings);settings.addEventListener('cancel',e=>{e.preventDefault();closeSettings();});
$<HTMLInputElement>('sticky').addEventListener('change',e=>{controls.stop();controls.sticky=(e.target as HTMLInputElement).checked;refreshButtons();});
$<HTMLInputElement>('auto-skip').addEventListener('change',e=>{if(game)game.autoSkip=(e.target as HTMLInputElement).checked;});
const babyVisibility=$<HTMLInputElement>('baby-visibility');
try{babyVisibility.checked=localStorage.getItem('kong-baby-visibility')!=='off';}catch{}
babyVisibility.addEventListener('change',()=>{if(game)game.keepBabyOnScreen=babyVisibility.checked;try{localStorage.setItem('kong-baby-visibility',babyVisibility.checked?'on':'off');}catch{}});
function enableSound():void{
 if(!game?.ready)return;
 if(settings.open)closeSettings();
 primeAudio();void game.unlockAudio().then(()=>{
  const on=game?.audio?.state==='running';
  $('sound-quick').setAttribute('aria-label',on?'Restore game sound':'Enable game sound');
  setStatus(on?'Audio enabled · If silent, check the iPhone media volume.':'Tap ♪ again to enable sound.');
 }).catch(()=>setStatus('Tap ♪ again to enable sound.'));
 releaseUiFocus($('sound-quick'));
}
$('sound').addEventListener('click',enableSound);$('sound-quick').addEventListener('click',enableSound);
$('level-map').addEventListener('click',()=>{resumeFromSettings();game?.goToMap();});
$('save').addEventListener('click',()=>{void game?.save();});
$('repair-display').addEventListener('click',async()=>{
 if(!game)return;
 menuResume=false;settings.close();$('welcome').hidden=true;$('loading').hidden=false;
 const button=$<HTMLButtonElement>('repair-display');button.disabled=true;
 try{await game.repairDisplay();starting=true;for(const id of ['pause','skip','save','sound-quick','level-map'])$<HTMLButtonElement>(id).disabled=false;pause(document.hidden);}
 catch(error){setStatus((error as Error).message);$('pause').innerHTML='▶';$('pause').setAttribute('aria-label','Resume');if(!game.ready){$('welcome').hidden=false;$('play').textContent='Reload the page';starting=false;}}
 finally{$('loading').hidden=true;button.disabled=false;}
});
document.querySelectorAll<HTMLButtonElement>('[data-native]').forEach(b=>b.addEventListener('click',()=>{const button=Number(b.dataset.native);resumeFromSettings();controls.pulse(button,performance.now());}));
const keys=new Set<string>();const keyActions:Record<string,Button>={Space:'jump',KeyX:'roll',KeyC:'tongue',KeyV:'egg',ArrowUp:'up',ArrowDown:'down'};
window.addEventListener('keydown',e=>{
 const target=e.target as HTMLElement|null;
 if(target?.matches('input,select,textarea')||settings.open||teamDialog.open)return;
 // Keep the map portal's native Space/Enter activation instead of jumping.
 if(['world-portal','team-swap','team-config'].includes(target?.id??'')&&(e.code==='Space'||e.code==='Enter'))return;
 if(e.code==='KeyT'){e.preventDefault();if(!e.repeat)requestTeamSwap();return;}
 const gameKey=e.code==='ArrowLeft'||e.code==='ArrowRight'||Boolean(keyActions[e.code]);
 if(e.code==='Escape'&&game){e.preventDefault();pause(!game.paused);return;}
 if(!gameKey)return;
 e.preventDefault();releaseUiFocus(target);
 if(e.repeat)return;keys.add(e.code);controls.keyboardDirection=keys.has('ArrowLeft')?-1:keys.has('ArrowRight')?1:0;if(controls.keyboardDirection)controls.facing=controls.keyboardDirection;if(e.code==='Space')controls.holdJump('keyboard',performance.now());else if(keyActions[e.code])controls.activate(keyActions[e.code],performance.now());
});
window.addEventListener('keyup',e=>{if(e.code==='Space')controls.releaseJump('keyboard',performance.now());keys.delete(e.code);controls.keyboardDirection=keys.has('ArrowLeft')?-1:keys.has('ArrowRight')?1:0;});
window.addEventListener('blur',()=>{keys.clear();game?.stop();controls.stop();refreshButtons();});
function suspendGame():void{keys.clear();releaseStick();if(game?.ready)pause(true);else controls.stop();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendGame();});
// Covers navigation/reload and the browser back-forward cache as well as hiding.
window.addEventListener('pagehide',event=>{suspendGame();if(game&&!event.persisted)detachNativeMixer(game.emulator.Module);});
$('test-wall').addEventListener('click',()=>{if(dkcWorld||!debug||!game?.ready)return;closeSettings();if(game.paused)pause(false);game.stop();setStatus(`${game.testWall()} test blocks placed. Roll to break them.`);});
$('test-reset').addEventListener('click',async()=>{if(dkcWorld||!debug||!game)return;const state=await loadFile('campaign-eu-map-v3-snes9x-2.0.2');if(!state)return;closeSettings();game.stop();game.emulator.gameManager.loadState(state);});
$('test-egg').addEventListener('click',()=>{if(dkcWorld||!debug||!game?.ready)return;closeSettings();game.stop();const g=game.gsu,read=(a:number)=>g[a]|g[a+1]<<8,write=(a:number,v:number)=>{g[a]=v&255;g[a+1]=v>>>8;};for(let i=0;i<24;i++){const o=i*4;if(read(0x1360+o)===0x1e&&read(0xf00+o)===0x10){write(0x8c,read(0x10e2+o)-40);write(0x90,read(0x1182+o));write(0xb4,0);write(0xaa,0);write(0xc4,0);write(0x1d6,0x3f);controls.facing=1;controls.activate('tongue',performance.now());setTimeout(()=>controls.activate('down',performance.now()),700);break;}}});
$('test-hit').addEventListener('click',()=>{if(dkcWorld||!debug||!game?.ready)return;closeSettings();game.stop();game.gsu[0x8c]=0xd0;game.gsu[0x8d]=1;game.gsu[0x90]=0x70;game.gsu[0x91]=7;});
$('test-roll').addEventListener('click',()=>{if(dkcWorld||!debug||!game?.ready)return;closeSettings();game.stop();const g=game.gsu,read=(a:number)=>g[a]|g[a+1]<<8,write=(a:number,v:number)=>{g[a]=v&255;g[a+1]=v>>>8;};for(let i=0;i<24;i++){const o=i*4;if(read(0x1360+o)===0x1e&&read(0xf00+o)===0x10){write(0x8c,read(0x10e2+o)-24);write(0x90,read(0x1182+o));write(0xb4,0);write(0xaa,0);controls.facing=1;controls.activate('roll',performance.now());break;}}});
$('test-dialogue').addEventListener('click',()=>{if(dkcWorld||!debug||!game?.ready||game.wram[0x118]!==0x13)return;closeSettings();if(game.paused)pause(false);game.stop();game.wram[0xd11]=1;game.gsu[0x4070]=0x2c;game.gsu[0x4071]=0;});
$('test-unlock').addEventListener('click',()=>{if(!debug||!game)return;game.adventure.available=[...CHARACTERS];game.adventure.animals=[...ANIMALS];syncParty();});
let lastDiagnostic=0,protectBossTest=false;
$('test-protect').addEventListener('click',()=>{if(!debug)return;protectBossTest=!protectBossTest;$('test-protect').textContent=`Protect boss test: ${protectBossTest?'on':'off'}`;});
$('test-necky').addEventListener('click',()=>{if(!debug||dkcWorld||!game?.adventure.guardian)return;const s=game.adventure.guardian;s.id='necky';s.hp=3;s.phase='fight';s.elapsed=0;s.hitUntil=0;s.shots=[];});
function frame():void{
 const now=performance.now();
 if(debug&&protectBossTest&&game?.ready&&!game.paused){
  if(dkcWorld){const slot=(game.wram[0x56f]|game.wram[0x570]<<8)===2?4:2;game.wram[0x16d1+slot-2]=60;game.wram[0x16d2+slot-2]=0;}
  else if(game.wram[0x118]===0x13){game.gsu[0x1d6]=0x3f;game.gsu[0x1d7]=0;}
 }
 game?.tick(now);refreshButtons();
 if(game?.ready){
  const map=game.isMap,returnToLevels=!dkcWorld&&needsLevelReturn(game.wram);
  const mapLabel=returnToLevels?'Levels ↓':'Enter';
  const mapHint=returnToLevels?'back to the level grid':!dkcWorld&&isWorldTab(game.wram)?'selected world':'selected level';
  $('jump-label').textContent=map?mapLabel:'Jump';
  $('jump-hint').textContent=map?mapHint:dkcWorld?'native jump':game.adventure.mount==='yoshi'?'hold to flutter':game.adventure.mount==='squawks'?'hold to fly':'normal jump';
  const up=controls.tongueAimingUp(now);$('tongue-label').textContent=up?'Tongue ↑':'Tongue';$('tongue-hint').textContent=dkcWorld?'stick direction, then tap':up?'aimed up':'up: stick, then tap';
  const n=game.eggCount,aiming=game.aiming,unlimited=game.eggsUnlimited;
  $('egg-label').textContent=map?mapLabel:game.messageOpen?'OK':unlimited?(aiming?'Throw · ∞':'Aim · ∞'):aiming?'Throw':`Eggs · ${n}`;
  $('egg-hint').textContent=map?mapHint:game.messageOpen?'confirm':unlimited?'aim, then throw / V':aiming?'press / V':n?('aim, then throw / V'):'Tongue then Down';
 }
 if(debug&&game?.ready&&now-lastDiagnostic>500){const owner=parentAudioHost(window);$('diagnostic').textContent=JSON.stringify({...game.diagnostics(),audioOwner:{persistent:Boolean(owner),generation:owner?.generation,state:owner?.context?.state}},null,2);lastDiagnostic=now;}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

$('test-audio').addEventListener('click',async()=>{
 if(!debug||!game?.ready)return;closeSettings();await game.unlockAudio();
 const slot=game.emulator.Module.AL?.currentCtx;if(!slot?.gain)return;
 const analyser=slot.audioCtx.createAnalyser();analyser.fftSize=2048;slot.gain.connect(analyser);
 try{await new Promise(r=>setTimeout(r,250));const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);const rms=Math.sqrt(data.reduce((sum,v)=>sum+v*v,0)/data.length);setStatus(`Native audio: ${slot.audioCtx.state} · signal ${rms.toFixed(5)}`);}finally{slot.gain.disconnect(analyser);analyser.disconnect();}
});
$('test-goal').addEventListener('click',async()=>{
 if(dkcWorld||!debug||!game?.ready||game.wram[0x21a]!==0)return;
 resumeFromSettings();game.stop();
 // Reload 1-1 through its real entrance loader near the goal. Restore the ROM
 // data immediately afterwards; never manufacture a goal sprite or completion.
 const signature=new Uint8Array([0,7,0x77,1,1,7,0x7a,2,2,3,0x7a,3,3,7,0x7a,4]);
 const heap=game.emulator.Module.HEAPU8,sites:number[]=[];
 for(let p=0;p<heap.length-signature.length;p++)if(heap[p]===0&&signature.every((v,i)=>heap[p+i]===v))sites.push(p);
 if(!sites.length||sites.length>4){setStatus('Entrance fixture signature is ambiguous.');return;}
 const manager=game.emulator.gameManager;
 const wait=async(mode:number)=>{const began=performance.now();while(game!.wram[0x118]!==mode){if(performance.now()-began>12000)throw new Error('Native entrance timed out.');await waitForNativeFrames(manager);}};
 try{
  for(const p of sites){heap[p+1]=0xdd;heap[p+2]=0x69;}
  if(game.wram[0x118]!==0x26){game.goToMap();await wait(0x26);}
  controls.pulse(0,performance.now());await wait(0x13);game.skipDialogue();
  const readyAt=performance.now();while(!game.eggsUnlimited||game.messageOpen){if(performance.now()-readyAt>8000)break;game.gsu[0x1d6]=0x3f;game.gsu[0x1d7]=0;await waitForNativeFrames(manager);}
  game.gsu[0x1d6]=0x3f;game.gsu[0x1d7]=0;
  pause(true);setStatus('Native goal approach loaded · Resume to test the ring.');
 }catch(e){setStatus((e as Error).message);}
 finally{for(const p of sites)heap.set(signature,p);}
});

$('test-boss-eggs').addEventListener('click',async()=>{
 if(dkcWorld||!debug||!game?.ready)return;resumeFromSettings();game.stop();
 // Let entrance / instruction frames settle, while protecting an unattended
 // test without the huge invincibility value that also native-stuns Yoshi.
 game.skipDialogue();
 for(let i=0;i<120;i++){
  if(game.paused)break;
  if(game.wram[0x118]===0x13){game.gsu[0x1d6]=0x3f;game.gsu[0x1d7]=0;}
  if(game.adventure.guardian?.phase==='exit')break;
  if(game.eggsUnlimited&&i%3===0)controls.activate('egg',performance.now());
  await new Promise(r=>setTimeout(r,100));
 }
 await new Promise(r=>setTimeout(r,1000));
 // Large native invincibility also suppresses movement: leave only the normal grace.
 game.gsu[0x1d6]=0x3f;game.gsu[0x1d7]=0;
 pause(true);setStatus('Boss egg sequence finished · Inspect the guardian and exit.');
});

$('test-castle').addEventListener('click',async()=>{
 if(dkcWorld||!debug||!game?.ready)return;resumeFromSettings();game.goToMap();
 const w=game.wram;w[0x218]=0;w[0x21a]=3;
 w.set([0x3d,5,0x63,0],0x17e00);w[0x38e]=0;w[0x38f]=0;w[0x38c]=1;w[0x38d]=0;w[0x118]=0x0f;
 const began=performance.now();while(w[0x118]!==0x13){if(performance.now()-began>15000){setStatus('Native castle load timed out.');return;}await waitForNativeFrames(game.emulator.gameManager);}
 // Keep this isolated transition fixture alive while inspecting the scripts.
 game.gsu[0x1d6]=0xff;game.gsu[0x1d7]=0x7f;
 setStatus('Original Burt room · Native boss must be beaten before the guardian.');
});

$('test-burt-end').addEventListener('click',async()=>{
 if(dkcWorld||!debug||!game?.ready||game.wram[0x21a]!==3)return;resumeFromSettings();
 const g=game.gsu,word=(a:number)=>g[a]|g[a+1]<<8;
 for(let slot=6;slot<24;slot++){
  const o=slot*4;if(word(0x1360+o)!==0x46||word(0xf00+o)!==0x10)continue;
  // DEV-only: enter the real Burt post-damage state, not a fabricated key or
  // completion. The original explosion must create its own boss key.
  g[0x1a36+o]=0x48;g[0x1a37+o]=2;g[0x1978+o]=0x1f;g[0x1979+o]=0;
  setStatus('Native Burt defeat running · Wait for the guardian.');
  const began=performance.now();while(!game.eggsUnlimited){if(performance.now()-began>12000)return;await waitForNativeFrames(game.emulator.gameManager);}
  pause(true);setStatus('Post-Burt guardian ready · Resume or fire the test eggs.');return;
 }
 setStatus('Burt is not active yet.');
});

$('test-export-dkc').addEventListener('click',async()=>{
 if(!debug||!game?.ready||game.world!=='dkc'||!game.isMap)return;
 const active=game,wasPaused=active.paused;active.setPaused(true);
 try{
  await waitForNativePause(active.emulator.gameManager);
  const state=new Uint8Array(active.emulator.gameManager.getState());
  const url=URL.createObjectURL(new Blob([state.buffer],{type:'application/octet-stream'}));
  const link=document.createElement('a');link.href=url;link.download='dkc-map-snes9x-2.0.2.state';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('DKC map bootstrap exported.');
 }catch(error){setStatus((error as Error).message);}
 finally{if(!wasPaused)active.setPaused(false);}
});

$('test-dkc-exit').addEventListener('click',async()=>{
 if(!debug||!dkcWorld||!game?.ready)return;
 const active=game,w=active.wram,m=active.emulator.gameManager,read=(p:number)=>w[p]|w[p+1]<<8,write=(p:number,v:number)=>{w[p]=v&255;w[p+1]=v>>8&255;};
 if(read(0x3e)!==22){setStatus('This fixture requires Jungle Hijinxs.');return;}
 resumeFromSettings();protectBossTest=true;$('test-protect').textContent='Protect boss test: on';
 if(active.isMap){controls.pulse(INPUT.b,performance.now());const began=performance.now();while(active.isMap){if(performance.now()-began>10000)return;await waitForNativeFrames(m);}}
 const began=performance.now();while(read(0x4a)!==512||![1,2].includes(read(0xd47))){if(performance.now()-began>10000)return;await waitForNativeFrames(m);}
 active.stop();
 // DEV travel fixture only: the native loader still creates the actual door.
 // Let its camera/tile streaming advance for real native frames at each step.
 const waitFrames=async(count:number)=>{const first=m.functions.getFrameNum(),started=performance.now();while(m.functions.getFrameNum()-first<count){if(performance.now()-started>12000)throw Error('Native fixture frame timeout');await waitForNativeFrames(m);}};
 for(let x=600;x<=5280;x+=120){
  write(0xb1b,x);write(0xb1d,x-24);write(0xbc3,175);write(0xbc5,175);write(0xe8b,0);write(0xef3,0);write(0x102b,0);write(0x16d1,100);write(0x16d5,100);
  await waitFrames(24);
 }
 for(let i=0;i<40;i++){write(0xb1b,5180);write(0xbc3,63);write(0xe8b,0);write(0xef3,0);write(0x102b,0);write(0x16d1,100);write(0x16d5,100);await waitFrames(1);}
 pause(true);setStatus('Native Jungle exit loaded · Burt guards the genuine map return.');
});

$('test-dkc-native-boss').addEventListener('click',async()=>{
 if(!debug||!dkcWorld||!game?.ready)return;
 resumeFromSettings();protectBossTest=true;
 if(game.isMap){controls.pulse(INPUT.b,performance.now());const began=performance.now();while(game.isMap){if(performance.now()-began>10000)return;await waitForNativeFrames(game.emulator.gameManager);}for(let i=0;i<90;i++)await waitForNativeFrames(game.emulator.gameManager);}
 const level=Number($<HTMLSelectElement>('test-native-arena').value);if(![0xe0,0xe1,0xe2,0xe3,0xe4,0xe5,0x68].includes(level))return;
 const w=game.wram,put=(p:number,v:number)=>{w[p]=v&255;w[p+1]=v>>8&255;};
 for(const[p,v]of[[0x3e,level],[0x40,level],[0x527,0],[0x50a,0x81e3],[0x50c,0],[0x508,0x8279]])put(p,v);
 setStatus('Native boss arena loading');
});
$('test-dkc-native-hit').addEventListener('click',()=>{
 if(!debug||!dkcWorld||!game?.ready)return;
 const w=game.wram,read=(p:number)=>w[p]|w[p+1]<<8,put=(p:number,v:number)=>{w[p]=v&255;w[p+1]=v>>8&255;};
 if(read(0x3e)!==0xe0)return;
 for(let slot=6;slot<0x34;slot+=2)if(read(0xd45+slot)===0x70){put(0x14f9+slot,1);const player=read(0x56f)===2?4:2;put(0xbc1+player,350);put(0x1595+slot,1);put(0x16d1+player-2,120);break;}
 resumeFromSettings();setStatus('Native final stomp requested · Victory remains original');
});

// Isolated DEV fixture: original 1-2 entrance and real goal crossing, then
// inject a free bubble during its actual handoff and save that native scene.
$('test-goal-save').addEventListener('click',async()=>{
 if(!import.meta.env.DEV||!debug||dkcWorld||!game?.ready)return;
 const active=game,m=active.emulator.gameManager,w=active.wram,g=active.gsu,read=(p:number)=>g[p]|g[p+1]<<8,put=(p:number,v:number)=>{g[p]=v&255;g[p+1]=v>>>8;};
 const until=async(test:()=>boolean)=>{const started=performance.now();while(!test()){if(performance.now()-started>12000)throw Error('Goal save fixture timed out');await waitForNativeFrames(m);}};
 try{
  resumeFromSettings();active.goToMap();w[0x218]=0;w[0x21a]=1;w.set([1,0xd9,0x79,0],0x17e00);w[0x38c]=1;w[0x38d]=0;w[0x38e]=0;w[0x38f]=0;w[0x118]=0xf;
  await until(()=>w[0x118]===0x13&&Boolean(active.adventure.guardian));const guardian=active.adventure.guardian!;guardian.hp=0;guardian.phase='exit';guardian.shots=[];active.character='mario';
  // Bypass only the added guardian in this test, never a native clear flag.
  put(0x8c,read(0x10e2+guardian.slot*4)+23);put(0x90,read(0x1182+guardian.slot*4)-80);put(0xb4,0x100);put(0xaa,0xfd00);put(0xc0,6);controls.activate('right',performance.now());
  await until(()=>w[0x118]===0x14);await until(()=>read(0x1978+guardian.slot*4)>=2);
  if((read(0x1b2)&0x8000)!==0)throw Error('The native handoff already completed; retry the fixture.');
  put(0x19d6,11);pause(true);await active.save();setStatus('Stalled 1-2 saved (DEV) · Reload to test recovery.');
 }catch(error){setStatus((error as Error).message);}
});
