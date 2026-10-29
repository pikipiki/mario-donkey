import{describe,it,expect,vi}from'vitest';
import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{YoshiCombatAudio,YOSHI_COMBAT_EFFECTS}from'../src/yoshi-combat-audio';
const meta=JSON.parse(readFileSync(new URL('../public/audio/yoshi-combat.json',import.meta.url),'utf8'));
describe('native Yoshi combat FX in DKC',()=>{
 it('ships the verified ROM sound commands and a matching nonempty PCM bank',()=>{
 const wav=readFileSync(new URL('../public/audio/yoshi-combat.wav',import.meta.url));expect(createHash('sha256').update(wav).digest('hex')).toBe(meta.bankSha256);expect(meta.romSha256).toBe('91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90');
 expect(meta.effects.aim.soundId).toBe(0x1a);expect(meta.effects.throw.soundId).toBe(0x20);expect(meta.effects.tongue.soundId).toBe(0x3e);expect(meta.effects.make.soundId).toBe(4);
 for(const cue of Object.values(meta.effects) as {offset:number;duration:number;peak:number}[]){expect(cue.duration).toBeGreaterThan(0);expect(cue.peak).toBeGreaterThan(25);expect(cue.offset+cue.duration).toBeLessThan(wav.length/64000);}
 });
 it('uses the existing running audio context and drops paused or unavailable effects',async()=>{
 const oldFetch=globalThis.fetch;const sources:any[]=[];const context={state:'running',currentTime:0,destination:{},decodeAudioData:vi.fn(async()=>({duration:10})),createGain:()=>({gain:{value:1},connect:vi.fn(),disconnect:vi.fn()}),createBufferSource:()=>{const s={connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:undefined};sources.push(s);return s;}};
 globalThis.fetch=vi.fn(async(url:any)=>({ok:true,json:async()=>meta,arrayBuffer:async()=>new ArrayBuffer(20)})) as any;
 try{const audio=new YoshiCombatAudio();expect(audio.play('throw')).toBe(false);await audio.prepare(context as any);for(const name of YOSHI_COMBAT_EFFECTS){context.currentTime++;expect(audio.play(name)).toBe(true);sources.at(-1).onended?.();}expect(audio.lastEffect).toBe('impact');context.state='suspended';expect(audio.play('throw')).toBe(false);audio.stop();expect(audio.played).toBe(6);}finally{globalThis.fetch=oldFetch;}
 });
});
it('ships native damage and defeat cues for the new Yoshi guardians',()=>{
 const bank=JSON.parse(readFileSync(new URL('../public/audio/boss-yoshi-effects.json',import.meta.url),'utf8')),wav=readFileSync(new URL('../public/audio/boss-yoshi-effects.wav',import.meta.url));
 expect(createHash('sha256').update(wav).digest('hex')).toBe(bank.bankSha256);
 expect(bank.effects['salvo-hit'].soundId).toBe(0x3b);expect(bank.effects['boo-hit'].soundId).toBe(0x79);expect(bank.effects['boss-hurt'].soundId).toBe(0x78);expect(bank.effects['boss-explode'].soundId).toBe(0x74);
});
