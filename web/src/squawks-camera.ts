import{PROFILE,word,writeWord,canModifyJump,babyIsLost}from'./profile';
/** EU GSU camera $0996DB uses $1E0A to follow Yoshi upward while airborne.
 * Squawks has no native extended-flutter state, so request this existing flag.
 * $1E1C/1E1E bounds and $09975F empty-screen streaming remain entirely native.
 * Exact EU main_camera file $27D70 uses WRAM freeze0C90, auto0C1E,
 * mosaic0B57, event0B59 (the USA disassembly labels are two bytes earlier).
 * Never write WRAM camera $3B or GSU camera $9C directly. */
export class SquawksCamera{
 private held?:{room:string;original:number};
 update(g:Uint8Array,w:Uint8Array,enabled:boolean,room:string):boolean{
  // A new room owns freshly initialized camera state. Forget the old lease,
  // do not write its saved flag into the new room.
  if(this.held&&this.held.room!==room)this.held=undefined;
  const safe=enabled&&w[PROFILE.mode]===PROFILE.gameplay&&canModifyJump(g)&&!babyIsLost(g)&&word(g,0xc0)!==0&&
   word(g,0x1e2a)===0&&word(w,0xd11)===0&&word(w,0xc90)===0&&word(w,0xc1e)===0&&word(w,0xb57)===0&&word(w,0xb59)===0&&word(w,0x398)===0;
  if(!safe){this.restore(g,room);return false;}
  if(!this.held)this.held={room,original:word(g,0x1e0a)};
  writeWord(g,0x1e0a,1);return true;
 }
 restore(g:Uint8Array,room:string):void{
  const held=this.held;this.held=undefined;
  // Retain any fresh native value (landing, script or another owner).
  if(held?.room===room&&word(g,0x1e0a)===1)writeWord(g,0x1e0a,held.original);
 }
}
