import{SpriteAtlas}from'./atlas';
import{drawDkcGuardian}from'./dkc-guardian-draw';
import{YOSHI_GUARDIANS,type YoshiGuardianId}from'./yoshi-guardian-spec';
import{guardianAnimationDuration,guardianDamageStage,guardianCinematicAnchor}from'./guardian-animation';
import type{DkcGuardianSave}from'./dkc-guardian';
if(import.meta.env.DEV){
 const select=document.querySelector<HTMLSelectElement>('#boss')!,canvas=document.querySelector<HTMLCanvasElement>('#canvas')!,context=canvas.getContext('2d')!,label=document.querySelector<HTMLElement>('#state')!;
 for(const boss of YOSHI_GUARDIANS){const option=document.createElement('option');option.value=boss.id;option.textContent=boss.name;select.append(option);}
 const atlas=await SpriteAtlas.load();let state:DkcGuardianSave,paused=false,loading=false;
 async function reset(){loading=true;paused=false;document.querySelector<HTMLInputElement>('#seek')!.value='0';document.querySelector('#pause')!.textContent='Pause animation';const id=select.value as YoshiGuardianId;await atlas.prepareGuardian(id);state={version:1,level:22,slot:6,id,phase:'fight',hp:6,maxHp:6,x:145,y:id==='bigger-boo'?100:190,floor:190,elapsed:0,phaseTime:0,hitUntil:0,cameraX:0,cameraY:0,motion:'windup',motionTime:0};loading=false;}
 function hit(fatal=false){if(loading||state.phase!=='fight'||state.elapsed<state.hitUntil)return;if(fatal)state.hp=1;state.hp--;state.animationX=state.x;state.animationY=state.y;state.hitUntil=state.elapsed+guardianAnimationDuration(state.id,state.hp?`hurt-${guardianDamageStage(state.hp,6)}`:'dead');if(!state.hp){const anchor=guardianCinematicAnchor(state.id,state);state.animationX=anchor.x;state.animationY=anchor.y;state.phase='dying';state.phaseTime=0;}}
 select.onchange=()=>void reset();document.querySelector('#restart')!.addEventListener('click',()=>void reset());document.querySelector('#hit')!.addEventListener('click',()=>hit());document.querySelector('#defeat')!.addEventListener('click',()=>hit(true));document.querySelector('#pause')!.addEventListener('click',()=>{paused=!paused;document.querySelector('#pause')!.textContent=paused?'Resume animation':'Pause animation';});
 document.querySelector<HTMLInputElement>('#seek')!.oninput=event=>{if(loading)return;const time=Number((event.target as HTMLInputElement).value);paused=true;state.phase='dying';state.hp=0;state.phaseTime=time;state.elapsed=time;state.hitUntil=guardianAnimationDuration(state.id,'dead');const anchor=guardianCinematicAnchor(state.id,state);state.animationX=anchor.x;state.animationY=anchor.y;document.querySelector('#pause')!.textContent='Resume animation';};
 await reset();let previous=performance.now();
 function tick(now:number){const dt=Math.min(.05,(now-previous)/1000);previous=now;if(!loading){if(!paused){state.elapsed+=dt;if(state.phase==='dying'){state.phaseTime+=dt;if(state.phaseTime>=guardianAnimationDuration(state.id,'dead'))state.phase='released';}}
 context.clearRect(0,0,256,224);context.fillStyle='#485d36';context.fillRect(0,190,256,34);atlas.draw(context,'violet','idle',40,190,now);drawDkcGuardian(context,atlas,state,0,0,0);label.textContent=`${state.id} · ${state.hp}/6 HP · ${state.phase} · cinematic ${state.phaseTime.toFixed(2)}s · hurt ${(Math.max(0,state.hitUntil-state.elapsed)).toFixed(2)}s remaining · original native PPU pixels`;}
 requestAnimationFrame(tick);}
 requestAnimationFrame(tick);
}
