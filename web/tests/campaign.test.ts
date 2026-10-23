import {describe,it,expect} from 'vitest';
import {Adventure} from '../src/adventure';
import {encodeCampaign,decodeCampaign} from '../src/campaign';
describe('sauvegarde complète de campagne',()=>{
 it('préserve les octets natifs et les compagnons sans limitation au premier niveau',()=>{const a=new Adventure();a.available=['dk','diddy'];a.animals=['enguarde'];a.mount='enguarde';const state=new Uint8Array([0,6,8,255,0,17,19]);const restored=decodeCampaign(encodeCampaign(state,a.serialize()));expect(restored.state).toEqual(state);expect(restored.adventure).toEqual(a.serialize());});
 it('refuse une sauvegarde tronquée et un en-tête hors limites',()=>{expect(()=>decodeCampaign(new Uint8Array(2))).toThrow();expect(()=>decodeCampaign(new Uint8Array([255,255,255,255,1]))).toThrow();const bytes=encodeCampaign(new Uint8Array([1]),new Adventure().serialize());expect(()=>decodeCampaign(bytes.subarray(0,bytes.length-2))).toThrow();});
});
