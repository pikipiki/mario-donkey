/** Browsers can leave audio resume / IndexedDB pending indefinitely. */
export async function bounded<T>(operation:Promise<T>, milliseconds:number, fallback:T):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([operation,new Promise<T>(resolve=>{timer=setTimeout(()=>resolve(fallback),milliseconds);})]);}
 finally{clearTimeout(timer);}
}

/** A slow save read must not be mistaken for an absent save and overwritten. */
export async function readBeforeDeadline<T>(operation:Promise<T>,milliseconds:number):Promise<T>{
 const result=await bounded(operation.then(value=>({value})),milliseconds,undefined);
 if(!result)throw new Error('Your saved game is taking too long to read. Reload the page to retry.');
 return result.value;
}
