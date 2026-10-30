import{setSoundEnabled}from'../src/sound-preference';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {BossAudio,bossTrack} from '../src/boss-audio';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function fixture(){
 const sources:any[]=[];
 const context={state:'running',currentTime:10,destination:{},decodeAudioData:vi.fn().mockResolvedValue({duration:40}),createBufferSource:vi.fn(()=>{const source={connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),loop:false,loopStart:0,loopEnd:0,onended:undefined};sources.push(source);return source;}),createGain:vi.fn(()=>({gain:{value:0},connect:vi.fn(),disconnect:vi.fn()}))};
 const meta={version:1,tracks:{dkc:{file:'boss-dkc.mp3',duration:30,loopStart:2,loopEnd:24},'k-rool':{file:'boss-k-rool.mp3',duration:30,loopStart:0,loopEnd:30},yoshi:{file:'boss-yoshi.mp3',duration:30,loopStart:1,loopEnd:28},'yoshi-major':{file:'boss-yoshi-major.mp3',duration:30,loopStart:0,loopEnd:30}}};
 const effects={version:1,effects:Object.fromEntries(['boss-hit','boss-throw','boss-stomp','boss-land','boss-laugh','necky-defeat','yoshi-jump','yoshi-land','yoshi-hit','yoshi-defeat','salvo-hit','boo-hit','boss-hurt','boss-explode'].map((name,i)=>[name,{offset:i,duration:.5}]))};
 const fetcher=vi.fn(async(url:string)=>({ok:true,json:async()=>url.includes('boss-music.json')?meta:effects,arrayBuffer:async()=>new ArrayBuffer(4)}));vi.stubGlobal('fetch',fetcher);
 return {context:context as unknown as AudioContext,sources,fetcher};
}
const dkc={world:'dkc' as const,id:'necky',phase:'fight'};
describe('original boss audio',()=>{
 it('selects the donor boss themes, including K.Rool, Burt and Salvo',()=>{
  expect(bossTrack(dkc)).toBe('dkc');expect(bossTrack({...dkc,id:'k-rool'})).toBe('k-rool');expect(bossTrack({world:'yoshi',id:'burt'})).toBe('yoshi');expect(bossTrack({world:'yoshi',id:'salvo'})).toBe('yoshi-major');
 });
 it('preloads once and starts only one loop without changing native emulator volume',async()=>{
  const f=fixture(),audio=new BossAudio();await Promise.all([audio.prepare(f.context),audio.prepare(f.context)]);
  expect(f.fetcher.mock.calls.filter(([url])=>url.endsWith('boss-dkc.mp3'))).toHaveLength(1);
  expect(audio.sync(f.context,dkc)).toBe(true);expect(audio.sync(f.context,dkc)).toBe(true);expect(f.sources).toHaveLength(1);expect(f.sources[0].loop).toBe(true);expect(f.sources[0].loopStart).toBe(2);expect(f.sources[0].loopEnd).toBe(24);
 });
 it('preserves playback position during pause and stops at the exit',async()=>{
  const f=fixture(),audio=new BossAudio();await audio.prepare(f.context);audio.sync(f.context,dkc);Object.assign(f.context,{currentTime:15});
  expect(audio.sync(f.context,{...dkc,paused:true})).toBe(false);expect(f.sources[0].stop).toHaveBeenCalledOnce();
  expect(audio.sync(f.context,dkc)).toBe(true);expect(f.sources[1].start).toHaveBeenCalledWith(0,5);
  expect(audio.sync(f.context,{...dkc,phase:'exit'})).toBe(false);expect(audio.playing).toBe(false);
 });
 it('does not play during suspension or missing music and recovers when loaded',async()=>{
  const f=fixture(),audio=new BossAudio();expect(audio.sync(f.context,dkc)).toBe(false);await audio.prepare(f.context);Object.assign(f.context,{state:'suspended'});expect(audio.sync(f.context,dkc)).toBe(false);Object.assign(f.context,{state:'running'});expect(audio.sync(f.context,dkc)).toBe(true);
 });
 it('plays original attacks/hits/deaths with rate and polyphony bounds',async()=>{
  const f=fixture(),audio=new BossAudio();await audio.prepare(f.context);expect(audio.effect('attack')).toBe(false);audio.sync(f.context,dkc);
  expect(audio.effect('attack')).toBe(true);expect(audio.effect('attack')).toBe(false);expect(audio.effect('hit')).toBe(true);expect(audio.effect('defeat','necky')).toBe(true);expect(audio.lastEffect).toBe('necky-defeat');audio.pause();expect(audio.effect('hit')).toBe(false);
 });
 it('switches donor music without leaving the previous source playing',async()=>{
  const f=fixture(),audio=new BossAudio();await audio.prepare(f.context);audio.sync(f.context,dkc);await audio.prepare(f.context,'yoshi','burt');expect(audio.sync(f.context,{world:'yoshi',id:'burt',phase:'intro'})).toBe(true);expect(f.sources[0].stop).toHaveBeenCalledOnce();expect(f.sources[1].start).toHaveBeenCalledWith(0,0);
 });
 it('uses Burt’s own jump, impact and defeat effects in the DKC world',async()=>{
  const f=fixture(),audio=new BossAudio();await audio.prepare(f.context,'yoshi','burt');audio.sync(f.context,{world:'yoshi',id:'burt',phase:'fight'});
  expect(audio.effect('attack','burt')).toBe(true);expect(audio.lastEffect).toBe('yoshi-jump');expect(audio.effect('land','burt')).toBe(true);expect(audio.lastEffect).toBe('yoshi-land');expect(audio.effect('hit','burt')).toBe(true);expect(audio.lastEffect).toBe('yoshi-hit');
 });
});

it('plays loaded hit FX even when the music loop has not loaded yet, while respecting pause',async()=>{const f=fixture(),audio=new BossAudio();await audio.prepare(f.context);f.context.createBufferSource=(()=>{const source={connect:()=>{},disconnect:()=>{},start:()=>{throw Error('music unavailable')},stop:()=>{}};return source;}) as unknown as AudioContext['createBufferSource'];expect(audio.sync(f.context,dkc)).toBe(false);Object.assign(f.context,{createBufferSource:()=>({connect:()=>{},disconnect:()=>{},start:()=>{},stop:()=>{}})});expect(audio.effect('hit','gnawty')).toBe(true);audio.pause();expect(audio.effect('hit','gnawty')).toBe(false);});

it.each([['salvo','salvo-hit'],['bigger-boo','boo-hit'],['milde','boss-hurt'],['raphael','boss-hurt'],['tap-tap','boss-hurt']])('plays the native %s hurt cue then the Yoshi boss explosion',async(id,cue)=>{
 const f=fixture(),audio=new BossAudio();await audio.prepare(f.context,'yoshi',id);audio.sync(f.context,{world:'yoshi',id,phase:'fight'});expect(audio.effect('hit',id)).toBe(true);expect(audio.lastEffect).toBe(cue);expect(audio.effect('defeat',id)).toBe(true);expect(audio.lastEffect).toBe('boss-explode');
});

it('silences an already-playing boss loop through the shared gate and restores it without restarting the track',async()=>{const f=fixture(),audio=new BossAudio();await audio.prepare(f.context);audio.sync(f.context,dkc);const gains=(f.context.createGain as ReturnType<typeof vi.fn>).mock.results.map(r=>r.value);const output=gains.find(g=>g.gain.value===1);expect(output).toBeDefined();try{setSoundEnabled(false);expect(output.gain.value).toBe(0);expect(f.sources[0].stop).not.toHaveBeenCalled();setSoundEnabled(true);expect(output.gain.value).toBe(1);expect(f.sources).toHaveLength(1);}finally{setSoundEnabled(true);}});
