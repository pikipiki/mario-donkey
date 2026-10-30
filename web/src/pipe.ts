import{soundOutput}from'./sound-preference';
/** Shared by both maps. Uses the emulator's already unlocked iOS audio route. */
export class PipeAudio {
 private context?:AudioContext;private buffer?:AudioBuffer;private pending?:Promise<void>;
 played=0;
 prepare(context:AudioContext|undefined):Promise<void>{
  if(!context||context.state==='closed')return Promise.resolve();
  if(context!==this.context){this.context=context;this.buffer=undefined;this.pending=undefined;}
  if(this.buffer)return Promise.resolve();
  if(this.pending)return this.pending;
  const task=(async()=>{
   const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),2000);
   try{
    const response=await fetch(`${import.meta.env.BASE_URL}audio/mario-pipe.wav`,{signal:abort.signal});
    if(!response.ok)throw new Error('Pipe sound unavailable');
    const buffer=await context.decodeAudioData(await response.arrayBuffer());
    if(context===this.context)this.buffer=buffer;
   }catch{/* A missing effect must never strand the player between worlds. */}
   finally{clearTimeout(timer);if(context===this.context)this.pending=undefined;}
  })();this.pending=task;return task;
 }
 async play(context:AudioContext|undefined):Promise<boolean>{
  await this.prepare(context);
  if(!context||context.state!=='running'||context!==this.context||!this.buffer)return false;
  const buffer=this.buffer;
  return new Promise(resolve=>{
   let source:AudioBufferSourceNode|undefined,gain:GainNode|undefined,timer:ReturnType<typeof setTimeout>|undefined,done=false;
   const finish=(played:boolean)=>{if(done)return;done=true;clearTimeout(timer);try{source?.stop();}catch{}source?.disconnect();gain?.disconnect();resolve(played);};
   try{
    source=context.createBufferSource();gain=context.createGain();source.buffer=buffer;gain.gain.value=.85;
    source.connect(gain);gain.connect(soundOutput(context));source.onended=()=>finish(true);
    timer=setTimeout(()=>finish(true),1200);source.start();this.played++;
   }catch{finish(false);}
  });
 }
}
/** Save first, finish the cue before page teardown, then enter the other map. */
export async function travelThroughPipe(save:()=>Promise<void>,play:()=>Promise<unknown>,navigate:()=>void):Promise<void>{
 await save();try{await play();}catch{/* Audio failure cannot cancel a saved journey. */}navigate();
}
