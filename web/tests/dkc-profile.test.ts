import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {validateDkcNativeState} from '../src/snapshot';
import {DKC,readDkcScene,enemies,killDkcEnemy,DkcRenderHooks,patchDkcDrawing,isDkcStageEntrance} from '../src/dkc-profile';
function fixture(){const w=new Uint8Array(0x20000);const put=(a:number,v:number)=>{w[a]=v&255;w[a+1]=v>>>8;};put(DKC.entrance,0x16);put(DKC.id+2,1);put(DKC.height,512);put(DKC.x+2,156);put(DKC.y+2,175);put(DKC.cameraX,85);put(DKC.cameraY,177);return{w,put};}
describe('verified DKC Rev2 bridge',()=>{
 it('normalizes Y upwards and matches the retained native Jungle snapshot',()=>{const {w}=fixture();const s=readDkcScene(w);expect(s.playing).toBe(true);expect(s.x-s.cameraX).toBe(71);expect(s.y-s.cameraY).toBe(160);});
 it('uses the current Diddy slot and native flip flag',()=>{const {w,put}=fixture();put(DKC.currentKong,2);put(DKC.id+4,2);put(DKC.x+4,200);put(DKC.attributes+4,0x4000);expect(readDkcScene(w)).toMatchObject({playerSlot:4,x:200,facing:-1,playing:true});});
 it('uses the native contact bit rather than standing gravity bias to detect jumps',()=>{const {w,put}=fixture();put(0x12a5+2,0x101);put(DKC.vy+2,0xfd00);expect(readDkcScene(w)).toMatchObject({grounded:true,vy:768});put(0x12a5+2,0);expect(readDkcScene(w).grounded).toBe(false);});
 it('recognizes native map actors and projection independently of the selected destination',()=>{const {w,put}=fixture();put(0x32,1);put(DKC.height,0);for(const actor of[0x10,0x12])for(const level of[0x16,0x0c,0xea,0xe6,0xe7,0xe8,0xe9,0xec,0xed]){put(DKC.id,actor);put(DKC.entrance,level);expect(readDkcScene(w)).toMatchObject({isMap:true,playing:false});}put(DKC.id,0);expect(readDkcScene(w).isMap).toBe(false);put(DKC.entrance,0);expect(readDkcScene(w).playing).toBe(false);});
 it('recognizes the genuine post-victory map even when native mode32 stays zero',()=>{const {w,put}=fixture();put(0x32,0);put(DKC.height,0);put(DKC.id,0x10);put(DKC.entrance,12);put(DKC.loadedScene,12);expect(readDkcScene(w)).toMatchObject({isMap:true,playing:false,selectedEntrance:12});});
 it('identifies a loaded region map while its selected destination is a stage',()=>{
  const {w,put}=fixture();put(DKC.loadedScene,0xec);put(DKC.entrance,0x16);put(0x32,1);put(DKC.height,0);put(DKC.id,0x10);
  expect(readDkcScene(w)).toMatchObject({level:0xec,selectedEntrance:0x16,isMap:true,playing:false});
  put(DKC.loadedScene,0);put(0x32,0);put(DKC.height,512);put(DKC.id,0);expect(readDkcScene(w)).toMatchObject({level:0x16,isMap:false,playing:true});
  put(DKC.loadedScene,0xea);expect(readDkcScene(w)).toMatchObject({level:0xea,isMap:false,playing:true});
 });
 it('recognizes the actual bundled region-map snapshot with Jungle highlighted',()=>{
  const state=readFileSync(new URL('../public/bootstrap/dkc-map-snes9x-2.0.2.state',import.meta.url));validateDkcNativeState(state);
  const marker=Buffer.from('RAM:131072:'),offset=state.indexOf(marker);expect(offset).toBeGreaterThan(0);
  const ram=new Uint8Array(state.subarray(offset+marker.length,offset+marker.length+0x20000));
  expect(ram[DKC.entrance]).toBe(0x16);expect(ram[0x32]).toBe(1);expect(ram[DKC.id]).toBe(0x10);expect(ram[DKC.height]).toBe(0);
  expect(readDkcScene(ram)).toMatchObject({isMap:true,playing:false,selectedEntrance:0x16});
 });
 it('covers every stage entrance including Reptile Rumble EA, without interpreting level0 as entrance0',()=>{
  const {w,put}=fixture();for(let level=0;level<=255;level++){
   put(DKC.entrance,level);expect(readDkcScene(w).playing).toBe((level>=1&&level<=0xe5)||level===0xea);
  }
  put(0x30,0);put(DKC.entrance,0x16);expect(readDkcScene(w).playing).toBe(true); // native Jungle level ID0 is valid
  expect(isDkcStageEntrance(0)).toBe(false);expect(isDkcStageEntrance(0xeb)).toBe(false);expect(isDkcStageEntrance(0x100)).toBe(false);
 });
 it('executes every native guard branch with the same entrance/ID rules as the TypeScript bridge',()=>{
  const rom=patchDkcDrawing(new Uint8Array(readFileSync(new URL('../public/rom/dkc-usa-rev2.sfc',import.meta.url))));
  // Small interpreter for the exact 16-bit-accumulator 65816 instructions in
  // the guard. Execute branch offsets, not just compare hand-written bytes.
  const entry=rom[0x3ba86c]|rom[0x3ba86d]<<8;expect(entry).toBe(0xfe00);
  function run(entrance:number,id:number,loadedScene=0,height=512,rider=0,link=0){let pc=entry,a=0,zero=false,carry=false;const y=6;
   const next=()=>rom[0x3b0000+pc++],u16=()=>next()|next()<<8;
   for(let count=0;count<60;count++){
    const op=next();
    if(op===0xad||op===0xb9){const address=u16()+(op===0xb9?y:0);a=address===0x4a?height:address===0x40?loadedScene:address===0x3e?entrance:address===0xd45+y?id:address===0x1375+y?rider:-1;expect(a).toBeGreaterThanOrEqual(0);zero=a===0;}
    else if(op===0xc9){const value=u16();zero=a===value;carry=a>=value;}
    else if(op===0xcc){const at=u16();expect([0x512,0x514]).toContain(at);zero=y===link;}
    else if(op===0xf0||op===0xd0||op===0x90||op===0xb0||op===0x80){const raw=next(),offset=raw&128?raw-256:raw;if(op===0xf0?zero:op===0xd0?!zero:op===0x90?!carry:op===0xb0?carry:true)pc+=offset;}
    else if(op===0x4c){const target=u16();expect([0xa86e,0xaa26]).toContain(target);return{target,a};}
    else throw new Error('Unexpected guard opcode '+op.toString(16));
   }
   throw new Error('Render guard did not return');
  }
  for(const id of[9,10,11,12])for(const rider of[0,2,4,6])for(const link of[0,6,8]){const r=run(22,id,0,512,rider,link);expect(r.target).toBe([2,4].includes(rider)&&link===6?0xaa26:0xa86e);expect(r.a).toBe(id);}
  for(const height of[0,512])for(const loadedScene of[0,0xec,0xea,0x16,0xee])for(let entrance=0;entrance<=255;entrance++)for(const id of[0,1,2,3,5,0x19,0x70]){
   const r=run(entrance,id,loadedScene,height);expect(r.target).toBe(height>0&&isDkcStageEntrance(loadedScene||entrance)&&(id===1||id===2)?0xaa26:0xa86e);expect(r.a).toBe(id);
  }
 });
 it('requests the native projectile kill without clearing IDs or resource tables',()=>{const {w,put}=fixture();put(DKC.id+6,5);put(DKC.x+6,220);put(DKC.y+6,175);expect(enemies(w)).toHaveLength(1);expect(killDkcEnemy(w,6)).toBe(true);expect(w[DKC.hit+6]).toBe(0x20);expect(w[DKC.id+6]).toBe(5);expect(w[DKC.state+6]).toBe(0);});
 it('never eats scenery, items, bosses, the player, dead enemies or an odd slot',()=>{const {w,put}=fixture();for(const id of[1,2,0x26,0x34,0x70]){put(DKC.id+6,id);expect(killDkcEnemy(w,6)).toBe(false);}put(DKC.id+6,5);put(DKC.state+6,1);expect(killDkcEnemy(w,6)).toBe(false);expect(killDkcEnemy(w,7)).toBe(false);expect(killDkcEnemy(w,2)).toBe(false);});
 it('rejects pending hits and the correct native death state for birds and squid',()=>{const {w,put}=fixture();for(const[id,dead]of [[0x4b,5],[0x56,2],[0x0e,2]]){put(DKC.id+6,id);put(DKC.state+6,1);expect(enemies(w)).toHaveLength(1);put(DKC.state+6,dead);expect(enemies(w)).toHaveLength(0);}put(DKC.id+6,5);put(DKC.state+6,0);put(DKC.hit+6,0x20);expect(killDkcEnemy(w,6)).toBe(false);});
 it('patches only the render entry/free guard and restores the exact ROM',()=>{
  const rom=new Uint8Array(readFileSync(new URL('../public/rom/dkc-usa-rev2.sfc',import.meta.url)));const original=rom.slice();const hooks=new DkcRenderHooks(rom);hooks.setHidden(true);expect([...rom.slice(0x3ba86b,0x3ba86e)]).toEqual([0x4c,0x00,0xfe]);expect([...rom.slice(0x3bfe00,0x3bfe03)]).toEqual([0xad,0x4a,0]);hooks.restore();expect(Buffer.compare(Buffer.from(rom),Buffer.from(original))).toBe(0);const patched=patchDkcDrawing(rom);expect(rom).not.toBe(patched);expect(Buffer.compare(Buffer.from(rom),Buffer.from(original))).toBe(0);
 });
 it('rejects a wrong revision before mutating any bytes',()=>{const rom=new Uint8Array(0x400000),before=rom.slice();expect(()=>new DkcRenderHooks(rom)).toThrow('revision');expect(Buffer.compare(Buffer.from(rom),Buffer.from(before))).toBe(0);});
});
