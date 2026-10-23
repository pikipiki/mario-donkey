export const ANIMALS=['rambi','winky','expresso','enguarde','squawks'] as const;
export type Animal=typeof ANIMALS[number];
export const CHARACTERS=['violet','pink','dk','diddy'] as const;
export type Character=typeof CHARACTERS[number];
export type Mount='foot'|'yoshi'|Animal;
export interface Pickup {id:string;room:string;kind:'barrel'|Animal;x:number;y:number;collected:boolean}
interface Room {distance:number;crates:number;nextCrate:number;samples:Array<{x:number;y:number}>;last?:{x:number;y:number}}
export interface AdventureData {version:2;characterSet?:1;active:Character;available:Character[];mount:Mount;animals:Animal[];pickups:Pickup[]}
const isAnimal=(x:unknown):x is Animal=>typeof x==='string'&&(ANIMALS as readonly string[]).includes(x);
export class Adventure {
 active:Character='violet';available:Character[]=[...CHARACTERS];mount:Mount='foot';animals:Animal[]=[];pickups:Pickup[]=[];
 private rooms=new Map<string,Room>();
 constructor(saved?:Partial<AdventureData>){
  if(saved?.version!==2)return;
  this.available=[...CHARACTERS];
  this.active=saved.characterSet===1&&this.available.includes(saved.active!)?saved.active!:'violet';
  this.animals=[...new Set((saved.animals??[]).filter(isAnimal))];
  if(saved.mount==='yoshi'||saved.mount==='foot'||this.animals.includes(saved.mount as Animal))this.mount=saved.mount!;
  this.pickups=(saved.pickups??[]).filter(p=>typeof p.id==='string'&&typeof p.room==='string'&&isAnimal(p.kind)&&Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(-512);
 }
 select(character:Character):boolean{if(!this.available.includes(character))return false;this.active=character;return true;}
 ride(mount:Mount):boolean{if(mount!=='foot'&&mount!=='yoshi'&&!this.animals.includes(mount))return false;this.mount=mount;return true;}
 /** Native damage releases Baby Mario; it must not hide the selected mount. */
 hit():void{}
 resetRoom(room:string):void{this.rooms.delete(room);this.pickups=this.pickups.filter(p=>p.room!==room);}
 /** Use only recorded grounded positions. Never guess a floor height ahead,
  * place an object in a pit, or consume one of the game's native sprite slots. */
 observe(room:string,x:number,y:number,grounded:boolean):void{
  if(!grounded)return;
  let state=this.rooms.get(room);
  if(!state){const existing=this.pickups.filter(p=>p.room===room);state={distance:0,crates:existing.filter(p=>p.kind!=='barrel').length,nextCrate:320,samples:[]};this.rooms.set(room,state);}
  const last=state.last;
  if(last){const distance=Math.hypot(x-last.x,y-last.y);if(distance<80)state.distance+=distance;}
  state.last={x,y};
  const sample=state.samples.at(-1);if(!sample||Math.hypot(x-sample.x,y-sample.y)>=12)state.samples.push({x,y});
  if(state.samples.length>96)state.samples.shift();
  const anchor=state.samples.find(p=>Math.abs(p.x-x)>=48&&Math.abs(p.x-x)<=88&&Math.abs(p.y-y)<=24);
  if(!anchor)return;
  const near=this.pickups.some(p=>p.room===room&&!p.collected&&Math.hypot(p.x-anchor.x,p.y-anchor.y)<64);
  if(near)return;
  const spawn=(kind:Pickup['kind'])=>this.pickups.push({id:`${room}:${kind}:${this.pickups.filter(p=>p.room===room).length}`,room,kind,x:anchor.x,y:anchor.y,collected:false});
  if(state.crates<2&&state.distance>=state.nextCrate){const hash=[...room].reduce((n,c)=>n+c.charCodeAt(0),0);spawn(ANIMALS[(hash+state.crates)%ANIMALS.length]);state.crates++;state.nextCrate=state.distance+1500;}
 }
 nearby(room:string):Pickup[]{return this.pickups.filter(p=>p.room===room&&!p.collected);}
 breakNearby(room:string,x:number,y:number,attacking:boolean):Pickup[]{
  if(!attacking)return[];
  const hits=this.nearby(room).filter(p=>Math.abs(p.x-x)<=34&&Math.abs(p.y-y)<=30);
  for(const p of hits){p.collected=true;if(p.kind==='barrel')this.available=[...CHARACTERS];else{if(!this.animals.includes(p.kind))this.animals.push(p.kind);this.mount=p.kind;}}
  return hits;
 }
 serialize():AdventureData{return {version:2,characterSet:1,active:this.active,available:this.available,mount:this.mount,animals:this.animals,pickups:this.pickups.slice(-512)};}
}
