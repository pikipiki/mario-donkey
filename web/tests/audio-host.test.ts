import{describe,it,expect,vi}from'vitest';
import{installAudioHost,parentAudioHost,syncHostRoute}from'../src/audio-host';
import{detachNativeMixer}from'../src/engine';
function fixture(){
 const media={play:vi.fn(()=>Promise.resolve()),setAttribute:vi.fn()},instances:FakeAudio[]=[];
 class FakeAudio{state='suspended';destination={};close=vi.fn();createBuffer=vi.fn(()=>({}));createBufferSource=vi.fn(()=>({connect:vi.fn(),start:vi.fn()}));resume=vi.fn(()=>{this.state='running';return Promise.resolve();});constructor(){instances.push(this);}}
 const owner={AudioContext:FakeAudio,navigator:{audioSession:{type:'ambient'}},document:{createElement:vi.fn(()=>media)},history:{replaceState:vi.fn()}} as unknown as Window;
 return{owner,media,instances};
}
describe('permanent mobile audio owner across pipe navigation',()=>{
 it('owns one running context and one media unlock across successive game frames',()=>{
  const{owner,instances,media}=fixture(),host=installAudioHost(owner,'/');
  host.prime();const original=host.context;expect(original?.state).toBe('running');
  const first={parent:owner}as Window,second={parent:owner}as Window;
  expect(parentAudioHost(first)).toBe(host);parentAudioHost(second)!.prime();
  expect(host.context).toBe(original);expect(instances).toHaveLength(1);expect(host.generation).toBe(1);expect(installAudioHost(owner,'/')).toBe(host);expect(media.play).toHaveBeenCalledTimes(2);expect(instances[0].close).not.toHaveBeenCalled();
 });
 it('disposes old native gains without closing or suspending the persistent audio context',()=>{
  const{owner,instances}=fixture(),host=installAudioHost(owner,'/');host.prime();const gain={disconnect:vi.fn()},slot={audioCtx:host.context!,gain:gain as unknown as GainNode};detachNativeMixer({AL:{contexts:{0:slot},currentCtx:slot}});
  expect(gain.disconnect).toHaveBeenCalledOnce();expect(host.context?.state).toBe('running');expect(instances[0].close).not.toHaveBeenCalled();
 });
 it('updates the address bar without navigating the outer document or leaking the internal frame marker',()=>{
  const{owner}=fixture();installAudioHost(owner,'/');const child={parent:owner,location:{href:'https://example.test/game/?world=yoshi&test=1&game-frame=1'}}as unknown as Window;syncHostRoute(child);
  expect(owner.history.replaceState).toHaveBeenCalledWith(null,'','https://example.test/game/?world=yoshi&test=1');
 });
 it('does not access unrelated cross-origin parents',()=>{const child={get parent(){throw Error('cross origin');}}as unknown as Window;expect(parentAudioHost(child)).toBeUndefined();expect(()=>syncHostRoute(child)).not.toThrow();});
});
