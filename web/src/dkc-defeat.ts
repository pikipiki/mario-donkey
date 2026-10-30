import{DKC,readDkcScene}from'./dkc-profile';
import{dkcAvailableHeroes}from'./dkc-team-damage';
import{word}from'./profile';
/** Observe the original final-Kong injury/death sequence. Native state11 is
 * also a victory script: never infer a defeat from a hero count alone. */
export class DkcDefeat{
 active=false;private needsMusic=false;
 musicRequest(w:Uint8Array):'resume'|'none'{if(!this.active)return'none';if(word(w,0x51d)!==0)this.needsMusic=false;return this.needsMusic?'resume':'none';}
 update(w:Uint8Array,guarding:boolean):{started:boolean;returned:boolean}{
  const scene=readDkcScene(w);
  if(scene.isMap){const returned=this.active;this.active=false;this.needsMusic=false;return{started:false,returned};}
  const state=word(w,DKC.state+scene.playerSlot);
  if(scene.playing&&state<=8&&dkcAvailableHeroes(w)>0)this.active=false;
  const started=!this.active&&guarding&&scene.playing&&[0xb,0xd,0x3a,0x3b,0x54].includes(state)&&dkcAvailableHeroes(w)===0;
  if(started){this.active=true;this.needsMusic=true;}
  return{started,returned:false};
 }
}
