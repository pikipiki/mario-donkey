import { describe, expect, it } from 'vitest';
import { applyRoll, babyIsLost, dkcRun, holdBabyStars, patchYoshiDrawing, PROFILE as P, word, writeWord } from '../src/profile';
describe('correctif graphique ciblé',()=>{
 it('change uniquement le LDA de dessin Yoshi et conserve tout le reste',()=>{
  const source=new Uint8Array(512);source.set([0xad,0x1a,0x61,0xf0,0x6e,0xad,0xae,0x61,0x0d,0x57,0x0b],200);
  source.set([0x61,0xba,0xbe],400);const result=patchYoshiDrawing(source);
  expect([...result.slice(200,203)]).toEqual([0xa9,0,0]);expect(result.slice(203)).toEqual(source.slice(203));expect(result.slice(0,200)).toEqual(source.slice(0,200));expect(source[200]).toBe(0xad);
 });
 it('refuse de modifier une révision inconnue',()=>{expect(()=>patchYoshiDrawing(new Uint8Array(512))).toThrow();});
 it('distingue bébé monté et bébé perdu',()=>{const ram=new Uint8Array(0x8000);writeWord(ram,P.baby,0x8000);expect(babyIsLost(ram)).toBe(false);writeWord(ram,P.baby,0);expect(babyIsLost(ram)).toBe(true);});
 it('empêche le décompte d’atteindre la fuite de Mario',()=>{expect(holdBabyStars(200,true)).toBeUndefined();expect(holdBabyStars(10,true)).toBe(30);expect(holdBabyStars(0,false)).toBeUndefined();});
 it('accélère et dérape comme un Kong',()=>{expect(dkcRun(0,1)).toBe(0x1c);expect(dkcRun(0x2a0,1)).toBe(0x2a0);expect(dkcRun(0x2a0,0)).toBe(0x2a0-0x1c);expect(dkcRun(0x100,-1)).toBe(0x100-0x48);});
});
describe('roulade offensive',()=>{
 function fixture(id=0x1e,x=116,y=1904){const ram=new Uint8Array(0x8000);writeWord(ram,P.x,100);writeWord(ram,P.y,1904);writeWord(ram,P.spriteState+4,0x10);writeWord(ram,P.spriteId+4,id);writeWord(ram,P.spriteX+4,x);writeWord(ram,P.spriteY+4,y);return ram;}
 it('déclenche la mort native et son effet sonore sur un Shy Guy proche',()=>{const ram=fixture();expect(applyRoll(ram,1)).toHaveLength(1);expect(word(ram,P.spriteState+4)).toBe(0x0c);expect(word(ram,P.sound)).toBe(0x11);expect(applyRoll(ram,1)).toHaveLength(0);});
 it('ne touche jamais Baby Mario',()=>{const ram=fixture(0x61);expect(applyRoll(ram,1)).toEqual([]);expect(word(ram,P.spriteState+4)).toBe(0x10);});
 it('préserve les portes et les seaux',()=>{expect(applyRoll(fixture(0x1f),1)).toEqual([]);expect(applyRoll(fixture(0x21),1)).toEqual([]);});
 it('ne tue pas un ennemi sur une autre plateforme',()=>{expect(applyRoll(fixture(0x1e,116,1800),1)).toEqual([]);});
 it('ne touche pas un ennemi hors de portée ou derrière',()=>{expect(applyRoll(fixture(0x1e,200),1)).toEqual([]);expect(applyRoll(fixture(0x1e,70),1)).toEqual([]);});
 it('fonctionne en roulant à gauche',()=>{expect(applyRoll(fixture(0x1e,75),-1)).toHaveLength(1);});
});
