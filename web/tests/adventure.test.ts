import { describe,it,expect } from 'vitest';
import {Adventure,CHARACTERS} from '../src/adventure';
function walk(a:Adventure,room='1:0:room',start=0,end=1200,y=200){for(let x=start;x<=end;x+=12)a.observe(room,x,y,true);}
describe('compagnons et objets de campagne',()=>{
 it('garde les deux Kong disponibles sans tonneaux DK',()=>{const a=new Adventure();expect(a.select('diddy')).toBe(true);expect(a.ride('rambi')).toBe(false);expect(a.ride('yoshi')).toBe(true);});
 it('pose les caisses animales sur un sol réellement traversé',()=>{const a=new Adventure();walk(a,'r',0,400,237);const p=a.nearby('r')[0];expect(p.kind).not.toBe('barrel');expect(p.x%12).toBe(0);expect(p.y).toBe(237);expect(p.x).toBeLessThan(400);});
 it('ne génère pas de sol ni de caisse pendant un saut ou une chute',()=>{const a=new Adventure();for(let x=0;x<5000;x+=12)a.observe('r',x,200,false);expect(a.pickups).toEqual([]);});
 it('une blessure conserve les deux Kong et la monture visible',()=>{const a=new Adventure();a.active='diddy';a.mount='yoshi';a.hit();expect(a.available).toEqual([...CHARACTERS]);expect(a.active).toBe('diddy');expect(a.mount).toBe('yoshi');});
 it('retire les tonneaux des anciennes sauvegardes sans perdre les animaux',()=>{const a=new Adventure({version:2,active:'diddy',available:['dk'],animals:['rambi'],pickups:[{id:'old',room:'r',kind:'barrel',x:0,y:0,collected:false}]});expect(a.available).toEqual([...CHARACTERS]);expect(a.active).toBe('violet');expect(a.animals).toEqual(['rambi']);expect(a.pickups).toEqual([]);});
 it('une caisse libère et monte un animal, sans modifier la disponibilité de Yoshi',()=>{const a=new Adventure();walk(a,'r');const p=a.pickups.find(p=>p.kind!=='barrel')!;expect(p).toBeDefined();a.breakNearby('r',p.x,p.y,true);expect(a.animals).toContain(p.kind);expect(a.mount).toBe(p.kind);expect(a.ride('yoshi')).toBe(true);});
 it('borne la densité, conserve les pièces voisines et respawn après reprise de vie',()=>{const a=new Adventure();walk(a,'r',0,10000);expect(a.pickups.filter(p=>p.kind==='barrel').length).toBe(0);expect(a.pickups.filter(p=>p.kind!=='barrel').length).toBeLessThanOrEqual(2);walk(a,'other',0,400);a.resetRoom('r');expect(a.nearby('r')).toEqual([]);expect(a.nearby('other').length).toBeGreaterThan(0);});
 it('restaure la progression et rejette les montures invalides',()=>{const a=new Adventure();walk(a);a.available=[...CHARACTERS];a.animals=['rambi'];a.mount='rambi';a.active='diddy';const b=new Adventure(a.serialize());expect(b.serialize()).toEqual(a.serialize());const bad=new Adventure({version:2,available:[],mount:'rambi',animals:[]});expect(bad.active).toBe('violet');expect(bad.mount).toBe('foot');});
});

describe('PlushGoonk selection and migration',()=>{
 it('starts with violet and makes every character available',()=>{const a=new Adventure();expect(a.active).toBe('violet');for(const character of CHARACTERS)expect(a.select(character)).toBe(true);});
 it('preserves explicit choices after migrating an old campaign to violet',()=>{const a=new Adventure({version:2,active:'dk',animals:['rambi'],mount:'rambi'});expect(a.active).toBe('violet');expect(a.mount).toBe('rambi');a.select('pink');expect(new Adventure(a.serialize()).active).toBe('pink');});
});

describe('Baby Mario rescue mount',()=>{
 it.each(CHARACTERS)('puts %s on Yoshi after a hit without losing characters or animals',character=>{
 const a=new Adventure();a.select(character);a.animals=['rambi'];a.ride('rambi');a.hit();expect(a.mount).toBe('yoshi');expect(a.active).toBe(character);expect(a.animals).toEqual(['rambi']);expect(a.available).toEqual([...CHARACTERS]);
 });
});

it('keeps Mario riding Yoshi through selection, save restoration and attempts to dismount',()=>{const a=new Adventure();expect(a.select('mario')).toBe(true);expect(a.mount).toBe('yoshi');expect(a.ride('foot')).toBe(false);const restored=new Adventure({...a.serialize(),mount:'foot'});expect(restored.active).toBe('mario');expect(restored.mount).toBe('yoshi');expect(restored.select('dk')).toBe(true);expect(restored.ride('foot')).toBe(true);});

it('unlocks an animal crate without taking Mario off Yoshi',()=>{const a=new Adventure();a.select('mario');walk(a,'r');const crate=a.pickups[0];a.breakNearby('r',crate.x,crate.y,true);expect(a.animals).toContain(crate.kind);expect(a.mount).toBe('yoshi');expect(a.active).toBe('mario');});
