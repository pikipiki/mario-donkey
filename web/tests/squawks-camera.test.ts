import{readFileSync}from'node:fs';
import{describe,it,expect}from'vitest';
import{SquawksCamera}from'../src/squawks-camera';
import{word,writeWord}from'../src/profile';
function fixture(){const g=new Uint8Array(0x8000),w=new Uint8Array(0x20000),camera=new SquawksCamera();w[0x118]=0x13;writeWord(g,0x1b2,0x8000);writeWord(g,0xc0,6);writeWord(g,0x1e1c,0);writeWord(g,0x1e1e,1804);writeWord(g,0x9c,1700);writeWord(w,0x3b,1700);return{g,w,camera};}
describe('Squawks native camera follow lease',()=>{
 it('requests native upward following without changing camera, bounds, terrain or room state',()=>{const{g,w,camera}=fixture(),beforeG=g.slice(),beforeW=w.slice();expect(camera.update(g,w,true,'room')).toBe(true);writeWord(beforeG,0x1e0a,1);expect(g).toEqual(beforeG);expect(w).toEqual(beforeW);});
 it('restores the prior follow flag on dismount, landing or a scripted lock',()=>{for(const stop of['dismount','land','lock']){const{g,w,camera}=fixture();expect(camera.update(g,w,true,'room')).toBe(true);if(stop==='land')writeWord(g,0xc0,0);if(stop==='lock')writeWord(g,0x1ae,1);expect(camera.update(g,w,stop!=='dismount','room')).toBe(false);expect(word(g,0x1e0a)).toBe(0);}});
 it('does not overwrite newly loaded camera state on a room change',()=>{const{g,w,camera}=fixture();camera.update(g,w,true,'old');writeWord(g,0x1e0a,7);camera.update(g,w,false,'new');expect(word(g,0x1e0a)).toBe(7);});
 it('never takes over camera events, automatic scrolling, menus, morphs or lost Baby Mario',()=>{for(const[memory,offset,value]of[['g',0x1e2a,1],['w',0xc1e,1],['w',0xc90,1],['w',0xd11,1],['w',0xb57,1],['w',0xb59,1],['w',0x398,1],['g',0xae,6],['g',0xac,0x14],['g',0x1b2,0]]as const){const{g,w,camera}=fixture();writeWord(memory==='g'?g:w,offset,value);const beforeG=g.slice(),beforeW=w.slice();expect(camera.update(g,w,true,'room')).toBe(false);expect(g).toEqual(beforeG);expect(w).toEqual(beforeW);}});
 it('keeps a native nonzero follow value and does not clobber a native rewrite',()=>{const{g,w,camera}=fixture();writeWord(g,0x1e0a,2);camera.update(g,w,true,'room');camera.update(g,w,false,'room');expect(word(g,0x1e0a)).toBe(2);camera.update(g,w,true,'room');writeWord(g,0x1e0a,3);camera.restore(g,'room');expect(word(g,0x1e0a)).toBe(3);});
});

it('does not mistake the unrelated EU B55=FF00 value for a freeze timer',()=>{const{g,w,camera}=fixture();writeWord(w,0xb55,0xff00);expect(camera.update(g,w,true,'room')).toBe(true);});

it('matches the exact EU camera routine addresses rather than the USA label offsets',()=>{const rom=new Uint8Array(readFileSync(new URL('../public/rom/yoshi-eu.sfc',import.meta.url)));expect(Array.from(rom.slice(0x27d70,0x27d70+52))).toEqual([0x8b,0x4b,0xab,0xc2,0x20,0xad,0x11,0x0d,0xf0,0x03,0x4c,0x09,0xfe,0xad,0x2a,0x7e,0x0d,0x59,0x0b,0xd0,0x18,0xad,0xae,0x61,0x0d,0x90,0x0c,0x0d,0x57,0x0b,0x0d,0x98,0x03,0xd0,0x76,0xad,0x4e,0x61,0xf0,0x05,0xc9,0x05,0x00,0xb0,0x6c,0xc2,0x10,0xad,0x1e,0x0c,0xa8,0xf0]);});
