/** Initial world-map snapshot, exact Europe ROM and bundled Snes9x 2.0.2. */
export const START_STATE_HASH='45b5cc023e3d8f29ee804342f67e1b4eb954d7b2bb57ba0f85fe990430f4f75e';
export async function validateStartState(bytes:Uint8Array):Promise<Uint8Array>{
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==START_STATE_HASH)throw new Error('The starting level is incomplete. Reload the page to download it again.');
 return bytes;
}
export async function loadStartState():Promise<Uint8Array>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(`${import.meta.env.BASE_URL}bootstrap/yoshi-eu-map-snes9x-2.0.2.state`,{signal:controller.signal});
  if(!response.ok)throw new Error('Could not load the starting level. Reload the page to try again.');
  return await validateStartState(new Uint8Array(await response.arrayBuffer()));
 }finally{clearTimeout(timer);}
}
