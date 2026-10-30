/** Shared by both worlds; independent of campaign/cheat saves. */
export const SOUND_KEY='kong-sound-enabled-v1';
let enabled=true;
try{enabled=localStorage.getItem(SOUND_KEY)!=='off';}catch{}
const outputs=new Map<AudioContext,GainNode>();
export function soundEnabled():boolean{return enabled;}
export function setSoundEnabled(value:boolean):void{
 enabled=value;try{localStorage.setItem(SOUND_KEY,value?'on':'off');}catch{}
 for(const[context,gain]of outputs){if(context.state==='closed'){outputs.delete(context);continue;}gain.gain.value=value?1:0;}
}
/** One output gate also silences voices already playing when mute is tapped.
 * Keep the audio clock and SNES loop running; never suspend a shared context. */
export function soundOutput(context:AudioContext):GainNode{
 let gain=outputs.get(context);if(!gain){gain=context.createGain();gain.gain.value=enabled?1:0;gain.connect(context.destination);outputs.set(context,gain);}return gain;
}
