import{dkcStateBlock,validateDkcNativeState}from'./snapshot';
import{writeWord,word}from'./profile';
import routes from'./generated/dkc-unlock.json';
/** DKC USA Rev2 native campaign flags/counters; graphics/CPU/runtime come from
 * the clean map. ROM HiROM header FFD8=1: exactly2KiB battery SRAM. */
export function createDkcRecoveryState(clean:Uint8Array,old:Uint8Array):Uint8Array{
 validateDkcNativeState(clean);validateDkcNativeState(old);const result=clean.slice(),w=dkcStateBlock(result,'RAM'),prior=dkcStateBlock(old,'RAM');
 dkcStateBlock(result,'SRA').set(dkcStateBlock(old,'SRA').subarray(0,0x800));
 w.set(prior.subarray(0x583,0x683),0x583); // Native canonical entrance completion/bonus flags.
 w.set(prior.subarray(0x571,0x575),0x571); // Four animal-token counters.
 w.set(prior.subarray(0x57b,0x57d),0x57b); // Banana count.
 const lives=word(prior,0x575);writeWord(w,0x575,lives<=99?lives:0);writeWord(w,0x577,lives<=99?lives:0);
 w[0x579]=(w[0x579]&0xfe)|(prior[0x579]&1); // Native partner-present flag, never refill a lost companion.
 const kong=word(prior,0x56f);if(kong===1||kong===2)writeWord(w,0x56f,kong);
 const file=word(prior,0x581);if(file<3)writeWord(w,0x581,file);
 // Rebuild derived routes from verified ROM triples (completed gate,from,to).
 // Retain the clean initial route; never copy the old level's banana/VRAM cache.
 const edge=(from:number,to:number)=>{for(let i=0;i<4;i++){const at=0xfc00+from*4+i;if(w[at]===to)return;if(w[at]===0){w[at]=to;return;}}};
 for(let i=0;i<routes.connections.length&&routes.connections[i];i+=3){const gate=routes.canonical[routes.connections[i]],a=routes.canonical[routes.connections[i+1]],b=routes.canonical[routes.connections[i+2]];if(w[0x583+gate]&1){edge(a,b);edge(b,a);}}
 return result;
}

/** A crashed/cleared transition may have lost every campaign field. Prefer the
 * last validated checkpoint in that exact case; never rebuild from erased flags. */
export function dkcRecoverySource(live:Uint8Array,checkpoint?:Uint8Array):Uint8Array{
 const w=dkcStateBlock(live,'RAM');
 const cleared=w[0x51a]===0&&word(w,0x3e)===0&&word(w,0x40)===0&&word(w,0x4a)===0&&w.subarray(0x571,0x683).every(v=>v===0);
 if(cleared&&checkpoint){validateDkcNativeState(checkpoint);return checkpoint;}return live;
}
