import{soundOutput}from'./sound-preference';
import {ANIMALS,type Animal,type Mount} from './adventure';
export const ANIMAL_EFFECTS=['rambi-land','rambi-pant','crate-open','rambi-step-1','rambi-step-2','animal-hit','rambi-attack','enguarde-attack','animal-mount','wing-flap','animal-jump'] as const;
export type AnimalEffect=typeof ANIMAL_EFFECTS[number];
export const isAnimalMount=(mount:Mount):mount is Animal=>(ANIMALS as readonly string[]).includes(mount);
export interface AnimalSoundFrame {mount:Mount;room:string;x:number;y:number;airborne:boolean;vy:number;enabled:boolean;rolling:boolean;flying:boolean;hit:boolean}
/** Observe real motion, not Jump taps: blocked jumps and menus stay silent. */
export class AnimalSoundTracker {
 private previous?:AnimalSoundFrame;private distance=0;private step=0;private nextStep=0;private nextFlap=0;private idleSince=0;private nextPant=0;
 reset():void{this.previous=undefined;this.distance=0;this.nextFlap=0;this.nextStep=0;this.idleSince=0;this.nextPant=0;}
 update(frame:AnimalSoundFrame,now:number):AnimalEffect[]{
  if(!frame.enabled||!isAnimalMount(frame.mount)){this.reset();return[];}
  const before=this.previous;this.previous=frame;
  if(!before||before.mount!==frame.mount||before.room!==frame.room||Math.abs(frame.x-before.x)>48||Math.abs(frame.y-before.y)>64){
   this.distance=0;this.idleSince=now;this.nextPant=now+4000;
   // An attack can start in the very first frame after selecting a mount.
   return frame.rolling?(frame.mount==='rambi'?['rambi-attack']:frame.mount==='enguarde'?['enguarde-attack']:[]):[];
  }
  const sounds:AnimalEffect[]=[],moving=Math.abs(frame.x-before.x)>0;
  if(!before.airborne&&frame.airborne&&frame.vy<0&&frame.mount!=='squawks')sounds.push('animal-jump');
  if(before.airborne&&!frame.airborne&&frame.mount==='rambi')sounds.push('rambi-land');
  if(frame.rolling&&!before.rolling){if(frame.mount==='rambi')sounds.push('rambi-attack');else if(frame.mount==='enguarde')sounds.push('enguarde-attack');}
  if(frame.hit)sounds.push('animal-hit');
  if(frame.mount==='rambi'&&!frame.airborne){
   if(moving){
    this.idleSince=now;this.nextPant=now+4000;this.distance+=Math.abs(frame.x-before.x);
    if(this.distance>=24&&now>=this.nextStep){sounds.push(this.step++%2?'rambi-step-2':'rambi-step-1');this.distance%=24;this.nextStep=now+110;}
   }else if(!frame.rolling&&now-this.idleSince>=2500&&now>=this.nextPant){sounds.push('rambi-pant');this.nextPant=now+4000;}
  }else{this.distance=0;this.idleSince=now;this.nextPant=now+4000;}
  if((frame.mount==='squawks'||frame.mount==='expresso')&&frame.airborne&&frame.flying){
   if(now>=this.nextFlap){sounds.push('wing-flap');this.nextFlap=now+280;}
  }else this.nextFlap=now;
  return sounds;
 }
}
interface Cue {offset:number;duration:number}
interface Bank {version:number;effects:Record<AnimalEffect,Cue>}
/** Reuse the emulator's unlocked audio context, including its iOS playback route.
 * Decode once, drop unavailable cues instead of queuing delayed sounds. */
export class AnimalAudio {
 private context?:AudioContext;private buffer?:AudioBuffer;private cues?:Bank['effects'];private loading?:Promise<void>;private retryAt=0;
 private voices=new Set<AudioBufferSourceNode>();private last=new Map<AnimalEffect,number>();
 private generation=0;played=0;lastEffect?:AnimalEffect;
 prepare(context:AudioContext|undefined):Promise<void>{
  if(!context||context.state==='closed')return Promise.resolve();
  if(context!==this.context){this.stop();this.context=context;this.buffer=undefined;this.cues=undefined;this.loading=undefined;this.retryAt=0;this.generation++;}
  if(this.buffer||Date.now()<this.retryAt)return Promise.resolve();
  if(this.loading)return this.loading;
  const generation=this.generation;
  const pending=(async()=>{
   const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),8000);
   try{
    const [meta,audio]=await Promise.all([fetch(`${import.meta.env.BASE_URL}audio/dkc-animals.json`,{signal:abort.signal}),fetch(`${import.meta.env.BASE_URL}audio/dkc-animals.wav`,{signal:abort.signal})]);
    if(!meta.ok||!audio.ok)throw new Error('Animal sound bank unavailable');
    const [bank,bytes]=await Promise.all([meta.json() as Promise<Bank>,audio.arrayBuffer()]);
    const buffer=await context.decodeAudioData(bytes);
    if(bank.version!==1||ANIMAL_EFFECTS.some(name=>{const cue=bank.effects?.[name];return !cue||!Number.isFinite(cue.offset)||!Number.isFinite(cue.duration)||cue.offset<0||cue.duration<=0||cue.offset+cue.duration>buffer.duration+.001;}))throw new Error('Invalid animal sound bank');
    if(generation===this.generation){this.cues=bank.effects;this.buffer=buffer;}
   }catch(error){if(generation===this.generation){this.retryAt=Date.now()+10000;console.warn('KONG_ANIMAL_AUDIO',error);}}
   finally{clearTimeout(timeout);if(generation===this.generation)this.loading=undefined;}
  })();this.loading=pending;return pending;
 }
 play(name:AnimalEffect):boolean{
  const context=this.context,buffer=this.buffer,cue=this.cues?.[name];
  if(!context||context.state!=='running'||!buffer||!cue)return false;
  const now=context.currentTime;if(now-(this.last.get(name)??-Infinity)<.09)return false;
  if(this.voices.size>=4)return false;
  let source:AudioBufferSourceNode|undefined,gain:GainNode|undefined;
  try{
   source=context.createBufferSource();gain=context.createGain();source.buffer=buffer;gain.gain.value=.75;
   source.connect(gain);gain.connect(soundOutput(context));this.voices.add(source);
   const voice=source,level=gain;
   voice.onended=()=>{this.voices.delete(voice);voice.disconnect();level.disconnect();};
   voice.start(0,cue.offset,cue.duration);this.last.set(name,now);this.lastEffect=name;this.played++;return true;
  }catch{
   if(source){this.voices.delete(source);source.disconnect();}gain?.disconnect();return false;
  }
 }
 stop():void{for(const source of this.voices){try{source.stop();}catch{}}this.voices.clear();this.last.clear();}
 get ready():boolean{return Boolean(this.buffer);}
}
