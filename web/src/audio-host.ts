import {requestPlaybackAudio,unlockMediaPlayback} from './audio';
export interface GameAudioHost {readonly context:AudioContext|undefined;readonly generation:number;prime():void}
declare global{interface Window{__kongAudioHost?:GameAudioHost}}
/** Own audio in the permanent outer document, never in a disposable game frame. */
export function installAudioHost(owner:Window,base:string):GameAudioHost{
 if(owner.__kongAudioHost)return owner.__kongAudioHost;
 const audioOwner=owner as Window&{AudioContext?:typeof AudioContext;webkitAudioContext?:typeof AudioContext};
 const AudioCtor=audioOwner.AudioContext||audioOwner.webkitAudioContext;
 let generation=0;let context:AudioContext|undefined,media:HTMLAudioElement|undefined;
 const host:GameAudioHost={get context(){return context;},get generation(){return generation;},prime(){
  requestPlaybackAudio(owner.navigator as Navigator&{audioSession?:{type:string}});
  if(!media){media=owner.document.createElement('audio');media.src=`${base}audio/ios-unlock.wav`;media.loop=true;media.preload='auto';media.setAttribute('playsinline','');}
  unlockMediaPlayback(media);
  if(!AudioCtor)return;
  if(!context||context.state==='closed'){context=new AudioCtor();generation++;}
  try{const source=context.createBufferSource();source.buffer=context.createBuffer(1,1,22050);source.connect(context.destination);source.start();void context.resume().catch(()=>{});}catch{}
 }};
 owner.__kongAudioHost=host;return host;
}
export function parentAudioHost(child:Window):GameAudioHost|undefined{
 try{return child.parent!==child?child.parent.__kongAudioHost:undefined;}catch{return undefined;}
}
/** Mirror only this same-origin app route in the address bar; no parent navigation. */
export function syncHostRoute(child:Window):void{
 try{if(child.parent===child||!parentAudioHost(child))return;const url=new URL(child.location.href);url.searchParams.delete('game-frame');child.parent.history.replaceState(null,'',url.href);}catch{}
}
