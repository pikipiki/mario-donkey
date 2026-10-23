import {describe,it,expect,vi} from 'vitest';
import {SpriteAtlas} from '../src/atlas';
function fixture(){const c={save:vi.fn(),restore:vi.fn(),translate:vi.fn(),scale:vi.fn(),drawImage:vi.fn(),imageSmoothingEnabled:true} as unknown as CanvasRenderingContext2D;const a=new SpriteAtlas({} as HTMLImageElement,{cell:96,columns:16,origin:[48,80],groups:{dk:{idle:{start:0,frames:4,fps:10},walk:{start:15,frames:4,fps:10},jump:{start:30,frames:3,fps:10}}}});return {a,c};}
describe('animations originales compactées',()=>{
 it('passe à la rangée suivante sans perdre de frame',()=>{const {a,c}=fixture();a.draw(c,'dk','walk',100,120,100);expect(c.drawImage).toHaveBeenCalledWith(a.image,0,96,96,96,-48,-80,96,96);});
 it('maintient la dernière pose de saut au lieu de boucler le décollage dans les airs',()=>{const {a,c}=fixture();a.draw(c,'dk','jump',100,120,2000);expect(c.drawImage).toHaveBeenCalledWith(a.image,0,192,96,96,-48,-80,96,96);});
 it('miroite uniquement le personnage, jamais le décor ou ses collisions',()=>{const {a,c}=fixture();a.draw(c,'dk','idle',100,120,0,-1);expect(c.translate).toHaveBeenCalledWith(100,120);expect(c.scale).toHaveBeenCalledWith(-1,1);expect(c.imageSmoothingEnabled).toBe(false);});
});
