import {describe,it,expect,vi} from 'vitest';
import {SpriteAtlas} from '../src/atlas';
function fixture(){const c={save:vi.fn(),restore:vi.fn(),translate:vi.fn(),scale:vi.fn(),drawImage:vi.fn(),imageSmoothingEnabled:true} as unknown as CanvasRenderingContext2D;const a=new SpriteAtlas({} as HTMLImageElement,{cell:96,columns:16,origin:[48,80],groups:{dk:{idle:{start:0,frames:4,fps:10},walk:{start:15,frames:4,fps:10},jump:{start:30,frames:3,fps:10}}}});return {a,c};}
describe('animations originales compactées',()=>{
 it('passe à la rangée suivante sans perdre de frame',()=>{const {a,c}=fixture();a.draw(c,'dk','walk',100,120,100);expect(c.drawImage).toHaveBeenCalledWith(a.image,0,96,96,96,-48,-80,96,96);});
 it('maintient la dernière pose de saut au lieu de boucler le décollage dans les airs',()=>{const {a,c}=fixture();a.draw(c,'dk','jump',100,120,2000);expect(c.drawImage).toHaveBeenCalledWith(a.image,0,192,96,96,-48,-80,96,96);});
 it('miroite uniquement le personnage, jamais le décor ou ses collisions',()=>{const {a,c}=fixture();a.draw(c,'dk','idle',100,120,0,-1);expect(c.translate).toHaveBeenCalledWith(100,120);expect(c.scale).toHaveBeenCalledWith(-1,1);expect(c.imageSmoothingEnabled).toBe(false);});
});

describe('PlushGoonk model renders',()=>{
 it('draws violet roll frames and mirrors the model without moving world coordinates',()=>{
 const {a,c}=fixture();const image={} as HTMLImageElement;a.plush={image,manifest:{frames:[{x:1,y:2,w:50,h:51,ox:-24,oy:-47},{x:60,y:2,w:50,h:51,ox:-24,oy:-47}],groups:{violet_roll:[0,1]}}};
 a.draw(c,'violet','roll',100,120,70,-1);expect(c.drawImage).toHaveBeenCalledWith(image,60,2,50,51,-24*.72,-47*.72,50*.72,51*.72);expect(c.scale).toHaveBeenCalledWith(-1,1);
 });
 it('uses the sitting animation above the native Yoshi saddle',()=>{
 const {a,c}=fixture();a.plush={image:{} as HTMLImageElement,manifest:{frames:[{x:0,y:0,w:40,h:40,ox:-20,oy:-36}],groups:{pink_ride:[0]}}};a.draw(c,'pink','ride',100,120,0);expect(c.translate).toHaveBeenCalledWith(100,98);
 });
});
