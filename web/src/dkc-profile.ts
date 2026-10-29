/** DKC USA Rev 2, SHA256 628147468c3539283197f58f03b94df49758a332831857481ea9cc31645f0527.
 * Addresses checked against the exact ROM and existing Mesen snapshots. All
 * exported Y coordinates point down; native DKC Y points UP from level height. */
export const DKC={entrance:0x3e,loadedScene:0x40,height:0x4a,currentKong:0x56f,x:0xb19,y:0xbc1,id:0xd45,attributes:0xc69,state:0x1029,vx:0xe89,vy:0xef1,hit:0x1595,cameraX:0x88b,cameraY:0x895} as const;
export const DKC_ROM_SHA256='628147468c3539283197f58f03b94df49758a332831857481ea9cc31645f0527';
export const DKC_ENEMIES=new Set([0x05,0x06,0x0e,0x19,0x1a,0x29,0x2f,0x46,0x4b,0x4d,0x4f,0x50,0x53,0x54,0x55,0x56]);
const word=(w:Uint8Array,p:number)=>w[p]|w[p+1]<<8;
const signed=(n:number)=>(n&0x8000)?n-0x10000:n;
/** These are ENTRANCE IDs, not level IDs: entrance0 is invalid (the separate
 * level ID0 is Jungle Hijinxs), EA is Reptile Rumble, EB invalid map. EE..FF
 * are Cranky/Funky/Candy interiors and retain their original presentation. */
export function isDkcStageEntrance(level:number):boolean{return Number.isInteger(level)&&level>0&&(level<0xe6||level===0xea);}
export function readDkcScene(w:Uint8Array){
 // $3E becomes the highlighted destination on maps. The native loader uses
 // $40 for the loaded/pending scene, falling back to $3E when $40 is zero.
 const selectedEntrance=word(w,DKC.entrance),level=word(w,DKC.loadedScene)||selectedEntrance,playerSlot=word(w,DKC.currentKong)===2?4:2;
 // Both entrance fields become the highlighted destination on a stable map.
 // $32 is 1 at the bootstrap but remains 0 after a genuine native stage exit;
 // the native overworld actor and zero-height projection identify both.
 // The native map setup creates OWSpr10/12 atslot0 and clears levelheight.
 const id=word(w,DKC.id+playerSlot),mapActor=word(w,DKC.id),height=word(w,DKC.height);
 const isMap=height===0&&(mapActor===0x10||mapActor===0x12);
 return {level,selectedEntrance,isMap,playing:!isMap&&height>0&&isDkcStageEntrance(level)&&(id===1||id===2),playerSlot,grounded:Boolean(word(w,0x12a5+playerSlot)&1),
  x:word(w,DKC.x+playerSlot),y:word(w,DKC.height)-word(w,DKC.y+playerSlot),
  cameraX:word(w,DKC.cameraX),cameraY:word(w,DKC.cameraY)-signed(word(w,0x887)),
  facing:word(w,DKC.attributes+playerSlot)&0x4000?-1:1,
  vx:signed(word(w,DKC.vx+playerSlot)),vy:-signed(word(w,DKC.vy+playerSlot))};
}
export const dkcEnemies=enemies;
export interface DkcEnemy{slot:number;id:number;x:number;y:number;width:number;height:number}
/** Slots are BYTE OFFSETS (0,2,...0x32), not ordinal indices. Exclude the
 * separate simple-effect pool, scenery, items, bosses and native death state1. */
export function enemies(w:Uint8Array):DkcEnemy[]{
 if(!readDkcScene(w).playing)return[];
 const result:DkcEnemy[]=[];
 for(let slot=6;slot<0x34;slot+=2){
  const id=word(w,DKC.id+slot);const deadState=id===0x4b?5:(id===0x56||id===0x0e)?2:1;
  if(!DKC_ENEMIES.has(id)||word(w,DKC.state+slot)===deadState||word(w,DKC.hit+slot)!==0)continue;
  result.push({slot,id,x:word(w,DKC.x+slot),y:word(w,DKC.height)-word(w,DKC.y+slot),width:[6,0x46,0x50].includes(id)?36:28,height:[6,0x46,0x50].includes(id)?42:30});
 }
 return result;
}
/** Ask the native barrel/projectile collision path to do the kill. The original
 * enemy routine consumes1595=$20 and owns death, sound, palette and VRAM cleanup.
 * Never delete the ID alone: DKC also owns palette refs and tile occupancy. */
export function killDkcEnemy(w:Uint8Array,slot:number):boolean{
 if(!Number.isInteger(slot)||!enemies(w).some(e=>e.slot===slot))return false;
 w[DKC.hit+slot]=0x20;w[DKC.hit+slot+1]=0;return true;
}
const RENDER=0x3ba86b,GUARD=0x3bfe00;
/** Bank BB free zero padding, below the bank boundary and above collectible
 * mailbox FB:FDE0. Preserve X/Y and reload the original actor ID on both exits.
 * Mounted animations put the body on the Kong slot (hidden below), and the
 * native rider on the linked animal slot: BE8092 / BE8054 / BEBAD1. */
function renderGuard():Uint8Array{
 const b:number[]=[],labels=new Map<string,number>(),branches:{at:number;to:string}[]=[];
 const emit=(...v:number[])=>b.push(...v),label=(n:string)=>labels.set(n,b.length),branch=(op:number,to:string)=>{emit(op,0);branches.push({at:b.length-1,to});};
 emit(0xad,0x4a,0);branch(0xf0,'normal');emit(0xad,0x40,0);branch(0xd0,'scene');emit(0xad,0x3e,0);
 label('scene');branch(0xf0,'normal');emit(0xc9,0xe6,0);branch(0x90,'stage');emit(0xc9,0xea,0);branch(0xd0,'normal');
 label('stage');emit(0xb9,0x45,0x0d,0xc9,1,0);branch(0xf0,'skip');emit(0xc9,2,0);branch(0xf0,'skip');
 emit(0xc9,9,0);branch(0x90,'normal');emit(0xc9,13,0);branch(0xb0,'normal');
 emit(0xb9,0x75,0x13,0xc9,2,0);branch(0xf0,'dk');emit(0xc9,4,0);branch(0xd0,'normal');
 emit(0xcc,0x14,5);branch(0xf0,'skip');branch(0x80,'normal');
 label('dk');emit(0xcc,0x12,5);branch(0xf0,'skip');
 label('normal');emit(0xb9,0x45,0x0d,0x4c,0x6e,0xa8);
 label('skip');emit(0xb9,0x45,0x0d,0x4c,0x26,0xaa);
 for(const j of branches){const d=labels.get(j.to)!-j.at-1;if(Math.abs(d)>127)throw Error('Render guard branch overflow');b[j.at]=d&255;}
 if(b.length>0x100)throw Error('Render guard exceeds free ROM region');return new Uint8Array(b);
}
const guard=renderGuard();
export function validateDkcRom(rom:Uint8Array,base=0):void{
 for(const [offset,bytes]of [[0xe282,[0xa9,0x10,0,0x8d,0x45,0x0d,0xa9,0,0x2c]], [0xe4dc,[0x64,0x4a,0x9c,0x95,8,0xa9,0,2,0x8d,0x87,8]], [0x8179,[0xa5,0x40,0xd0,4,0xa5,0x3e,0x85,0x40,0xc9,0xeb,0]], [0x3ba864,[0xac,0xab,8,0xb9,0xb1,0x0a,0xa8,0xb9,0x45,0x0d,0xd0,3,0x4c,0x26,0xaa]], [0x3fc726,[0xa6,0x82,0xbd,0x95,0x15,0xd0,2,0x18,0x60,0xc9,1,0,0xf0,0x0a,0xc9,0x20,0,0xf0,5,0x9e,0x95,0x15]], [GUARD,Array(guard.length).fill(0)]] as const){
  if(!bytes.every((b,i)=>rom[base+offset+i]===b))throw new Error('Unsupported DKC ROM revision. Your existing game has been kept.');
 }
}
/** Verified render-only guard. The free zero padding is documented by the local
 * disassembly FREE_BYTES($FBF790,2160,$00). Original LDA continues at BBA86E;
 * in actual stage entrances (1..E5 and EA) IDs1/2 and verified linked animal rider actors take the existing skip-render path BBAA26. No physics is patched. */
export class DkcRenderHooks{
 private original:Uint8Array;
 constructor(private heap:Uint8Array,private base=0){validateDkcRom(heap,base);this.original=heap.slice(base+RENDER,base+RENDER+3);}
 setHidden(hidden:boolean):void{
  this.heap.set(hidden?guard:new Uint8Array(guard.length),this.base+GUARD);
  this.heap.set(hidden?new Uint8Array([0x4c,0x00,0xfe]):this.original,this.base+RENDER);
 }
 sync(hidden:boolean):void{this.setHidden(hidden);}
 restore():void{this.setHidden(false);}
}
export function patchDkcDrawing(rom:Uint8Array):Uint8Array{const copy=rom.slice();new DkcRenderHooks(copy).setHidden(true);return copy;}
