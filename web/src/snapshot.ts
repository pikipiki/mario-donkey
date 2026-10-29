/** The bundled Snes9x 2.0.2 writes snapshot version 12. RetroArch may wrap it
 * in RASTATE v1: 8-byte headers, little-endian lengths and 8-byte padding.
 * Validate structure before native loadState, which does not report failures.
 * This cannot detect arbitrary bad RAM/VRAM values in an otherwise valid save.
 */
const NATIVE_HEADER='#!s9xsnp:0012\n';
const REQUIRED=['NAM','CPU','REG','PPU','DMA','VRA','RAM','SRA','FIL','SND','CTL','TIM','SFX'];
const MEMORY_SIZES:Record<string,number>={VRA:0x10000,RAM:0x20000,SRA:0x80000};
const invalid=()=>new Error('The saved game is incomplete or incompatible. Your existing save has been kept.');
const text=(bytes:Uint8Array,start:number,length:number)=>String.fromCharCode(...bytes.subarray(start,start+length));

function coreState(state:Uint8Array):Uint8Array{
 if(text(state,0,7)!=='RASTATE')return state;
 if(state.length<8||state[7]!==1)throw invalid();
 const view=new DataView(state.buffer,state.byteOffset,state.byteLength);
 let offset=8,core:Uint8Array|undefined;
 while(offset+8<=state.length){
  const tag=text(state,offset,4),length=view.getUint32(offset+4,true);offset+=8;
  if(tag==='END '){if(length!==0||!core)throw invalid();return core;}
  const padded=Math.ceil(length/8)*8;
  if(padded>state.length-offset)throw invalid();
  if(tag==='MEM '){if(core)throw invalid();core=state.subarray(offset,offset+length);}
  // Frontend blocks such as ACHV/RPLY belong to RetroArch, not Snes9x.
  offset+=padded;
 }
 throw invalid();
}

function blocks(state:Uint8Array):Map<string,Uint8Array>{
 const core=coreState(state),found=new Map<string,Uint8Array>();
 if(text(core,0,NATIVE_HEADER.length)!==NATIVE_HEADER)throw invalid();
 let offset=NATIVE_HEADER.length;
 while(offset<core.length){
  const header=text(core,offset,11);
  if(!/^[A-Z0-9]{3}:[0-9]{6}:$/.test(header))throw invalid();
  const name=header.slice(0,3),length=Number(header.slice(4,10));offset+=11;
  if(found.has(name)||length>core.length-offset)throw invalid();
  found.set(name,core.subarray(offset,offset+length));offset+=length;
 }
 for(const name of REQUIRED)if(!found.get(name)?.length)throw invalid();
 for(const [name,length]of Object.entries(MEMORY_SIZES))if(found.get(name)!.length!==length)throw invalid();
 return found;
}

export function validateNativeState(state:Uint8Array):void{blocks(state);}

/** A view into the supplied bytes, useful for deliberate DEV fixtures. */
export function stateBlock(state:Uint8Array,name:string):Uint8Array{
 const block=blocks(state).get(name);if(!block)throw invalid();return block;
}
