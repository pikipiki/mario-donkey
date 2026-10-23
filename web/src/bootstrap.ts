/** Initial level 1-1 snapshot, exact Europe ROM and bundled Snes9x 2.0.2. */
export const START_STATE_HASH='d4464f265aed6b67db1af34127299fb7d189aac250c64a119f3ad1eecd531dfa';
export async function validateStartState(bytes:Uint8Array):Promise<Uint8Array>{
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==START_STATE_HASH)throw new Error('The starting level is incomplete. Reload the page to download it again.');
 return bytes;
}
export async function loadStartState():Promise<Uint8Array>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(`${import.meta.env.BASE_URL}bootstrap/yoshi-eu-snes9x-2.0.2.state`,{signal:controller.signal});
  if(!response.ok)throw new Error('Could not load the starting level. Reload the page to try again.');
  return await validateStartState(new Uint8Array(await response.arrayBuffer()));
 }finally{clearTimeout(timer);}
}
