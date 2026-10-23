function database(): Promise<IDBDatabase> { return new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>reject(new Error('Local storage is unavailable.')),3000);
 const request=indexedDB.open(import.meta.env.DEV&&new URLSearchParams(location.search).get('test')==='1'?'kong-island-local-test-v2':'kong-island-local',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('files');
 request.onsuccess=()=>{clearTimeout(timeout);resolve(request.result)};request.onerror=()=>{clearTimeout(timeout);reject(request.error)};request.onblocked=()=>{clearTimeout(timeout);reject(new Error('Local storage is blocked.'))};
}); }
export async function storeFile(key: string, bytes: Uint8Array): Promise<void> {
 const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(bytes,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}
export async function loadFile(key: string): Promise<Uint8Array|undefined> {
 const db=await database();try{return await new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}finally{db.close();}
}
