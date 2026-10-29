import './style.css';
import {installGameTouchGuards} from './touch';
import { Controls,type Button } from './controls';
import { launch,primeAudio,waitForNativeFrames } from './engine';
import { LiveGame } from './game';
import {isWorldMap,isWorldTab,needsLevelReturn} from './menu';
import { SpriteAtlas } from './atlas';
import { ANIMALS,CHARACTERS,type Character,type Mount } from './adventure';
import { ROM_SHA256,patchYoshiDrawing } from './profile';
import { loadFile,storeFile } from './storage';
const animalNames:Record<string,string>={foot:'On foot',yoshi:'Yoshi',rambi:'Rambi',winky:'Winky',expresso:'Expresso',enguarde:'Enguarde',squawks:'Squawks'};
const base=import.meta.env.BASE_URL;
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
   <div id="welcome" class="welcome"><p class="eyebrow">DONKEY KONG COUNTRY × YOSHI’S ISLAND</p><h1>One island.<br>A whole adventure.</h1><p class="intro">PlushGoonk and the Kongs. Yoshi’s world.</p><button id="play" class="play-button" disabled>Play / continue <span aria-hidden="true">↗</span></button></div>
   <div id="loading" class="loading" hidden><span aria-hidden="true">✳</span><p>Getting the adventure ready…</p></div>
  </div></div></div>
  <aside class="controller" aria-label="Touch controls">
   <div class="stick-wrap"><div id="stick" class="stick" role="group" aria-label="Move in every direction"><div id="stick-nub" class="stick-nub"></div></div></div>
   <div class="hud-side"><div class="party-row"><div class="character-picker" role="group" aria-label="Choose a character">${CHARACTERS.map(char=>`<button data-character="${char}" class="character ${char==='violet'?'selected':''}" aria-pressed="${char==='violet'}">${char==='violet'||char==='pink'?`<span class="plush-portrait ${char}" aria-hidden="true"></span>`:`<img src="${base}art/portraits/${char}.png" alt="">`}<span>${({violet:'Violet',pink:'Pink',dk:'Donkey',diddy:'Diddy'})[char]}${char==='diddy'?'<small id="partner-status"></small>':''}</span></button>`).join('')}</div><label class="character-select"><span>Character</span><select id="character" aria-label="Choose a character">${CHARACTERS.map(char=>`<option value="${char}">${({violet:'PlushGoonk violet',pink:'PlushGoonk rose',dk:'Donkey',diddy:'Diddy'})[char]}</option>`).join('')}</select></label><label class="mount-picker"><span>Partner</span><select id="mount" aria-label="Choose a mount"><option value="foot">On foot</option><option value="yoshi">Yoshi</option></select></label></div>
   <div class="action-pad"><button data-control="jump" class="jump-button"><span aria-hidden="true">↗</span><strong id="jump-label">Jump</strong><small id="jump-hint">normal jump</small></button><button data-control="roll" class="roll-button"><span aria-hidden="true">↻</span><strong>Roll</strong><small>attack</small></button><button data-control="tongue" class="tongue-button"><span aria-hidden="true">⌁</span><strong id="tongue-label">Tongue</strong><small id="tongue-hint">up: stick, then tap</small></button><button data-control="egg" class="egg-button"><span aria-hidden="true">◉</span><strong id="egg-label">Egg</strong><small id="egg-hint">throw · confirm · V</small></button></div></div>
  </aside>
 </section>
 <p id="status" class="status" role="status" aria-live="polite">Loading the game…</p>
 <dialog id="settings" aria-labelledby="settings-title"><div class="sheet-heading"><h2 id="settings-title">At your pace.</h2><button id="close-settings" class="tool" aria-label="Close options">×</button></div><p class="sheet-hint">On the map, Up selects the world tabs and Down returns to the levels. Levels ↓ also returns from the current world tab. Unlocked stages and worlds can be selected with Left/Right. Hold the stick to move. Release it to stop. Hold Jump to flutter on Yoshi; the Kongs on foot have a normal jump. Walking after release is optional: enable Keep walking below, then touch the center to stop. The roll keeps moving on its own. To grab Baby Mario above you: push the stick up, release, then tap Tongue within two seconds. An egg can also bring his bubble closer. Egg: tap once to aim, again to throw, and tap it to confirm on-screen text. To make one: Tongue an enemy, then down on the stick. V aims, throws and confirms, arrow keys move.</p><label class="setting"><span>Keep walking after release</span><input id="sticky" type="checkbox"></label><label class="setting"><span>Keep Baby Mario on screen</span><input id="baby-visibility" type="checkbox" checked aria-describedby="baby-visibility-hint"></label><p id="baby-visibility-hint" class="sheet-hint">Slows his bubble near the top edge. Turn off for the original flight. The countdown stays the same.</p><label class="setting"><span>Skip instructions automatically</span><input id="auto-skip" type="checkbox"></label><button id="sound" class="sheet-button">♪ Enable game sound</button><button id="save" class="sheet-button" disabled>Save my game</button><button id="level-map" class="sheet-button" disabled>Choose a level · World map</button><button id="repair-display" class="sheet-button" disabled>Repair display · Return to map</button><p class="sheet-hint">If the image is scrambled: rebuild the map. Completed stages and partners stay saved; the current stage starts again. A copy of the previous state is kept on this device.</p><p class="sheet-hint">The campaign and your partners also save automatically on this device.</p><details><summary>More SNES buttons</summary><div class="native-buttons">${[['Y',1],['B',0],['A',8],['X',9],['L',10],['R',11],['Start',3],['Select',2]].map(([label,id])=>`<button data-native="${id}">${label}</button>`).join('')}</div><p class="sheet-hint">Keyboard: arrows, Space jump, X roll, C tongue, V egg or confirm, Esc pause.</p></details><details id="debug" ${debug?'':'hidden'}><summary>Development diagnostics</summary><pre id="diagnostic"></pre><button id="test-wall">Place a breakable wall (test)</button><button id="test-reset">Restart from the beginning (test)</button><button id="test-egg">Make a native egg (test)</button><button id="test-hit">Walk up to a Shy Guy</button><button id="test-roll">Roll into a Shy Guy</button><button id="test-dialogue">Open a native instruction (test)</button><button id="test-unlock">Unlock partners (test)</button><button id="test-audio">Check native audio signal (test)</button><button id="test-goal">Approach the 1-1 goal (test)</button></details></dialog>
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
 document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(b=>{const char=b.dataset.character as Character,active=(a?.active??'violet')===char;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));b.disabled=a?!a.available.includes(char):false;});
 const character=$<HTMLSelectElement>('character');character.value=a?.active??'violet';character.querySelectorAll('option').forEach(o=>{o.disabled=a?!a.available.includes(o.value as Character):false;});
 $('partner-status').textContent=a?.available.includes('diddy')?'':'';
 const mounts:Mount[]=['foot','yoshi',...(a?.animals??[])];const select=$<HTMLSelectElement>('mount');select.innerHTML=mounts.map(m=>`<option value="${m}">${animalNames[m]}</option>`).join('');select.value=a?.mount??'foot';
 $('jump-hint').textContent=a?.mount==='yoshi'?'hold to flutter':a?.mount==='squawks'?'hold to fly':'normal jump';
 if(game?.ready)$('stage-name').textContent=game.stageLabel;
}
async function acceptRom(bytes:Uint8Array):Promise<void>{
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==ROM_SHA256)throw new Error('This game data is invalid or incomplete.');
 patchYoshiDrawing(bytes); // Validate the exact draw routine, without patching the source ROM.
 rom=bytes; // Bundled ROM loads independently of iOS/private storage availability.
 void storeFile('rom',bytes).catch(()=>{});if(!starting){setStatus('Ready · Play resumes your saved game.');$<HTMLButtonElement>('play').disabled=false;}
}
async function loadBundledRom():Promise<void>{
 const url=import.meta.env.DEV&&import.meta.env.VITE_DEV_ROM_URL?import.meta.env.VITE_DEV_ROM_URL:`${base}rom/yoshi-eu.sfc`;
 const r=await fetch(url);if(!r.ok)throw new Error('Couldn’t load the game.');
 await acceptRom(new Uint8Array(await r.arrayBuffer()));
}
void loadBundledRom().catch(e=>setStatus((e as Error).message));
$('play').addEventListener('click',async()=>{
 if(starting)return;if(game&&!game.ready){location.reload();return;}if(!rom){setStatus('The game is still loading…');return;}
 primeAudio();
 starting=true;$('welcome').hidden=true;$('loading').hidden=false;setStatus('Loading the SNES core…');
 try{const atlas=await SpriteAtlas.load();const emulator=await launch(rom,setStatus);game=new LiveGame(emulator,controls,$<HTMLCanvasElement>('actor'),atlas,setStatus,syncParty);game.autoSkip=$<HTMLInputElement>('auto-skip').checked;game.keepBabyOnScreen=$<HTMLInputElement>('baby-visibility').checked;await game.prepare();$('loading').hidden=true;
  for(const id of ['pause','skip','save','sound-quick','level-map','repair-display'])$<HTMLButtonElement>(id).disabled=false;
  await game.unlockAudio().catch(()=>{});if(game.audio?.state!=='running')setStatus('Tap ♪ at the top to enable sound.');syncParty();
 }catch(e){console.error('KONG_START_ERROR',e);setStatus((e as Error).message);$('loading').hidden=true;$('welcome').hidden=false;if(game){game.setPaused(true);$('play').textContent='Reload the page';$<HTMLButtonElement>('repair-display').disabled=!game.canRepairDisplay;}starting=false;}
});
function releaseUiFocus(target:EventTarget|null):void{const el=target instanceof HTMLElement?target:document.activeElement;if(el instanceof HTMLElement&&el.matches('button,select')&&!el.closest('dialog'))el.blur();}
document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(b=>b.addEventListener('click',()=>{if(game)game.character=b.dataset.character as Character;releaseUiFocus(b);}));
$('character').addEventListener('change',e=>{const select=e.target as HTMLSelectElement;if(game)game.character=select.value as Character;releaseUiFocus(select);});
$('mount').addEventListener('change',e=>{const select=e.target as HTMLSelectElement;game?.stop();game?.mount(select.value as Mount);releaseUiFocus(select);});
function refreshButtons():void{}
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
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{setStatus('The game already uses all the space in this browser.');}releaseUiFocus($('fullscreen'));});
const settings=$<HTMLDialogElement>('settings');
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
 if(target?.matches('input,select,textarea')||settings.open)return;
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
window.addEventListener('pagehide',suspendGame);
$('test-wall').addEventListener('click',()=>{if(!debug||!game?.ready)return;closeSettings();if(game.paused)pause(false);game.stop();setStatus(`${game.testWall()} test blocks placed. Roll to break them.`);});
$('test-reset').addEventListener('click',async()=>{if(!debug||!game)return;const state=await loadFile('campaign-eu-map-v3-snes9x-2.0.2');if(!state)return;closeSettings();game.stop();game.emulator.gameManager.loadState(state);});
$('test-egg').addEventListener('click',()=>{if(!debug||!game?.ready)return;closeSettings();game.stop();const g=game.gsu,read=(a:number)=>g[a]|g[a+1]<<8,write=(a:number,v:number)=>{g[a]=v&255;g[a+1]=v>>>8;};for(let i=0;i<24;i++){const o=i*4;if(read(0x1360+o)===0x1e&&read(0xf00+o)===0x10){write(0x8c,read(0x10e2+o)-40);write(0x90,read(0x1182+o));write(0xb4,0);write(0xaa,0);write(0xc4,0);write(0x1d6,0x3f);controls.facing=1;controls.activate('tongue',performance.now());setTimeout(()=>controls.activate('down',performance.now()),700);break;}}});
$('test-hit').addEventListener('click',()=>{if(!debug||!game?.ready)return;closeSettings();game.stop();game.gsu[0x8c]=0xd0;game.gsu[0x8d]=1;game.gsu[0x90]=0x70;game.gsu[0x91]=7;});
$('test-roll').addEventListener('click',()=>{if(!debug||!game?.ready)return;closeSettings();game.stop();const g=game.gsu,read=(a:number)=>g[a]|g[a+1]<<8,write=(a:number,v:number)=>{g[a]=v&255;g[a+1]=v>>>8;};for(let i=0;i<24;i++){const o=i*4;if(read(0x1360+o)===0x1e&&read(0xf00+o)===0x10){write(0x8c,read(0x10e2+o)-24);write(0x90,read(0x1182+o));write(0xb4,0);write(0xaa,0);controls.facing=1;controls.activate('roll',performance.now());break;}}});
$('test-dialogue').addEventListener('click',()=>{if(!debug||!game?.ready||game.wram[0x118]!==0x13)return;closeSettings();if(game.paused)pause(false);game.stop();game.wram[0xd11]=1;game.gsu[0x4070]=0x2c;game.gsu[0x4071]=0;});
$('test-unlock').addEventListener('click',()=>{if(!debug||!game)return;game.adventure.available=[...CHARACTERS];game.adventure.animals=[...ANIMALS];syncParty();});
let lastDiagnostic=0;
function frame():void{
 const now=performance.now();game?.tick(now);refreshButtons();
 if(game?.ready){
  const map=isWorldMap(game.wram),returnToLevels=needsLevelReturn(game.wram);
  const mapLabel=returnToLevels?'Levels ↓':'Enter';
  const mapHint=returnToLevels?'back to the level grid':isWorldTab(game.wram)?'selected world':'selected level';
  $('jump-label').textContent=map?mapLabel:'Jump';
  $('jump-hint').textContent=map?mapHint:game.adventure.mount==='yoshi'?'hold to flutter':game.adventure.mount==='squawks'?'hold to fly':'normal jump';
  const up=controls.tongueAimingUp(now);$('tongue-label').textContent=up?'Tongue ↑':'Tongue';$('tongue-hint').textContent=up?'aimed up':'up: stick, then tap';
  const n=game.eggCount,aiming=game.aiming;
  $('egg-label').textContent=map?mapLabel:game.messageOpen?'OK':aiming?'Throw':`Eggs · ${n}`;
  $('egg-hint').textContent=map?mapHint:game.messageOpen?'confirm':aiming?'press / V':n?'aim / V':'Tongue then Down';
 }
 if(debug&&game?.ready&&now-lastDiagnostic>500){$('diagnostic').textContent=JSON.stringify(game.diagnostics(),null,2);lastDiagnostic=now;}
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
 if(!debug||!game?.ready||game.wram[0x21a]!==0)return;
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
  game.goToMap();await wait(0x26);controls.pulse(0,performance.now());await wait(0x13);game.gsu[0x1d6]=0x3f;game.gsu[0x1d7]=0;
  pause(true);setStatus('Native goal approach loaded · Resume to test the ring.');
 }catch(e){setStatus((e as Error).message);}
 finally{for(const p of sites)heap.set(signature,p);}
});
