import {word,writeWord,signed16,PROFILE as P} from './profile';
/** Verified EU change_map16 ($10:9334...) and its VRAM queue. These are map
 * blocks, not arbitrary scenery sprites. Never erase ordinary solid terrain. */
export const BREAKABLE_PAGES=new Set([0x1a,0x1b,0x1c,0x7a,0x7b,0x7c]);
export interface TerrainHit{x:number;y:number;tile:number}
export function tileAddress(gsu:Uint8Array,x:number,y:number):number|undefined{
 if(x<0||x>=4096||y<0||y>=2048)return;
 const screen=((y&0x700)>>>4)|((x&0xf00)>>>8),id=gsu[0xcaa+screen]&0x3f;
 return 0x18000+(id<<9)+((y&0xf0)<<1)+((x&0xf0)>>>3);
}
/** Commit collision, visible tile cache and native VRAM upload together.
 * Return without changing anything when offscreen or the queue is full. */
export function replaceTile(wram:Uint8Array,gsu:Uint8Array,x:number,y:number,tile:number,graphics:number):boolean{
 const address=tileAddress(gsu,x,y);if(address===undefined)return false;
 const rx=signed16((x&0xfff0)-word(gsu,0xa4)+16),ry=signed16((y&0xfff0)-word(gsu,0xa6)+16);
 if(rx<0||rx>=0x130||ry<0||ry>=0x100)return false;
 const size=word(wram,0x9ef);if(size%4||size>0xfc||word(wram,0x9f1+size)!==0xffff)return false;
 let vram=((y&0xf0)<<2)|((x&0x1f0)>>>3);const cache=vram;
 if(vram&0x20)vram^=0x420;
 writeWord(wram,address,tile);writeWord(gsu,0x409e+cache,tile);
 writeWord(wram,0x9f1+size,vram|0x6800);writeWord(wram,0x9f3+size,graphics);
 writeWord(wram,0x9f5+size,0xffff);writeWord(wram,0x9ef,size+4);return true;
}
export function breakTerrain(wram:Uint8Array,gsu:Uint8Array,direction:number,attacking:boolean):TerrainHit[]{
 if(!attacking||!direction||wram[P.mode]!==P.gameplay||word(gsu,0x1ae)||word(gsu,0xae)||wram[0xd11])return[];
 const x=word(gsu,P.x),y=word(gsu,P.y),hits:TerrainHit[]=[],seen=new Set<number>();
 for(const reach of [16,28])for(const dy of [0,16,28]){
  const tx=(x+12+Math.sign(direction)*reach)&~15,ty=(y+dy)&~15,address=tileAddress(gsu,tx,ty);
  if(ty>=((y+32)&~15)||address===undefined||seen.has(address))continue;seen.add(address);
  const tile=word(wram,address);if(!BREAKABLE_PAGES.has(tile>>>8))continue;
  if(replaceTile(wram,gsu,tx,ty,0,0x33f2))hits.push({x:tx,y:ty,tile});
 }
 if(hits.length)writeWord(gsu,P.sound,0x48);return hits;
}
