import './style.css';
import { Controls,type Button } from './controls';
import { launch } from './engine';
import { LiveGame } from './game';
import { SpriteAtlas } from './atlas';
import { ANIMALS,type Character,type Mount } from './adventure';
import { ROM_SHA256,patchYoshiDrawing } from './profile';
import { loadFile,storeFile } from './storage';
const animalNames:Record<string,string>={foot:'À pied',yoshi:'Yoshi',rambi:'Rambi',winky:'Winky',expresso:'Expresso',enguarde:'Enguarde',squawks:'Squawks'};
const base=import.meta.env.BASE_URL;
const debug=import.meta.env.DEV&&new URLSearchParams(location.search).has('debug');
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<main class="shell">
 <header class="topbar"><div class="brand">Kong <span>× Yoshi</span><small id="stage-name">L’aventure originale</small></div>
  <button id="skip" class="tool skip" disabled aria-label="Passer le dialogue ou les instructions">Passer <span aria-hidden="true">≫</span></button>
  <button id="pause" class="tool" disabled aria-label="Mettre en pause"><span aria-hidden="true">Ⅱ</span></button>
  <button id="fullscreen" class="tool" aria-label="Afficher en plein écran"><span aria-hidden="true">⛶</span></button>
  <button id="options" class="tool" aria-label="Options et commandes SNES"><span aria-hidden="true">☰</span></button>
 </header>
 <section class="game-layout" aria-label="Le jeu et ses commandes">
  <div class="play-column"><div class="screen-frame"><div class="screen">
   <div id="emulator" aria-label="Écran du jeu SNES"></div><canvas id="actor" width="256" height="239" aria-hidden="true"></canvas>
   <div id="welcome" class="welcome"><p class="eyebrow">DONKEY KONG COUNTRY × YOSHI’S ISLAND</p><h1>Une île.<br>Toute une aventure.</h1><p class="intro">Les vrais Kong. Le monde de Yoshi.</p><button id="play" class="play-button" disabled>Jouer / continuer <span aria-hidden="true">↗</span></button></div>
   <div id="loading" class="loading" hidden><span aria-hidden="true">✳</span><p>Préparation de l’aventure…</p></div>
  </div></div></div>
  <aside class="controller" aria-label="Commandes tactiles">
   <div class="party-row"><div class="character-picker" role="group" aria-label="Choisir le personnage"><button data-character="dk" class="character selected" aria-pressed="true"><img src="${base}art/portraits/dk.png" alt=""><span>Donkey</span></button><button data-character="diddy" class="character" aria-pressed="false"><img src="${base}art/portraits/diddy.png" alt=""><span>Diddy<small id="partner-status"></small></span></button></div><label class="mount-picker"><span>Compagnon</span><select id="mount" aria-label="Choisir la monture"><option value="foot">À pied</option><option value="yoshi">Yoshi</option></select></label></div>
   <div class="direction-pad" role="group" aria-label="Déplacement"><button data-control="left" aria-label="Aller à gauche" aria-pressed="false"><span aria-hidden="true">←</span></button><button data-control="stop" class="stop-button" aria-label="Arrêter le déplacement"><span aria-hidden="true">■</span><small>STOP</small></button><button data-control="right" aria-label="Aller à droite" aria-pressed="false"><span aria-hidden="true">→</span></button></div>
   <div class="action-pad"><button data-control="jump" class="jump-button"><span aria-hidden="true">↗</span><strong>Sauter</strong><small>et planer</small></button><button data-control="roll" class="roll-button"><span aria-hidden="true">↻</span><strong>Roulade</strong><small>attaquer</small></button><button data-control="tongue" class="tongue-button"><span aria-hidden="true">⌁</span><strong>Langue</strong><small>attraper</small></button><button data-control="egg" class="egg-button"><span aria-hidden="true">◉</span><strong id="egg-label">Œuf</strong><small id="egg-hint">viser / tirer · V</small></button><button data-control="up" class="vertical-button"><span aria-hidden="true">↑</span><strong>Haut</strong><small>portes / viser</small></button><button data-control="down" class="vertical-button"><span aria-hidden="true">↓</span><strong>Bas</strong><small>avaler / écraser</small></button></div>
  </aside>
 </section>
 <p id="status" class="status" role="status" aria-live="polite">Chargement du jeu…</p>
 <dialog id="settings" aria-labelledby="settings-title"><div class="sheet-heading"><h2 id="settings-title">À ton rythme.</h2><button id="close-settings" class="tool" aria-label="Fermer les options">×</button></div><p class="sheet-hint">Un appui sur une flèche pour avancer. STOP pour s’arrêter. La roulade avance toute seule. Œuf : un appui pour viser, un second pour tirer. Pour en fabriquer : Langue sur un ennemi, puis Bas. V au clavier pour viser et tirer, flèche Bas pour avaler.</p><label class="setting"><span>Commandes à un doigt</span><input id="sticky" type="checkbox" checked></label><label class="setting"><span>Passer les instructions automatiquement</span><input id="auto-skip" type="checkbox"></label><button id="sound" class="sheet-button">♪ Activer le son du jeu</button><button id="save" class="sheet-button" disabled>Enregistrer ma partie</button><p class="sheet-hint">La campagne et tes compagnons se sauvegardent aussi automatiquement sur cet appareil.</p><details><summary>Commandes SNES supplémentaires</summary><div class="native-buttons">${[['Y',1],['B',0],['A',8],['X',9],['L',10],['R',11],['Start',3],['Select',2]].map(([label,id])=>`<button data-native="${id}">${label}</button>`).join('')}</div><p class="sheet-hint">Clavier : flèches, Espace saut, X roulade, C langue, V œuf, Échap pause.</p></details><details id="debug" ${debug?'':'hidden'}><summary>Diagnostic de développement</summary><pre id="diagnostic"></pre><button id="test-wall">Placer un mur cassable (test)</button><button id="test-reset">Repartir au début (test)</button><button id="test-egg">Fabriquer un œuf natif (test)</button><button id="test-hit">Rejoindre un Shy Guy</button><button id="test-roll">Roulade sur Shy Guy</button><button id="test-dialogue">Ouvrir une instruction native (test)</button><button id="test-unlock">Débloquer les compagnons (test)</button></details></dialog>
</main>`;
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const controls=new Controls();let rom:Uint8Array|undefined,game:LiveGame|undefined,starting=false,menuResume=false;
const setStatus=(message:string)=>{$('status').textContent=message;$('loading').querySelector('p')!.textContent=message;};
function syncParty():void{
 const a=game?.adventure;
 document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(b=>{const char=b.dataset.character as Character,active=(a?.active??'dk')===char;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));b.disabled=a?!a.available.includes(char):false;});
 $('partner-status').textContent=a?.available.includes('diddy')?'':'';
 const mounts:Mount[]=['foot','yoshi',...(a?.animals??[])];const select=$<HTMLSelectElement>('mount');select.innerHTML=mounts.map(m=>`<option value="${m}">${animalNames[m]}</option>`).join('');select.value=a?.mount??'foot';
 if(game?.ready)$('stage-name').textContent=game.stageLabel;
}
async function acceptRom(bytes:Uint8Array):Promise<void>{
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==ROM_SHA256)throw new Error('ROM du jeu invalide ou incomplète.');
 patchYoshiDrawing(bytes); // Validate the exact draw routine, without patching the source ROM.
 rom=bytes;await storeFile('rom',bytes).catch(()=>{});if(!starting){setStatus('Prêt · Jouer reprend ta partie enregistrée.');$<HTMLButtonElement>('play').disabled=false;}
}
async function loadBundledRom():Promise<void>{
 const url=import.meta.env.DEV&&import.meta.env.VITE_DEV_ROM_URL?import.meta.env.VITE_DEV_ROM_URL:`${base}rom/yoshi-eu.sfc`;
 const r=await fetch(url);if(!r.ok)throw new Error('Impossible de charger le jeu.');
 await acceptRom(new Uint8Array(await r.arrayBuffer()));
}
void loadBundledRom().catch(e=>setStatus((e as Error).message));
$('play').addEventListener('click',async()=>{
 if(starting)return;if(game&&!game.ready){location.reload();return;}if(!rom){setStatus('Le jeu est encore en chargement…');return;}
 starting=true;$('welcome').hidden=true;$('loading').hidden=false;
 try{const atlas=await SpriteAtlas.load();const emulator=await launch(rom,setStatus);game=new LiveGame(emulator,controls,$<HTMLCanvasElement>('actor'),atlas,setStatus,syncParty);game.autoSkip=$<HTMLInputElement>('auto-skip').checked;await game.prepare();$('loading').hidden=true;
  for(const id of ['pause','skip','save'])$<HTMLButtonElement>(id).disabled=false;
  await game.unlockAudio().catch(()=>{});if(game.audio?.state!=='running')setStatus('Appuie sur ♪ Son dans les options pour activer l’audio.');syncParty();
 }catch(e){console.error('KONG_START_ERROR',e);setStatus((e as Error).message);$('loading').hidden=true;$('welcome').hidden=false;if(game){game.setPaused(true);$('play').textContent='Recharger la page';}starting=false;}
});
document.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(b=>b.addEventListener('click',()=>{if(game)game.character=b.dataset.character as Character;}));
$('mount').addEventListener('change',e=>{const select=e.target as HTMLSelectElement;game?.stop();game?.mount(select.value as Mount);select.blur();});
function refreshButtons():void{const d=controls.movement(performance.now());document.querySelectorAll<HTMLElement>('[data-control="left"],[data-control="right"]').forEach(b=>{const value=String(b.dataset.control===(d<0?'left':d>0?'right':''));if(b.getAttribute('aria-pressed')!==value)b.setAttribute('aria-pressed',value);});}
document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach(b=>{
 let pointerHandled=false;
 const activate=()=>{if(game?.ready&&!game.paused){void game.unlockAudio().catch(()=>{});controls.activate(b.dataset.control as Button,performance.now());refreshButtons();}};
 b.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch{}pointerHandled=true;activate();});b.addEventListener('pointerup',()=>{controls.release(b.dataset.control as Button);refreshButtons();});b.addEventListener('pointercancel',()=>{pointerHandled=false;game?.stop();refreshButtons();});b.addEventListener('click',e=>{if(e.detail===0||!pointerHandled)activate();pointerHandled=false;});
});
function pause(value:boolean):void{game?.setPaused(value);$('pause').innerHTML=value?'▶':'Ⅱ';$('pause').setAttribute('aria-label',value?'Reprendre le jeu':'Mettre en pause');refreshButtons();}
$('pause').addEventListener('click',()=>{if(game)pause(!game.paused);});$('skip').addEventListener('click',()=>{if(game?.paused)pause(false);game?.skipDialogue();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{setStatus('Le jeu occupe tout l’espace disponible dans ce navigateur.');}});
const settings=$<HTMLDialogElement>('settings');
function closeSettings():void{settings.close();if(menuResume)pause(false);menuResume=false;}
$('options').addEventListener('click',()=>{menuResume=Boolean(game?.ready&&!game.paused);if(menuResume)pause(true);settings.showModal();});$('close-settings').addEventListener('click',closeSettings);settings.addEventListener('cancel',e=>{e.preventDefault();closeSettings();});
$<HTMLInputElement>('sticky').addEventListener('change',e=>{controls.stop();controls.sticky=(e.target as HTMLInputElement).checked;refreshButtons();});
$<HTMLInputElement>('auto-skip').addEventListener('change',e=>{if(game)game.autoSkip=(e.target as HTMLInputElement).checked;});
$('sound').addEventListener('click',()=>{void game?.unlockAudio().then(()=>setStatus(game?.audio?.state==='running'?'Son du jeu activé.':'Le navigateur attend une interaction pour activer l’audio.'));});
$('save').addEventListener('click',()=>{void game?.save();});
document.querySelectorAll<HTMLButtonElement>('[data-native]').forEach(b=>b.addEventListener('click',()=>{const button=Number(b.dataset.native);closeSettings();controls.pulse(button,performance.now());}));
const keys=new Set<string>();const keyActions:Record<string,Button>={Space:'jump',KeyX:'roll',KeyC:'tongue',KeyV:'egg',ArrowUp:'up',ArrowDown:'down'};
window.addEventListener('keydown',e=>{
 if((e.target as HTMLElement)?.matches('input,select,textarea')||settings.open)return;
 if((e.code==='Space'||e.code==='Enter')&&(e.target as HTMLElement)?.closest('button,summary,a'))return;
 if(e.code==='Escape'&&game){e.preventDefault();pause(!game.paused);return;}
 if(e.code==='ArrowLeft'||e.code==='ArrowRight'||keyActions[e.code]){e.preventDefault();if(e.repeat)return;keys.add(e.code);controls.keyboardDirection=keys.has('ArrowLeft')?-1:keys.has('ArrowRight')?1:0;if(controls.keyboardDirection)controls.facing=controls.keyboardDirection;if(keyActions[e.code])controls.activate(keyActions[e.code],performance.now());}
});
window.addEventListener('keyup',e=>{keys.delete(e.code);controls.keyboardDirection=keys.has('ArrowLeft')?-1:keys.has('ArrowRight')?1:0;});
window.addEventListener('blur',()=>{keys.clear();game?.stop();controls.stop();refreshButtons();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&game?.ready)pause(true);});
$('test-wall').addEventListener('click',()=>{if(!debug||!game?.ready)return;closeSettings();if(game.paused)pause(false);game.stop();setStatus(`${game.testWall()} blocs de test placés. Roulade pour les briser.`);});
$('test-reset').addEventListener('click',async()=>{if(!debug||!game)return;const state=await loadFile('campaign-original-eu-start-v2-snes9x-2.0.2');if(!state)return;closeSettings();game.stop();game.emulator.gameManager.loadState(state);});
$('test-egg').addEventListener('click',()=>{if(!debug||!game?.ready)return;closeSettings();game.stop();const g=game.gsu,read=(a:number)=>g[a]|g[a+1]<<8,write=(a:number,v:number)=>{g[a]=v&255;g[a+1]=v>>>8;};for(let i=0;i<24;i++){const o=i*4;if(read(0x1360+o)===0x1e&&read(0xf00+o)===0x10){write(0x8c,read(0x10e2+o)-40);write(0x90,read(0x1182+o));write(0xb4,0);write(0xaa,0);write(0xc4,0);write(0x1d6,240);controls.facing=1;controls.activate('tongue',performance.now());setTimeout(()=>controls.activate('down',performance.now()),700);break;}}});
$('test-hit').addEventListener('click',()=>{if(!debug||!game?.ready)return;closeSettings();game.stop();game.gsu[0x8c]=0xd0;game.gsu[0x8d]=1;game.gsu[0x90]=0x70;game.gsu[0x91]=7;});
$('test-roll').addEventListener('click',()=>{if(!debug||!game?.ready)return;closeSettings();game.stop();const g=game.gsu,read=(a:number)=>g[a]|g[a+1]<<8,write=(a:number,v:number)=>{g[a]=v&255;g[a+1]=v>>>8;};for(let i=0;i<24;i++){const o=i*4;if(read(0x1360+o)===0x1e&&read(0xf00+o)===0x10){write(0x8c,read(0x10e2+o)-24);write(0x90,read(0x1182+o));write(0xb4,0);write(0xaa,0);controls.facing=1;controls.activate('roll',performance.now());break;}}});
$('test-dialogue').addEventListener('click',()=>{if(!debug||!game?.ready||game.wram[0x118]!==0x13)return;closeSettings();if(game.paused)pause(false);game.stop();game.wram[0xd11]=1;game.gsu[0x4070]=0x2c;game.gsu[0x4071]=0;});
$('test-unlock').addEventListener('click',()=>{if(!debug||!game)return;game.adventure.available=['dk','diddy'];game.adventure.animals=[...ANIMALS];syncParty();});
let lastDiagnostic=0;function frame():void{const now=performance.now();game?.tick(now);refreshButtons();if(game?.ready){const n=game.eggCount,aiming=game.aiming;$('egg-label').textContent=aiming?'Tirer':`Œufs · ${n}`;$('egg-hint').textContent=aiming?'appuyer / V':n?'viser / V':'Langue puis Bas';}if(debug&&game?.ready&&now-lastDiagnostic>500){$('diagnostic').textContent=JSON.stringify(game.diagnostics(),null,2);lastDiagnostic=now;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
