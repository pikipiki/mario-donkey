export interface Animation {start:number;frames:number;fps:number}
export interface AtlasManifest {cell:number;columns:number;origin:[number,number];groups:Record<string,Record<string,Animation>>}
export interface PlushManifest {frames:Array<{x:number;y:number;w:number;h:number;ox:number;oy:number}>;groups:Record<string,number[]>}
export class SpriteAtlas {
 constructor(public image:HTMLImageElement,public manifest:AtlasManifest,public plush?:{image:HTMLImageElement;manifest:PlushManifest},public bosses?:{image:HTMLImageElement;manifest:AtlasManifest},public yoshiBosses?:{image:HTMLImageElement;manifest:AtlasManifest},public projectiles?:HTMLImageElement,public marioYoshi?:{image:HTMLImageElement;manifest:AtlasManifest},public combatArt?:HTMLImageElement,public guardians?:{image:HTMLImageElement;manifest:AtlasManifest}){}
 static async load():Promise<SpriteAtlas>{
  const b=import.meta.env.BASE_URL;
  const guardianImage=new Image();guardianImage.src=`${b}art/yoshi-guardians.png`;
  const combatImage=new Image();combatImage.src=`${b}art/yoshi-combat.png`;
  const marioYoshiImage=new Image();marioYoshiImage.src=`${b}art/mario-yoshi.png`;
  const projectileImage=new Image();projectileImage.src=`${b}art/yoshi-projectiles.png`;
  const image=new Image(),plushImage=new Image(),bossImage=new Image(),yoshiBossImage=new Image();
  image.src=`${b}art/dkc-atlas.png`;plushImage.src=`${b}art/plush.png`;bossImage.src=`${b}art/dkc-bosses.png`;yoshiBossImage.src=`${b}art/yoshi-bosses.png`;
  async function json<T>(name:string):Promise<T>{const r=await fetch(`${b}art/${name}.json`);if(!r.ok)throw new Error('The original sprite atlas was not found.');return r.json() as Promise<T>;}
  const [manifest,plushManifest,bossManifest,yoshiBossManifest,marioYoshiManifest,guardianManifest]=await Promise.all([json<AtlasManifest>('dkc-atlas'),json<PlushManifest>('plush'),json<AtlasManifest>('dkc-bosses'),json<AtlasManifest>('yoshi-bosses'),json<AtlasManifest>('mario-yoshi'),json<AtlasManifest>('yoshi-guardians'),guardianImage.decode(),combatImage.decode(),marioYoshiImage.decode(),yoshiBossImage.decode(),image.decode(),plushImage.decode(),bossImage.decode(),projectileImage.decode()]);
  return new SpriteAtlas(image,manifest,{image:plushImage,manifest:plushManifest},{image:bossImage,manifest:bossManifest},{image:yoshiBossImage,manifest:yoshiBossManifest},projectileImage,{image:marioYoshiImage,manifest:marioYoshiManifest},combatImage,{image:guardianImage,manifest:guardianManifest});
 }
 drawMarioYoshi(ctx:CanvasRenderingContext2D,state:string,x:number,y:number,time:number,facing=1):void{
  const rolling=state==='roll';
  const a=this.marioYoshi,animation=a?.manifest.groups['mario-yoshi']?.[rolling?'walk':state]??a?.manifest.groups['mario-yoshi']?.idle;if(!a||!animation)return;
  const {cell,columns,origin}=a.manifest,frame=animation.start+(state==='jump'?Math.min(animation.frames-1,Math.floor(time*animation.fps/1000)):Math.floor(time*animation.fps/1000)%animation.frames);
  ctx.save();ctx.translate(Math.round(x),Math.round(y)-(rolling?16:0));if(facing<0)ctx.scale(-1,1);if(rolling)ctx.rotate(time/1000*Math.PI*6);ctx.imageSmoothingEnabled=false;ctx.drawImage(a.image,frame%columns*cell,Math.floor(frame/columns)*cell,cell,cell,-origin[0],-origin[1]+(rolling?16:0),cell,cell);ctx.restore();
 }
 drawYoshi(ctx:CanvasRenderingContext2D,state:string,x:number,y:number,time:number,facing=1):void{
  const a=this.marioYoshi,rolling=state==='roll',key=rolling?'walk':state,animation=a?.manifest.groups.yoshi?.[key]??a?.manifest.groups.yoshi?.idle;if(!a||!animation)return;
  const{cell,columns,origin}=a.manifest,step=Math.floor(time*animation.fps/1000),frame=animation.start+(state==='jump'?Math.min(animation.frames-1,step):step%animation.frames);
  ctx.save();ctx.translate(Math.round(x),Math.round(y)-(rolling?12:0));if(facing<0)ctx.scale(-1,1);if(rolling)ctx.rotate(time/1000*Math.PI*6);ctx.imageSmoothingEnabled=false;ctx.drawImage(a.image,frame%columns*cell,Math.floor(frame/columns)*cell,cell,cell,-origin[0],-origin[1]+(rolling?12:0),cell,cell);ctx.restore();
 }
 drawEgg(ctx:CanvasRenderingContext2D,x:number,y:number,time=0,spin=false):void{
  if(!this.projectiles)return;const phase=spin?Math.floor(time/70)%4:0,index=[0,1,2,1][phase];
  ctx.save();ctx.translate(Math.round(x),Math.round(y));if(phase===3)ctx.scale(-1,1);ctx.imageSmoothingEnabled=false;ctx.drawImage(this.projectiles,index*16,0,16,16,-8,-8,16,16);ctx.restore();
 }
 drawEggEffect(ctx:CanvasRenderingContext2D,kind:'reticle'|'smoke',x:number,y:number,time:number):void{
  if(!this.combatArt)return;const frame=kind==='reticle'?Math.floor(time/90)%2:2+Math.min(3,Math.floor(Math.max(0,time)/50));
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(this.combatArt,frame*32,0,32,32,Math.round(x)-16,Math.round(y)-16,32,32);ctx.restore();
 }
 drawTongue(ctx:CanvasRenderingContext2D,x:number,y:number,endX:number,endY:number,progress:number):void{
  if(!this.projectiles)return;const dx=endX-x,dy=endY-y,length=Math.hypot(dx,dy)*Math.sin(Math.max(0,Math.min(1,progress))*Math.PI);
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(Math.atan2(dy,dx));ctx.imageSmoothingEnabled=false;
  for(let at=0;at<length-4;at+=8)ctx.drawImage(this.projectiles,64,0,8,8,at,-4,Math.min(8,length-at),8);
  ctx.drawImage(this.projectiles,48,0,8,8,length-4,-4,8,8);ctx.restore();
 }
 drawYoshiBoss(ctx:CanvasRenderingContext2D,state:string,x:number,y:number,time:number,id='burt'):void{
  const atlas=id==='burt'?this.yoshiBosses:this.guardians,animation=atlas?.manifest.groups[id]?.[state]??atlas?.manifest.groups[id]?.idle;if(!atlas||!animation)return;
  const {cell,columns,origin}=atlas.manifest,frame=animation.start+Math.floor(time*animation.fps/1000)%animation.frames;
  ctx.save();ctx.translate(Math.round(x),Math.round(y));const scale=id==='bigger-boo'?1.5:id==='raphael'?1.6:id==='tap-tap'?1.1:id==='froggy'?2:.78;ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
  ctx.drawImage(atlas.image,frame%columns*cell,Math.floor(frame/columns)*cell,cell,cell,-origin[0],-origin[1],cell,cell);ctx.restore();
 }
 drawBoss(ctx:CanvasRenderingContext2D,group:string,state:string,x:number,y:number,time:number,facing=1):void{
  const atlas=this.bosses,animation=atlas?.manifest.groups[group]?.[state]??atlas?.manifest.groups[group]?.idle;if(!atlas||!animation)return;
  const {cell,columns,origin}=atlas.manifest,frame=animation.start+Math.floor(time*animation.fps/1000)%animation.frames;
  ctx.save();ctx.translate(Math.round(x),Math.round(y));if(facing>0)ctx.scale(-1,1);ctx.imageSmoothingEnabled=false;
  ctx.drawImage(atlas.image,frame%columns*cell,Math.floor(frame/columns)*cell,cell,cell,-origin[0],-origin[1],cell,cell);ctx.restore();
 }

 draw(ctx:CanvasRenderingContext2D,group:string,state:string,x:number,y:number,time:number,facing=1):void{
  if(group==='mario'){this.drawMarioYoshi(ctx,state,x,y,time,facing);return;}
  if(group==='violet'||group==='pink'){
   if(!this.plush)return;
   const indices=this.plush.manifest.groups[`${group}_${state}`]??this.plush.manifest.groups[`${group}_idle`];if(!indices?.length)return;
   const step=Math.floor(time*(state==='walk'?12:state==='roll'?16:5)/1000);
   const frame=this.plush.manifest.frames[indices[state==='jump'?Math.min(indices.length-1,step):step%indices.length]];if(!frame)return;
   const scale=state==='ride'?.64:.72;
   ctx.save();ctx.translate(Math.round(x),Math.round(y)-(state==='ride'?22:0));if(facing<0)ctx.scale(-1,1);ctx.imageSmoothingEnabled=false;
   ctx.drawImage(this.plush.image,frame.x,frame.y,frame.w,frame.h,frame.ox*scale,frame.oy*scale,frame.w*scale,frame.h*scale);ctx.restore();return;
  }
  const states=this.manifest.groups[group];if(!states)return;const a=states[state]??states.idle;if(!a)return;
  const {cell,origin}=this.manifest;const step=Math.floor(time*a.fps/1000);const frame=a.start+(state==='jump'&&group!=='squawks'?Math.min(a.frames-1,step):step%a.frames);
  ctx.save();ctx.translate(Math.round(x),Math.round(y));if(facing<0)ctx.scale(-1,1);ctx.imageSmoothingEnabled=false;
  ctx.drawImage(this.image,(frame%this.manifest.columns)*cell,Math.floor(frame/this.manifest.columns)*cell,cell,cell,-origin[0],-origin[1],cell,cell);ctx.restore();
 }
}
