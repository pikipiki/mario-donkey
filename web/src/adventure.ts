import {validateGuardian,type GuardianSave} from './boss';
export const ANIMALS=['rambi','winky','expresso','enguarde','squawks'] as const;
export type Animal=typeof ANIMALS[number];
export const CHARACTERS=['violet','pink','dk','diddy','mario'] as const;
export type Character=typeof CHARACTERS[number];
/** Display names only: stable IDs keep existing saves and sprite assets valid. */
export const CHARACTER_NAMES:Readonly<Record<Character,string>>={violet:'Bobope',pink:'Paingpaing',dk:'Donkey',diddy:'Diddy',mario:'Mario + Yoshi'};
export type Mount='foot'|'yoshi'|Animal;
export interface Pickup {id:string;room:string;kind:'barrel'|Animal;x:number;y:number;collected:boolean}
interface Room {distance:number;crates:number;nextCrate:number;samples:Array<{x:number;y:number}>;last?:{x:number;y:number}}
export interface AdventureData {version:2;characterSet?:1;active:Character;team?:[Character,Character];available:Character[];mount:Mount;animals:Animal[];pickups:Pickup[];guardian?:GuardianSave}
const isAnimal=(x:unknown):x is Animal=>typeof x==='string'&&(ANIMALS as readonly string[]).includes(x);
export class Adventure {
 active:Character='violet';team:[Character,Character]=['violet','pink'];available:Character[]=[...CHARACTERS];mount:Mount='foot';animals:Animal[]=[];pickups:Pickup[]=[];
 guardian?:GuardianSave;
 private rooms=new Map<string,Room>();
 constructor(saved?:Partial<AdventureData>){
  if(saved?.version!==2)return;
  this.guardian=validateGuardian(saved.guardian);
  this.available=[...CHARACTERS];
  this.active=saved.characterSet===1&&this.available.includes(saved.active!)?saved.active!:'violet';
  const pair=saved.team;if(Array.isArray(pair)&&pair.length===2&&pair[0]!==pair[1]&&pair.every(c=>this.available.includes(c))&&pair.includes(this.active))this.team=[pair[0],pair[1]];else this.team=[this.active,this.active==='violet'?'pink':'violet'];
  this.animals=[...new Set((saved.animals??[]).filter(isAnimal))];
  if(saved.mount==='yoshi'||saved.mount==='foot'||this.animals.includes(saved.mount as Animal))this.mount=saved.mount!;
  if(this.active==='mario')this.mount='yoshi';
  this.pickups=(saved.pickups??[]).filter(p=>typeof p.id==='string'&&typeof p.room==='string'&&isAnimal(p.kind)&&Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(-512);
 }
 get partner():Character{return this.team[0]===this.active?this.team[1]:this.team[0];}
 setTeam(first:Character,second:Character):boolean{if(first===second||!this.available.includes(first)||!this.available.includes(second))return false;this.team=[first,second];this.active=first;if(first==='mario')this.mount='yoshi';return true;}
 swapTeam():boolean{return this.select(this.partner);}
 select(character:Character):boolean{if(!this.available.includes(character))return false;if(!this.team.includes(character))this.team=[this.active,character];this.active=character;if(character==='mario')this.mount='yoshi';return true;}
 ride(mount:Mount):boolean{if(this.active==='mario'&&mount!=='yoshi')return false;if(mount!=='foot'&&mount!=='yoshi'&&!this.animals.includes(mount))return false;this.mount=mount;return true;}
 /** Switch to native Yoshi as soon as Baby Mario escapes, keeping the rider. */
 hit():void{this.mount='yoshi';}
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
  for(const p of hits){p.collected=true;if(p.kind==='barrel')this.available=[...CHARACTERS];else{if(!this.animals.includes(p.kind))this.animals.push(p.kind);this.ride(p.kind);}}
  return hits;
 }
 serialize():AdventureData{return {version:2,characterSet:1,active:this.active,team:this.team.includes(this.active)?[...this.team]:[this.active,this.partner],available:this.available,mount:this.mount,animals:this.animals,pickups:this.pickups.slice(-512),...(this.guardian?{guardian:this.guardian}:{})};}
}
