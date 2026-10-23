/** Mobile cores must render normally while the first save is prepared. */
export function mobileDevice(device: Pick<Navigator,'userAgent'|'platform'|'maxTouchPoints'>): boolean {
 return /Android|iPad|iPhone|iPod|Mobile|CriOS/i.test(device.userAgent)||(device.platform==='MacIntel'&&device.maxTouchPoints>1);
}
/** Browsers can leave audio resume / IndexedDB pending indefinitely. */
export async function bounded<T>(operation:Promise<T>, milliseconds:number, fallback:T):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([operation,new Promise<T>(resolve=>{timer=setTimeout(()=>resolve(fallback),milliseconds);})]);}
 finally{clearTimeout(timer);}
}
