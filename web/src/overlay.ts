/** Preserve the source sprite detail without a full device-resolution framebuffer.
 * Plush frames are ~50–70 px, displayed at .64–.72 logical scale: 2x already
 * retains their texels. Larger buffers add fill cost without new source detail.
 */
export function overlayScale(width:number,height:number,dpr:number,videoHeight:number):number{
 const density=Number.isFinite(dpr)&&dpr>0?dpr:1;
 return Math.min(2,Math.max(1,Math.ceil(Math.max(width*density/256,height*density/videoHeight))));
}

export function configureOverlay(canvas:HTMLCanvasElement,videoHeight:number):void{
 const context=canvas.getContext('2d')!;
 const resize=()=>{
  const bounds=canvas.getBoundingClientRect();
  const scale=overlayScale(bounds.width,bounds.height,window.devicePixelRatio,videoHeight);
  const width=256*scale,height=videoHeight*scale;
  if(canvas.width===width&&canvas.height===height)return;
  canvas.width=width;canvas.height=height;
  // All gameplay, camera and collision coordinates stay in native SNES pixels.
  context.setTransform(scale,0,0,scale,0,0);
 };
 resize();
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 // Also catches a density change when moving the window between displays.
 window.addEventListener('resize',resize,{passive:true});
}
