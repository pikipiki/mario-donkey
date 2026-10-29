import {stateBlock,validateNativeState} from './snapshot';

/** EU ROM $10:810A/$10:828A load/save these campaign fields. All graphics,
 * CPU, SuperFX and runtime RAM come from the known-good bootstrap instead.
 * Recovery intentionally returns to the map, not the old player coordinates.
 */
export function createRecoveryState(cleanBootstrap:Uint8Array,oldState:Uint8Array):Uint8Array{
 validateNativeState(cleanBootstrap);validateNativeState(oldState);
 const result=cleanBootstrap.slice(),ram=stateBlock(result,'RAM'),oldRam=stateBlock(oldState,'RAM');
 const sram=stateBlock(result,'SRA'),oldSram=stateBlock(oldState,'SRA');
 // Three 104-byte files, three backups, six checksums and selection/language.
 // Everything else in SRA is SuperFX workspace or runtime graphics/cache.
 sram.set(oldSram.subarray(0x7c00,0x7e80),0x7c00);
 for(const [start,length]of [[0x222,72],[0x2b8,72],[0x357,27],[0x372,2],[0x379,4]]){
  ram.set(oldRam.subarray(start,start+length),start);
 }
 ram[0x216]=oldRam[0x216]?1:0; // Native flag: final world unlocked.
 const file=oldRam[0x30e];if(file===0||file===2||file===4)ram[0x30e]=file;
 const world=oldRam[0x218],stage=oldRam[0x21a];
 if(world<=10&&world%2===0&&stage<72&&Math.floor(stage/12)*2===world){
  ram[0x218]=world;ram[0x21a]=stage;
 }
 // Rebuild the derived map icons as the native EU load routine does. Never
 // copy an old tile/animation cache. Slots 8/9 are Extra/Bonus; 10/11 are UI.
 for(let i=0;i<72;i++){
  const local=i%12;
  ram[0x30f+i]=ram[0x222+i]?local+1:local===8||local===9?0xf0:local>=10?local+1:0;
 }
 // Keep the bootstrap CPU and scene phase paired until the native load finishes.
 return result;
}
