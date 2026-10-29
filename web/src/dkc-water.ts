import{DKC,readDkcScene,dkcEnemies,killDkcEnemy}from'./dkc-profile';
import{nativeDkcMount}from'./dkc-mount';import{word,writeWord}from'./profile';import type{Mount}from'./adventure';
/** $32=3 is the original underwater process. $2B swims; $30/$4C/$4D
 * are mounted swim/stab states. Never adapt hurt, dismount or exit scripts. */
export function dkcSwimming(w:Uint8Array):boolean{const s=readDkcScene(w);return s.playing&&word(w,0x32)===3&&[0x2b,0x30,0x4c,0x4d].includes(word(w,DKC.state+s.playerSlot));}
export class DkcWater{
 stabUntil=0;private pressed=false;private depth?:{key:string;y:number};
 reset():void{this.stabUntil=0;this.pressed=false;this.depth=undefined;}
 update(w:Uint8Array,now:number,mount:Mount,jump:boolean,vertical:number,facing:number,attack:boolean):{swimming:boolean;stabbed:boolean;killed:number}{
  const s=readDkcScene(w);if(!dkcSwimming(w)||word(w,DKC.hit+s.playerSlot)){this.reset();return{swimming:false,stabbed:false,killed:0};}
  const native=nativeDkcMount(w),effective=native?.kind??mount;
  // Selected Yoshi/Enguarde skins use the native swimmer as their collision body.
  // BF97C1 subtracts$70 gravity. A bounded depth servo corrects frame-cadence
  // drift at rest using velocity only; native terrain still owns collisions.
  // Native Enguarde already owns four-way motion and is not rewritten.
  if(!native&&(effective==='yoshi'||effective==='enguarde')&&word(w,DKC.state+s.playerSlot)===0x2b){
   const key=`${s.level}:${s.playerSlot}:${effective}`;let velocity:number;
   if(vertical||jump){this.depth=undefined;velocity=vertical>0?-0x180:0x200;}
   else{if(this.depth?.key!==key)this.depth={key,y:s.y};velocity=Math.max(-0x100,Math.min(0x100,Math.round((s.y-this.depth.y)*96)));}
   writeWord(w,DKC.vy+s.playerSlot,(velocity+0x70)&0xffff);
  }else this.depth=undefined;
  const fresh=attack&&!this.pressed;this.pressed=attack;
  if(effective!=='enguarde'){
   this.stabUntil=0;let killed=0;
   if(attack)for(const e of dkcEnemies(w))if(Math.abs(e.x-s.x)<=e.width/2+26&&s.y>e.y-e.height-6&&s.y-32<e.y+6&&killDkcEnemy(w,e.slot))killed++;
   return{swimming:true,stabbed:false,killed};
  }
  let stabbed=fresh;if(fresh)this.stabUntil=now+390;
  const x=native?.x??s.x,y=native?.y??s.y,dir=facing<0?-1:1;
  let killed=0;
  // Only native spear-vulnerable fish; Croctopus, Clambo, scenery and bosses
  // retain their original rules. Front/nose contact never covers the tail.
  for(const e of dkcEnemies(w)){
   const dx=(e.x-x)*dir,reach=now<this.stabUntil?60:42,noseY=y-14;
   if(![0x53,0x54,0x55,0x56].includes(e.id)||dx<10||dx>reach+e.width/2||noseY<e.y-e.height-3||noseY>e.y+3)continue;
   if(killDkcEnemy(w,e.slot)){killed++;stabbed=true;this.stabUntil=now+390;}
  }
  return{swimming:true,stabbed,killed};
 }
}
