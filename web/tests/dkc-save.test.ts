import{readFileSync}from'node:fs';
import{describe,it,expect}from'vitest';
import{Adventure}from'../src/adventure';
import{encodeDkcSave,decodeDkcSave}from'../src/dkc-save';
import{validateDkcNativeState,validateNativeState}from'../src/snapshot';
const state=new Uint8Array(readFileSync(new URL('../public/bootstrap/dkc-map-snes9x-2.0.2.state',import.meta.url)));
describe('separate cartridge saves',()=>{
 it('accepts the actual DKC native map snapshot without SuperFX, never as a Yoshi snapshot',()=>{expect(()=>validateDkcNativeState(state)).not.toThrow();expect(()=>validateNativeState(state)).toThrow();});
 it('round trips the exact native campaign and companion/inventory metadata',()=>{const adventure=new Adventure().serialize(),combat={eggs:3,shots:[]};const bytes=encodeDkcSave({state,adventure,combat});const saved=decodeDkcSave(bytes);expect(Buffer.compare(Buffer.from(saved.state),Buffer.from(state))).toBe(0);expect(saved.adventure).toEqual(adventure);expect(saved.combat).toEqual(combat);});
 it('rejects a mismatched cartridge envelope instead of loading into another game',()=>{const bytes=encodeDkcSave({state,adventure:new Adventure().serialize(),combat:{eggs:0,shots:[]}});const text=new TextDecoder().decode(bytes.subarray(4,104));const at=text.indexOf('dkc');bytes[4+at]=120;expect(()=>decodeDkcSave(bytes)).toThrow('different game');});
 it('rejects truncated states and excessive metadata without replacing a save',()=>{expect(()=>decodeDkcSave(new Uint8Array([255,255,255,255,0]))).toThrow();expect(()=>encodeDkcSave({state:state.slice(0,500),adventure:new Adventure().serialize(),combat:{eggs:0,shots:[]}})).toThrow();});
});

it('round trips direct Drum HP and a pending native defeat without changing the native state',()=>{for(const hp of[3,0]){const drum={level:0xe3,slot:16,hp,maxHp:5,cooldown:30,defeatRequested:hp===0};const saved=decodeDkcSave(encodeDkcSave({state,adventure:new Adventure().serialize(),combat:{eggs:6,shots:[]},drum}));expect(saved.drum).toEqual(drum);expect(saved.state).toEqual(state);}});
it('ignores invalid supplementary Drum metadata while retaining the campaign save',()=>{const drum={level:0xe3,slot:16,hp:99,maxHp:5,cooldown:0,defeatRequested:false};const saved=decodeDkcSave(encodeDkcSave({state,adventure:new Adventure().serialize(),combat:{eggs:2,shots:[]},drum}));expect(saved.drum).toBeUndefined();expect(saved.combat.eggs).toBe(2);});

it('persists the one-time native duo initialization so loading cannot refill lost partners',()=>{const saved=decodeDkcSave(encodeDkcSave({state,adventure:new Adventure().serialize(),combat:{eggs:0,shots:[]},teamInitialized:true}));expect(saved.teamInitialized).toBe(true);});
