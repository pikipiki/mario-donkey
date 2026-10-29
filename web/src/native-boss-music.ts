/** Exact EU native entry-song table, ROM $00B273. The 65816 routine at
 * $01B286 reads $0205 first, else table[$0203-1], then writes $4D AND $0205.
 * $4D/$4F are the outgoing APU handshake, not a persistent current-song log. */
export const YOSHI_ENTRY_SONGS=Object.freeze([1,1,1,1,1,9,1,1,9,12,1,2,0,1,0,0,0,2,1]);
const song=(value:number|undefined):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>0&&value<0x14;
/** Capture while gameplay still belongs to the stage, before sending $F0.
 * $0205 survives the APU handshake; native changes still queued at $4D win. */
export function currentYoshiSong(w:Uint8Array):number|undefined{
 if(song(w[0x4d]))return w[0x4d];
 if(song(w[0x205]))return w[0x205];
 if(song(w[0x4f]))return w[0x4f];
 // Native $0203 is the loaded block-set index (header+1). Use the header only
 // if that index is not initialized; never guess a track for silent settings.
 const block=w[0x203],header=w[0x150];
 const index=block>=1&&block<=YOSHI_ENTRY_SONGS.length?block-1:header;
 const fallback=YOSHI_ENTRY_SONGS[index];return song(fallback)?fallback:undefined;
}
/** Old guardian metadata could save zero from the transient handshake. */
export function captureYoshiBossSong(w:Uint8Array,saved?:number):number|undefined{
 return song(saved)?saved:currentYoshiSong(w);
}
/** Music-only native stop: leaves the real egg / tongue / hit queues intact. */
export function stopYoshiBossSong(w:Uint8Array):boolean{
 if(w[0x118]!==0x13)return false;w[0x4d]=0xf0;return true;
}
/** Never overwrite the native goal/death/map tune or another queued song.
 * No forced replay of the level loader, no resets of $0205 or APU acknowledgers. */
export function restoreYoshiBossSong(w:Uint8Array,saved?:number,finishing=false):boolean{
 if(w[0x118]!==0x13||finishing||w[0x4d]!==0&&w[0x4d]!==0xf0)return false;
 const track=captureYoshiBossSong(w,saved);if(track===undefined)return false;
 w[0x4d]=track;return true;
}
