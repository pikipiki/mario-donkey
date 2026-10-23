import {describe,it,expect} from 'vitest';
import {PROFILE,skipOpenDialogue,word} from '../src/profile';
describe('passer les instructions par le script natif',()=>{
 it('termine le script seulement pendant la lecture puis laisse la fermeture au jeu',()=>{const w=new Uint8Array(0x20000),s=new Uint8Array(0x8000);w[PROFILE.mode]=0x13;w[0xd11]=9;expect(skipOpenDialogue(w,s)).toBe(true);expect(word(s,0x406e)).toBe(2);expect(w[0xd11]).toBe(9);});
 it('ne court-circuite ni ouverture, ni initialisation, ni fermeture, ni carte du monde',()=>{for(const mode of [0x13,0x23])for(const state of [0,1,3,5,7,11,13]){const w=new Uint8Array(0x20000),s=new Uint8Array(0x8000);w[PROFILE.mode]=mode;w[0xd11]=state;expect(skipOpenDialogue(w,s)).toBe(false);expect(word(s,0x406e)).toBe(0);}});
});

it('ignore l’adresse américaine et protège les octets voisins du profil Europe',()=>{const w=new Uint8Array(0x20000),s=new Uint8Array(0x8000);w[PROFILE.mode]=0x13;w[0xd0f]=9;w[0xd10]=0x77;expect(skipOpenDialogue(w,s)).toBe(false);w[0xd11]=9;expect(skipOpenDialogue(w,s)).toBe(true);expect(w[0xd0f]).toBe(9);expect(w[0xd10]).toBe(0x77);});
