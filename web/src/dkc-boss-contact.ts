import{DKC,readDkcScene}from'./dkc-profile';
import{word,writeWord,signed16}from'./profile';
import{sweptHit,type DkcTarget}from'./dkc-combat';
export type BossContact='roll'|'stomp'|'barrel';
/** Observe genuine hero/projectile movement. Only a successful damage request
 * consumes a thrown barrel; native sprite routines perform its cleanup. */
export class DkcBossContact{
 private hero?:{x:number;y:number};private room?:number;private barrels=new Map<number,{id:number;x:number;y:number;used:boolean}>();
 reset():void{this.hero=undefined;this.room=undefined;this.barrels.clear();}
 update(w:Uint8Array,rolling:boolean,targets:readonly DkcTarget[],hit:(target:DkcTarget,kind:BossContact)=>boolean):BossContact|undefined{
  const s=readDkcScene(w);if(!s.playing||this.room!==undefined&&this.room!==s.level){this.reset();if(!s.playing)return;}
  this.room=s.level;const previous=this.hero;this.hero={x:s.x,y:s.y};
  const canAttack=word(w,DKC.state+s.playerSlot)<=0xb&&word(w,DKC.hit+s.playerSlot)===0;
  if(canAttack)for(const t of targets){
   const top=t.y-t.height,overlap=Math.abs(s.x-t.x)<t.width/2+30&&s.y>top-5&&s.y-30<t.y;
   const stomp=previous&&!s.grounded&&s.vy>0&&Math.abs(s.x-t.x)<t.width/2+14&&previous.y<=top+12&&s.y>=top-8&&s.y<=top+24;
   if((stomp||rolling&&overlap)&&hit(t,stomp?'stomp':'roll')){if(stomp)writeWord(w,DKC.vy+s.playerSlot,0x500);return stomp?'stomp':'roll';}
  }
  const live=new Set<number>();
  for(let slot=6;slot<0x34;slot+=2){const id=word(w,DKC.id+slot);if(![0x23,0x27].includes(id)||word(w,DKC.state+slot)!==2)continue;
   live.add(slot);const x=word(w,DKC.x+slot),y=word(w,DKC.height)-word(w,DKC.y+slot),old=this.barrels.get(slot),record=old?.id===id?old:{id,x,y,used:false};
   // Include the next native integration step so the original barrel collision
   // cannot consume it before the custom Gnawty projectile request is queued.
   const nx=x+signed16(word(w,DKC.vx+slot))/256,ny=y-signed16(word(w,DKC.vy+slot))/256;
   if(!record.used)for(const t of targets)if((sweptHit(record.x,record.y,x,y,t)||sweptHit(x,y,nx,ny,{...t,width:t.width+16}))&&hit(t,'barrel')){record.used=true;writeWord(w,DKC.hit+slot,0x20);record.x=x;record.y=y;this.barrels.set(slot,record);return'barrel';}
   record.x=x;record.y=y;this.barrels.set(slot,record);
  }
  for(const slot of this.barrels.keys())if(!live.has(slot))this.barrels.delete(slot);
 }
}
