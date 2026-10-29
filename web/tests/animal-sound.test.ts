import {afterEach,describe,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {AnimalAudio,AnimalSoundTracker,ANIMAL_EFFECTS,type AnimalSoundFrame} from '../src/animal-sound';
const frame=(values:Partial<AnimalSoundFrame>={}):AnimalSoundFrame=>({mount:'rambi',room:'1-1',x:100,y:200,airborne:false,vy:0,enabled:true,rolling:false,flying:false,hit:false,...values});
afterEach(()=>vi.unstubAllGlobals());
describe('animal actions use real motion',()=>{
 it.each(['winky','rambi','expresso','enguarde'] as const)('%s jumps once at actual takeoff, not on repeated input',mount=>{
  const tracker=new AnimalSoundTracker();tracker.update(frame({mount}),0);
  expect(tracker.update(frame({mount}),16)).toEqual([]);
  expect(tracker.update(frame({mount,airborne:true,vy:-100}),32)).toContain('animal-jump');
  expect(tracker.update(frame({mount,airborne:true,vy:-100}),48)).not.toContain('animal-jump');
 });
 it('does not lose an attack started in the first frame after mounting',()=>{
  const tracker=new AnimalSoundTracker();expect(tracker.update(frame({mount:'enguarde',rolling:true}),0)).toEqual(['enguarde-attack']);
  expect(tracker.update(frame({mount:'enguarde',rolling:true}),16)).toEqual([]);
 });
 it('does not invent a jump after pause, teleport or room change',()=>{
  const tracker=new AnimalSoundTracker();tracker.update(frame(),0);tracker.reset();
  expect(tracker.update(frame({airborne:true,vy:-100}),16)).toEqual([]);
  expect(tracker.update(frame({room:'other',airborne:true,vy:-100}),32)).toEqual([]);
  expect(tracker.update(frame({x:500,airborne:true,vy:-100}),48)).toEqual([]);
 });
 it('lands once and alternates distance-based Rambi steps without footsteps at rest',()=>{
  const tracker=new AnimalSoundTracker();tracker.update(frame({airborne:true}),0);
  expect(tracker.update(frame(),16)).toEqual(['rambi-land']);
  expect(tracker.update(frame(),32)).toEqual([]);
  expect(tracker.update(frame({x:124}),150)).toEqual(['rambi-step-1']);
  expect(tracker.update(frame({x:124}),300)).toEqual([]);
  expect(tracker.update(frame({x:148}),450)).toEqual(['rambi-step-2']);
 });
 it('does not play Rambi landing or steps on the other mounts',()=>{
  const tracker=new AnimalSoundTracker();tracker.update(frame({mount:'winky',airborne:true}),0);
  expect(tracker.update(frame({mount:'winky'}),16)).toEqual([]);
  expect(tracker.update(frame({mount:'winky',x:130}),200)).toEqual([]);
 });
 it.each([['rambi','rambi-attack'],['enguarde','enguarde-attack']] as const)('%s attack starts once and confirmed hits have an effect', (mount,effect)=>{
  const tracker=new AnimalSoundTracker();tracker.update(frame({mount}),0);
  expect(tracker.update(frame({mount,rolling:true}),16)).toEqual([effect]);
  expect(tracker.update(frame({mount,rolling:true}),32)).toEqual([]);
  expect(tracker.update(frame({mount,rolling:true,hit:true}),48)).toEqual(['animal-hit']);
 });
 it.each(['squawks','expresso'] as const)('bounds %s wing effects while sustained flight continues',mount=>{
  const tracker=new AnimalSoundTracker();tracker.update(frame({mount}),0);
  expect(tracker.update(frame({mount,airborne:true,vy:-100,flying:true}),16)).toContain('wing-flap');
  expect(tracker.update(frame({mount,airborne:true,vy:-100,flying:true}),32)).not.toContain('wing-flap');
  expect(tracker.update(frame({mount,airborne:true,vy:-100,flying:true}),300)).toContain('wing-flap');
  expect(tracker.update(frame({mount,airborne:true,vy:100,flying:false}),600)).not.toContain('wing-flap');
 });
 it('stays silent on maps, locked scenes and Baby Mario rescue',()=>{
  const tracker=new AnimalSoundTracker();tracker.update(frame(),0);
  expect(tracker.update(frame({enabled:false,rolling:true,hit:true,airborne:true,vy:-300}),16)).toEqual([]);
  expect(tracker.update(frame({mount:'yoshi',rolling:true,hit:true}),32)).toEqual([]);
  expect(tracker.update(frame({mount:'foot',rolling:true,hit:true}),48)).toEqual([]);
 });
 it('spaces idle panting and resets it when movement restarts',()=>{
  const tracker=new AnimalSoundTracker();tracker.update(frame(),0);
  expect(tracker.update(frame(),3999)).toEqual([]);
  expect(tracker.update(frame(),4000)).toEqual(['rambi-pant']);
  expect(tracker.update(frame(),4016)).toEqual([]);
  tracker.update(frame({x:110}),5000);expect(tracker.update(frame({x:110}),8000)).toEqual([]);
 });
});
const manifest=JSON.parse(readFileSync(new URL('../public/audio/dkc-animals.json',import.meta.url),'utf8'));
describe('native ROM sound bank',()=>{
 it('contains every cue, matches its recorded digest and has useful nonclipped PCM',()=>{
  const wav=readFileSync(new URL('../public/audio/dkc-animals.wav',import.meta.url));
  expect(wav.subarray(0,4).toString()).toBe('RIFF');expect(wav.subarray(8,12).toString()).toBe('WAVE');
  expect(wav.readUInt16LE(22)).toBe(1);expect(wav.readUInt32LE(24)).toBe(32000);expect(wav.readUInt16LE(34)).toBe(16);
  expect(createHash('sha256').update(wav).digest('hex')).toBe(manifest.bankSha256);
  expect(manifest.romSha256).toBe('628147468c3539283197f58f03b94df49758a332831857481ea9cc31645f0527');
  for(const name of ANIMAL_EFFECTS){
   const cue=manifest.effects[name],start=44+Math.round(cue.offset*32000)*2,end=start+Math.round(cue.duration*32000)*2;
   expect(end).toBeLessThanOrEqual(wav.length);expect(cue.duration).toBeGreaterThan(.025);
   let peak=0;for(let i=start;i<end;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));
   expect(peak).toBe(cue.peak);expect(peak).toBeGreaterThan(100);expect(peak).toBeLessThan(32767);
  }
  expect(manifest.effects['wing-flap'].soundId).toBe(0x59);expect(manifest.effects['enguarde-attack'].soundId).toBe(0x57);
 });
});
function audioFixture(){
 const sources:Array<{start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>;onended?:()=>void}>=[];
 const context={state:'running',currentTime:0,destination:{},decodeAudioData:vi.fn(async()=>({duration:8})),
  createGain:vi.fn(()=>({gain:{value:1},connect:vi.fn(),disconnect:vi.fn()})),
  createBufferSource:vi.fn(()=>{const source={start:vi.fn(),stop:vi.fn(),disconnect:vi.fn(),connect:vi.fn()};sources.push(source);return source;})};
 const fetch=vi.fn(async(url:string)=>({ok:true,json:async()=>manifest,arrayBuffer:async()=>new ArrayBuffer(8)}));
 vi.stubGlobal('fetch',fetch);return {context,sources,fetch,player:new AnimalAudio()};
}
describe('mobile Web Audio playback',()=>{
 it('fetches and decodes once, uses the existing context and does not replay missed effects',async()=>{
  const {context,sources,fetch,player}=audioFixture();expect(player.play('animal-jump')).toBe(false);
  await Promise.all([player.prepare(context as unknown as AudioContext),player.prepare(context as unknown as AudioContext)]);
  expect(fetch).toHaveBeenCalledTimes(2);expect(context.decodeAudioData).toHaveBeenCalledTimes(1);expect(sources).toHaveLength(0);
  expect(player.play('animal-jump')).toBe(true);expect(sources[0].start).toHaveBeenCalledWith(0,manifest.effects['animal-jump'].offset,manifest.effects['animal-jump'].duration);
  await player.prepare(context as unknown as AudioContext);expect(fetch).toHaveBeenCalledTimes(2);
 });
 it('caps overlapping voices, stops all of them on pause and skips suspended audio',async()=>{
  const {context,sources,player}=audioFixture();await player.prepare(context as unknown as AudioContext);
  for(const cue of ANIMAL_EFFECTS.slice(0,4))expect(player.play(cue)).toBe(true);
  expect(player.play('animal-jump')).toBe(false);expect(player.play('rambi-land')).toBe(false);
  player.stop();for(const source of sources)expect(source.stop).toHaveBeenCalledOnce();
  context.state='suspended';expect(player.play('animal-jump')).toBe(false);
  context.state='running';expect(player.play('animal-jump')).toBe(true);
 });
 it('contains network failure and leaves the game free to continue',async()=>{
  const {context,player,fetch}=audioFixture();fetch.mockRejectedValue(new Error('offline'));const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
  await expect(player.prepare(context as unknown as AudioContext)).resolves.toBeUndefined();expect(player.ready).toBe(false);expect(player.play('animal-jump')).toBe(false);
  await player.prepare(context as unknown as AudioContext);expect(fetch).toHaveBeenCalledTimes(2);warn.mockRestore();
 });
});
