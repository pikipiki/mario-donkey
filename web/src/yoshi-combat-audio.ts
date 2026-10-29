// Native EU SPC commands: bank0B E5CA/E648/E871/EA28 and bank20 sound names.
export const YOSHI_COMBAT_EFFECTS=['aim','throw','tongue','swallow','make','impact','flutter'] as const;
export type YoshiCombatEffect=typeof YOSHI_COMBAT_EFFECTS[number];
interface Cue {offset:number;duration:number}
interface Bank {version:number;effects:Record<YoshiCombatEffect,Cue>}
/** Reuse the emulator's unlocked audio context, including its iOS playback route.
 * Decode once, drop unavailable cues instead of queuing delayed sounds. */
export class YoshiCombatAudio {
 private context?:AudioContext;private buffer?:AudioBuffer;private cues?:Bank['effects'];private loading?:Promise<void>;private retryAt=0;
 private voices=new Set<AudioBufferSourceNode>();private last=new Map<YoshiCombatEffect,number>();
 private generation=0;played=0;lastEffect?:YoshiCombatEffect;
 prepare(context:AudioContext|undefined):Promise<void>{
  if(!context||context.state==='closed')return Promise.resolve();
  if(context!==this.context){this.stop();this.context=context;this.buffer=undefined;this.cues=undefined;this.loading=undefined;this.retryAt=0;this.generation++;}
  if(this.buffer||Date.now()<this.retryAt)return Promise.resolve();
  if(this.loading)return this.loading;
  const generation=this.generation;
  const pending=(async()=>{
   const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),8000);
   try{
    const [meta,audio]=await Promise.all([fetch(`${import.meta.env.BASE_URL}audio/yoshi-combat.json`,{signal:abort.signal}),fetch(`${import.meta.env.BASE_URL}audio/yoshi-combat.wav`,{signal:abort.signal})]);
    if(!meta.ok||!audio.ok)throw new Error('Animal sound bank unavailable');
    const [bank,bytes]=await Promise.all([meta.json() as Promise<Bank>,audio.arrayBuffer()]);
    const buffer=await context.decodeAudioData(bytes);
    if(bank.version!==1||YOSHI_COMBAT_EFFECTS.some(name=>{const cue=bank.effects?.[name];return !cue||!Number.isFinite(cue.offset)||!Number.isFinite(cue.duration)||cue.offset<0||cue.duration<=0||cue.offset+cue.duration>buffer.duration+.001;}))throw new Error('Invalid animal sound bank');
    if(generation===this.generation){this.cues=bank.effects;this.buffer=buffer;}
   }catch(error){if(generation===this.generation){this.retryAt=Date.now()+10000;console.warn('KONG_YOSHI_COMBAT_AUDIO',error);}}
   finally{clearTimeout(timeout);if(generation===this.generation)this.loading=undefined;}
  })();this.loading=pending;return pending;
 }
 play(name:YoshiCombatEffect):boolean{
  const context=this.context,buffer=this.buffer,cue=this.cues?.[name];
  if(!context||context.state!=='running'||!buffer||!cue)return false;
  const now=context.currentTime;if(now-(this.last.get(name)??-Infinity)<.09)return false;
  if(this.voices.size>=4)return false;
  let source:AudioBufferSourceNode|undefined,gain:GainNode|undefined;
  try{
   source=context.createBufferSource();gain=context.createGain();source.buffer=buffer;gain.gain.value=.75;
   source.connect(gain);gain.connect(context.destination);this.voices.add(source);
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
