/** Verified Rev2 animation bytecode: Op8E DKHowl13 in the three hidden DK
 * idle/chest-beating scripts. Only their sound argument becomes None00.
 * Do not mute the APU, damage cries, music, enemies or other effects. */
const SITES=[0x3e9ae4,0x3ea1c5,0x3ea384];
const BEFORE=[4,0,2,4,4,2,4,8,2,4,12,2,4,16,2,4,20,2];
const AFTER=[0x8e,0x13,2,0x18,2,2,0x1c,2,2,0x20,2,2,0x24,2,2,0x28,2,0x90,0x64];
const matches=(h:Uint8Array,base:number)=>base>=0&&base+0x400000<=h.length&&SITES.every(p=>[...BEFORE,...AFTER].every((v,i)=>h[base+p-BEFORE.length+i]===v));
export class DkcIdleVoice{
 readonly bases:number[]=[];
 constructor(private heap:Uint8Array){
  for(let p=heap.indexOf(0x8e);p>=0;p=heap.indexOf(0x8e,p+1)){const base=p-SITES[0];if(matches(heap,base))this.bases.push(base);}
  if(!this.bases.length||this.bases.length>8)throw Error('The native DKC idle voice scripts are incompatible.');
 }
 sync(silence:boolean):void{for(const base of this.bases)for(const p of SITES)this.heap[base+p+1]=silence?0:0x13;}
 restore():void{this.sync(false);}
}
