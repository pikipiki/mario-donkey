/** Pointer handlers already execute gameplay actions. Cancel Safari's separate
 * touch-end default so rapid taps cannot become smart zoom or a second click.
 * Do not cancel ordinary button/select taps: those still need their native click. */
export function installGameTouchGuards(root:HTMLElement):void{
 const cancel=(event:Event)=>{if(event.cancelable)event.preventDefault();};
 root.addEventListener('touchend',event=>{
  const target=event.target as Element|null;
  if(target?.closest?.('[data-control],#stick'))cancel(event);
 },{capture:true,passive:false});
 root.addEventListener('touchmove',event=>{if(event.touches.length>1)cancel(event);},{passive:false});
 root.addEventListener('dblclick',cancel,{passive:false});
 // Safari's gesture events do not consistently obey touch-action on descendants.
 for(const type of ['gesturestart','gesturechange'])root.addEventListener(type,cancel,{passive:false});
}
