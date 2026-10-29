import{cheatStorageKey,sandboxEntries,CHEAT_PREFIX}from'./cheats';
function database(): Promise<IDBDatabase> { return new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>reject(new Error('Local storage is unavailable.')),3000);
 const request=indexedDB.open(import.meta.env.DEV&&new URLSearchParams(location.search).get('test')==='1'?'kong-island-local-test-v2':'kong-island-local',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('files');
 request.onsuccess=()=>{clearTimeout(timeout);resolve(request.result)};request.onerror=()=>{clearTimeout(timeout);reject(request.error)};request.onblocked=()=>{clearTimeout(timeout);reject(new Error('Local storage is blocked.'))};
}); }
export async function storeFile(key: string, bytes: Uint8Array): Promise<void> {
 const actualKey=cheatStorageKey(key);const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(bytes,actualKey);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}
export async function loadFile(key: string): Promise<Uint8Array|undefined> {
 const actualKey=cheatStorageKey(key);const db=await database();try{return await new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(actualKey);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}finally{db.close();}
}

/** Atomic sandbox refresh. No normal save is overwritten or deleted. */
export async function cloneUnlockSandbox():Promise<void>{
 const db=await database();try{await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('files','readwrite'),files=tx.objectStore('files'),keys=files.getAllKeys(),values=files.getAll();let done=0;
  const copy=()=>{if(++done<2)return;const entries=keys.result.map((key,i)=>[String(key),values.result[i]]as const);for(const[key]of entries)if(key.startsWith(CHEAT_PREFIX))files.delete(key);for(const[key,value]of sandboxEntries(entries))files.put(value,key);};
  keys.onsuccess=copy;values.onsuccess=copy;tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('La copie de sauvegarde a été interrompue.'));
 });}finally{db.close();}
}

/** DEV audit reads raw keys, deliberately bypassing the active namespace. */
export async function cheatSaveAudit():Promise<Array<{key:string;bytes:number;sha256:string}>>{
 const db=await database();let entries:Array<[string,Uint8Array]>;
 try{entries=await new Promise((resolve,reject)=>{const tx=db.transaction('files'),store=tx.objectStore('files'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>resolve(keys.result.map((key,i)=>[String(key),values.result[i]]));tx.onerror=()=>reject(tx.error);});}finally{db.close();}
 return Promise.all(entries.filter(([key])=>key.includes('campaign-v')||key.includes('dkc-map-v')||key.includes('world-party-v')).map(async([key,value])=>({key,bytes:value.length,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',value.slice().buffer))).map(b=>b.toString(16).padStart(2,'0')).join('')})));
}
