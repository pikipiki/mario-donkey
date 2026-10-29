export type BossAudioWorld='dkc'|'yoshi';
export interface BossAudioEncounter {world:BossAudioWorld;id:string;phase:string;paused?:boolean}
export type BossEffect='attack'|'hit'|'defeat'|'land'|'laugh';
interface Track {file:string;loopStart:number;loopEnd:number;duration:number}
interface Cue {offset:number;duration:number}
interface MusicManifest {version:1;tracks:Record<string,Track>}
interface EffectManifest {version:1;effects:Record<string,Cue>}
/** Select the donor game's actual boss theme, not the current world theme. */
export function bossTrack(encounter:Pick<BossAudioEncounter,'world'|'id'>):string{
 return encounter.world==='dkc'?(encounter.id==='k-rool'?'k-rool':'dkc'):(encounter.id==='salvo'?'yoshi-major':'yoshi');
}
/** One music voice, at most four effects, and the emulator's existing iOS route.
 * sync() returns whether a theme is actually playing: only then suppress the
 * native background song. Never mute the emulator's volume / native egg FX. */
export class BossAudio {
 private context?:AudioContext;private generation=0;private manifest?:MusicManifest;
 private metaPending?:Promise<void>;private music=new Map<string,AudioBuffer>();private loading=new Map<string,Promise<void>>();private retryAt=new Map<string,number>();
 private effectBanks=new Map<BossAudioWorld,{buffer:AudioBuffer;cues:Record<string,Cue>}>();private effectsPending=new Map<BossAudioWorld,Promise<void>>();
 private source?:AudioBufferSourceNode;private gain?:GainNode;private key?:string;private track?:string;private offset=0;private began=0;
 private voices=new Set<AudioBufferSourceNode>();private recent=new Map<string,number>();
 private effectsEnabled=false;
 played=0;lastEffect?:string;
 prepare(context:AudioContext|undefined,world:BossAudioWorld='dkc',id=''):Promise<void>{
  if(!context||context.state==='closed')return Promise.resolve();
  if(context!==this.context){this.stop();this.context=context;this.generation++;this.manifest=undefined;this.metaPending=undefined;this.music.clear();this.loading.clear();this.retryAt.clear();this.effectBanks.clear();this.effectsPending.clear();}
  const name=bossTrack({world,id});return Promise.all([this.loadMusic(name),this.loadEffects(world)]).then(()=>{});
 }
 private async request(file:string):Promise<Response>{
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);
  try{const response=await fetch(`${import.meta.env.BASE_URL}audio/${file}`,{signal:abort.signal});if(!response.ok)throw Error('Boss audio unavailable');return response;}finally{clearTimeout(timer);}
 }
 private async loadMeta():Promise<void>{
  if(this.manifest||Date.now()<(this.retryAt.get('meta')??0))return;if(this.metaPending)return this.metaPending;const gen=this.generation;
  this.metaPending=(async()=>{try{const meta=await (await this.request('boss-music.json')).json() as MusicManifest;if(meta.version!==1||!meta.tracks)throw Error('Boss music metadata');if(gen===this.generation)this.manifest=meta;}catch{if(gen===this.generation)this.retryAt.set('meta',Date.now()+10000);}finally{if(gen===this.generation)this.metaPending=undefined;}})();return this.metaPending;
 }
 private loadMusic(name:string):Promise<void>{
  if(this.music.has(name)||Date.now()<(this.retryAt.get(`music:${name}`)??0))return Promise.resolve();const old=this.loading.get(name);if(old)return old;
  const gen=this.generation,context=this.context;
  const pending=(async()=>{try{await this.loadMeta();const track=this.manifest?.tracks[name];if(!context||!track||!/^boss-[a-z-]+\.mp3$/.test(track.file))return;
   const buffer=await context.decodeAudioData(await (await this.request(track.file)).arrayBuffer());
   if(!Number.isFinite(track.loopStart)||!Number.isFinite(track.loopEnd)||track.loopStart<0||track.loopEnd<=track.loopStart||track.loopEnd>buffer.duration+.15)throw Error('Boss loop bounds');
   if(gen===this.generation)this.music.set(name,buffer);
  }catch{if(gen===this.generation)this.retryAt.set(`music:${name}`,Date.now()+10000);}finally{if(gen===this.generation)this.loading.delete(name);}})();this.loading.set(name,pending);return pending;
 }
 private loadEffects(world:BossAudioWorld):Promise<void>{
  if(this.effectBanks.has(world)||Date.now()<(this.retryAt.get(`effects:${world}`)??0))return Promise.resolve();const old=this.effectsPending.get(world);if(old)return old;const gen=this.generation,context=this.context;
  const prefix=world==='yoshi'?'boss-yoshi-effects':'boss-effects';
  const pending=(async()=>{try{const [meta,response]=await Promise.all([this.request(`${prefix}.json`),this.request(`${prefix}.wav`)]);const cues=await meta.json() as EffectManifest;
   const buffer=await context!.decodeAudioData(await response.arrayBuffer());if(cues.version!==1||!cues.effects||Object.values(cues.effects).some(c=>!Number.isFinite(c.offset)||!Number.isFinite(c.duration)||c.offset<0||c.duration<=0||c.offset+c.duration>buffer.duration+.001))throw Error('Boss effect metadata');
   if(gen===this.generation)this.effectBanks.set(world,{buffer,cues:cues.effects});
  }catch{if(gen===this.generation)this.retryAt.set(`effects:${world}`,Date.now()+10000);}finally{if(gen===this.generation)this.effectsPending.delete(world);}})();this.effectsPending.set(world,pending);return pending;
 }
 sync(context:AudioContext|undefined,encounter?:BossAudioEncounter):boolean{
  if(!encounter||!['intro','fight','dying'].includes(encounter.phase)){this.stop();return false;}
  void this.prepare(context,encounter.world,encounter.id);
  const key=`${encounter.world}:${encounter.id}`,track=bossTrack(encounter);
  if(this.key!==key){this.stop();this.key=key;this.track=track;}
  if(encounter.paused||context?.state!=='running'){this.pause();return false;}
  this.effectsEnabled=true;
  if(this.source)return true;
  const buffer=this.music.get(track),cue=this.manifest?.tracks[track];if(!context||!buffer||!cue)return false;
  try{
   const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=true;source.loopStart=cue.loopStart;source.loopEnd=Math.min(cue.loopEnd,buffer.duration);gain.gain.value=.65;
   source.connect(gain);gain.connect(context.destination);
   if(this.offset>=source.loopEnd)this.offset=source.loopStart+(this.offset-source.loopStart)%(source.loopEnd-source.loopStart);
   source.start(0,this.offset);this.source=source;this.gain=gain;this.began=context.currentTime;return true;
  }catch{this.source=undefined;this.gain=undefined;return false;}
 }
 effect(kind:BossEffect,id=''):boolean{
  const world=this.key?.startsWith('yoshi:')?'yoshi':'dkc';
  const name=world==='yoshi'?(kind==='attack'?'yoshi-jump':kind==='hit'?'yoshi-hit':kind==='land'?'yoshi-land':'yoshi-defeat'):kind==='attack'?'boss-throw':kind==='hit'?'boss-hit':kind==='land'?'boss-land':kind==='laugh'?'boss-laugh':id==='necky'||id==='necky-snr'?'necky-defeat':'boss-stomp';
  const bank=this.effectBanks.get(world),context=this.context,buffer=bank?.buffer,cue=bank?.cues[name];if(!this.effectsEnabled||!context||context.state!=='running'||!buffer||!cue||this.voices.size>=4)return false;
  if(context.currentTime-(this.recent.get(name)??-Infinity)<.09)return false;
  try{const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=.85;source.connect(gain);gain.connect(context.destination);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start(0,cue.offset,cue.duration);this.recent.set(name,context.currentTime);this.lastEffect=name;this.played++;return true;}catch{return false;}
 }
 pause():void{
  this.effectsEnabled=false;
  if(this.source){this.offset+=Math.max(0,(this.context?.currentTime??this.began)-this.began);try{this.source.stop();}catch{}this.source.disconnect();this.gain?.disconnect();this.source=undefined;this.gain=undefined;}
  for(const source of this.voices){try{source.stop();}catch{}source.disconnect();}this.voices.clear();this.recent.clear();
 }
 stop():void{this.pause();this.key=undefined;this.track=undefined;this.offset=0;}
 get playing():boolean{return Boolean(this.source);}
}
