import { describe, expect, it } from 'vitest';
import { hideNativePlayer, absorbHit, applyRoll, babyIsLost, dkcRun, patchYoshiDrawing, PROFILE as P, word, writeWord } from '../src/profile';
describe('correctif graphique ciblé',()=>{
 it('change uniquement le LDA de dessin Yoshi et conserve tout le reste',()=>{
  const source=new Uint8Array(512);source.set([0xad,0x1a,0x61,0xf0,0x6e,0xad,0xae,0x61,0x0d,0x57,0x0b],200);
  source.set([0x61,0xba,0xbe],400);const result=patchYoshiDrawing(source);
  expect([...result.slice(200,203)]).toEqual([0xa9,0,0]);expect(result.slice(203)).toEqual(source.slice(203));expect(result.slice(0,200)).toEqual(source.slice(0,200));expect(source[200]).toBe(0xad);
 });
 it('refuse de modifier une révision inconnue',()=>{expect(()=>patchYoshiDrawing(new Uint8Array(512))).toThrow();});
 it('distingue bébé monté et bébé perdu',()=>{const ram=new Uint8Array(0x8000);writeWord(ram,P.baby,0x8000);expect(babyIsLost(ram)).toBe(false);writeWord(ram,P.baby,0);expect(babyIsLost(ram)).toBe(true);});
 it('laisse Mario s’échapper et enlève seulement le gel',()=>{const ram=new Uint8Array(0x8000);writeWord(ram,P.baby,0);writeWord(ram,0x1ae,1);writeWord(ram,0x1b0,1);writeWord(ram,P.invincible,0x20);expect(absorbHit(ram)).toBe(true);expect(word(ram,P.baby)).toBe(0);expect(word(ram,0x1ae)).toBe(0);expect(word(ram,0x1b0)).toBe(0);writeWord(ram,P.baby,0x4000);writeWord(ram,0x1ae,1);expect(absorbHit(ram)).toBe(false);expect(word(ram,P.baby)).toBe(0x4000);expect(word(ram,0x1ae)).toBe(1);});
 it('laisse un tuyau verrouiller les commandes',()=>{const ram=new Uint8Array(0x8000);writeWord(ram,P.baby,0x8000);writeWord(ram,0x1ae,1);expect(absorbHit(ram)).toBe(false);expect(word(ram,0x1ae)).toBe(1);});
 it('keeps the goal ring lock',()=>{const ram=new Uint8Array(0x8000);writeWord(ram,0xac,0x14);writeWord(ram,P.baby,0);writeWord(ram,0x1ae,1);writeWord(ram,0x1b0,1);writeWord(ram,P.invincible,0x20);expect(absorbHit(ram)).toBe(false);expect(word(ram,0x1ae)).toBe(1);expect(word(ram,0x1b0)).toBe(1);expect(word(ram,P.baby)).toBe(0);writeWord(ram,0xac,0);writeWord(ram,P.baby,0x8000);writeWord(ram,P.spriteId,0x0d);writeWord(ram,P.spriteState,0x10);writeWord(ram,P.x,100);writeWord(ram,P.spriteX,120);writeWord(ram,P.y,200);writeWord(ram,P.spriteY,210);expect(absorbHit(ram)).toBe(false);expect(word(ram,0x1ae)).toBe(1);});
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
 it('retire un pot de fleur sans lancer son script',()=>{const ram=fixture(0x66,110,1910);expect(applyRoll(ram,1)).toHaveLength(1);expect(word(ram,P.spriteState+4)).toBe(0);expect(word(ram,P.spriteId+4)).toBe(0x66);});
 it('ne déverrouille pas un objet pendant la courte invincibilité de la roulade',()=>{const ram=new Uint8Array(0x8000);writeWord(ram,P.baby,0x8000);writeWord(ram,0x1ae,1);writeWord(ram,P.invincible,4);expect(absorbHit(ram)).toBe(false);expect(word(ram,0x1ae)).toBe(1);writeWord(ram,P.invincible,0xa0);expect(absorbHit(ram)).toBe(true);expect(word(ram,0x1ae)).toBe(0);});
});

it('returns a defeated plant’s dynamic graphics without releasing another sprite’s tiles',()=>{
 const g=new Uint8Array(0x8000),slot=3,o=slot*4;
 writeWord(g,P.x,100);writeWord(g,P.y,100);writeWord(g,P.spriteState+o,0x10);writeWord(g,P.spriteId+o,0x66);writeWord(g,P.spriteX+o,115);writeWord(g,P.spriteY+o,100);
 g[0x1722+o]=4;writeWord(g,0x1ed2,0x30);writeWord(g,0x1ecc,0x7f);writeWord(g,0x1b6,o);
 expect(applyRoll(g,1)).toHaveLength(1);expect(word(g,0x1ecc)).toBe(0x4f);expect(word(g,0x14a2+o)).toBe(0xff);expect(word(g,0x1b6)).toBe(0);
 expect(word(g,P.spriteId+o)).toBe(0x66);
});
it('protects the goal ring, collectible flowers and pots containing progression items',()=>{
 for(const id of [0x0d,0x110,0xda]){const g=new Uint8Array(0x8000);writeWord(g,P.x,100);writeWord(g,P.y,100);writeWord(g,P.spriteState+4,0x10);writeWord(g,P.spriteId+4,id);writeWord(g,P.spriteX+4,110);writeWord(g,P.spriteY+4,100);expect(applyRoll(g,1)).toEqual([]);expect(word(g,P.spriteState+4)).toBe(0x10);}
});

it('restores native drawing for victory cinematics and maps, while keeping the gameplay replacement',()=>{
 expect(hideNativePlayer(0x13,'foot',0)).toBe(true);
 for(const mode of [0x14,0x15,0x23,0x26])expect(hideNativePlayer(mode,'foot',0)).toBe(false);
 expect(hideNativePlayer(0x13,'yoshi',0)).toBe(false);expect(hideNativePlayer(0x13,'foot',2)).toBe(false);
});
