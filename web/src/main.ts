import {installAudioHost} from './audio-host';
if(window.parent!==window&&new URLSearchParams(location.search).get('game-frame')==='1'){
 void import('./app');
}else{
 // A single disposable frame owns the active SNES core. The outer document
 // owns the unlocked audio/media session across every pipe journey.
 installAudioHost(window,import.meta.env.BASE_URL);
 document.documentElement.style.cssText='margin:0;width:100%;height:100%;overflow:hidden;background:#111b1e';
 document.body.style.cssText='margin:0;width:100%;height:100dvh;overflow:hidden;background:#111b1e';
 const frame=document.createElement('iframe'),url=new URL(location.href);url.searchParams.set('game-frame','1');
 frame.id='game-host';frame.title='Kong × Yoshi adventure';frame.allow='autoplay; fullscreen';frame.allowFullscreen=true;
 frame.style.cssText='position:fixed;inset:0;display:block;width:100%;height:100dvh;border:0;background:#111b1e';
 let loads=0;frame.addEventListener('load',()=>{frame.dataset.frameLoads=String(++loads);});
 frame.src=url.href;document.getElementById('app')!.replaceChildren(frame);
}
