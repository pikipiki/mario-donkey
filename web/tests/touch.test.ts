import {describe,it,expect,vi} from 'vitest';
import {installGameTouchGuards} from '../src/touch';
function fixture(){
 const handlers=new Map<string,{callback:(event:Event)=>void;options?:AddEventListenerOptions}>();
 const root={addEventListener:vi.fn((type:string,callback:(event:Event)=>void,options?:AddEventListenerOptions)=>handlers.set(type,{callback,options}))};
 installGameTouchGuards(root as unknown as HTMLElement);
 return (type:string,gameControl=false,touches=0,cancelable=true)=>{
 const event={target:{closest:()=>gameControl?{}:null},cancelable,touches:Array(touches).fill({}),preventDefault:vi.fn()} as unknown as TouchEvent;
 const handler=handlers.get(type)!;handler.callback(event);return {event,options:handler.options};
 };
}
describe('rapid mobile game taps',()=>{
 it.each(['portrait','landscape'])('cancels every repeated gameplay touch end in %s without relying on double-tap timing',()=>{
 const dispatch=fixture();for(let i=0;i<100;i++){const {event,options}=dispatch('touchend',true);expect(event.preventDefault).toHaveBeenCalledOnce();expect(options).toEqual({capture:true,passive:false});}
 });
 it('preserves native click generation on ordinary buttons and selects',()=>{const {event}=fixture()('touchend');expect(event.preventDefault).not.toHaveBeenCalled();});
 it('preserves one-finger options scrolling but cancels multi-touch zoom',()=>{const dispatch=fixture();expect(dispatch('touchmove',false,1).event.preventDefault).not.toHaveBeenCalled();expect(dispatch('touchmove',false,2).event.preventDefault).toHaveBeenCalledOnce();});
 it.each(['dblclick','gesturestart','gesturechange'])('cancels browser %s defaults without preventing event propagation to game input',type=>{const {event,options}=fixture()(type);expect(event.preventDefault).toHaveBeenCalledOnce();expect(options?.passive).toBe(false);});
 it('does not attempt to cancel a noncancelable touch',()=>{expect(fixture()('touchend',true,0,false).event.preventDefault).not.toHaveBeenCalled();});
});
