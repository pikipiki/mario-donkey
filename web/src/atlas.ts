export interface Animation {start:number;frames:number;fps:number}
export interface AtlasManifest {cell:number;columns:number;origin:[number,number];groups:Record<string,Record<string,Animation>>}
export interface PlushManifest {frames:Array<{x:number;y:number;w:number;h:number;ox:number;oy:number}>;groups:Record<string,number[]>}
export class SpriteAtlas {
 constructor(public image:HTMLImageElement,public manifest:AtlasManifest,public plush?:{image:HTMLImageElement;manifest:PlushManifest}){}
 static async load():Promise<SpriteAtlas>{const b=import.meta.env.BASE_URL;const image=new Image();image.src=`${b}art/dkc-atlas.png`;const [manifest]=await Promise.all([fetch(`${b}art/dkc-atlas.json`).then(r=>{if(!r.ok)throw new Error('The original sprite atlas was not found.');return r.json() as Promise<AtlasManifest>;}),image.decode()]);const plushImage=new Image();plushImage.src=`${b}art/plush.png`;const [plushManifest]=await Promise.all([fetch(`${b}art/plush.json`).then(r=>{if(!r.ok)throw new Error('The PlushGoonk animations were not found.');return r.json() as Promise<PlushManifest>;}),plushImage.decode()]);return new SpriteAtlas(image,manifest,{image:plushImage,manifest:plushManifest});}
 draw(ctx:CanvasRenderingContext2D,group:string,state:string,x:number,y:number,time:number,facing=1):void{
  if(group==='violet'||group==='pink'){
   if(!this.plush)return;
   const indices=this.plush.manifest.groups[`${group}_${state}`]??this.plush.manifest.groups[`${group}_idle`];if(!indices?.length)return;
   const step=Math.floor(time*(state==='walk'?12:state==='roll'?16:5)/1000);
   const frame=this.plush.manifest.frames[indices[state==='jump'?Math.min(indices.length-1,step):step%indices.length]];if(!frame)return;
   const scale=state==='ride'?.64:.72;
   ctx.save();ctx.translate(Math.round(x),Math.round(y)-(state==='ride'?22:0));if(facing<0)ctx.scale(-1,1);ctx.imageSmoothingEnabled=true;
   ctx.drawImage(this.plush.image,frame.x,frame.y,frame.w,frame.h,frame.ox*scale,frame.oy*scale,frame.w*scale,frame.h*scale);ctx.restore();return;
  }
  const states=this.manifest.groups[group];if(!states)return;const a=states[state]??states.idle;if(!a)return;
  const {cell,origin}=this.manifest;const step=Math.floor(time*a.fps/1000);const frame=a.start+(state==='jump'?Math.min(a.frames-1,step):step%a.frames);
  ctx.save();ctx.translate(Math.round(x),Math.round(y));if(facing<0)ctx.scale(-1,1);ctx.imageSmoothingEnabled=false;
  ctx.drawImage(this.image,(frame%this.manifest.columns)*cell,Math.floor(frame/this.manifest.columns)*cell,cell,cell,-origin[0],-origin[1],cell,cell);ctx.restore();
 }
}
