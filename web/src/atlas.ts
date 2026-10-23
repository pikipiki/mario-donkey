export interface Animation {start:number;frames:number;fps:number}
export interface AtlasManifest {cell:number;columns:number;origin:[number,number];groups:Record<string,Record<string,Animation>>}
export class SpriteAtlas {
 constructor(public image:HTMLImageElement,public manifest:AtlasManifest){}
 static async load():Promise<SpriteAtlas>{const image=new Image();image.src='/art/dkc-atlas.png';const [manifest]=await Promise.all([fetch('/art/dkc-atlas.json').then(r=>{if(!r.ok)throw new Error('Atlas original introuvable.');return r.json() as Promise<AtlasManifest>;}),image.decode()]);return new SpriteAtlas(image,manifest);}
 draw(ctx:CanvasRenderingContext2D,group:string,state:string,x:number,y:number,time:number,facing=1):void{
  const states=this.manifest.groups[group];if(!states)return;const a=states[state]??states.idle;if(!a)return;
  const {cell,origin}=this.manifest;const step=Math.floor(time*a.fps/1000);const frame=a.start+(state==='jump'?Math.min(a.frames-1,step):step%a.frames);
  ctx.save();ctx.translate(Math.round(x),Math.round(y));if(facing<0)ctx.scale(-1,1);ctx.imageSmoothingEnabled=false;
  ctx.drawImage(this.image,(frame%this.manifest.columns)*cell,Math.floor(frame/this.manifest.columns)*cell,cell,cell,-origin[0],-origin[1],cell,cell);ctx.restore();
 }
}
