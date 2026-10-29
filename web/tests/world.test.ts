import {describe,expect,it} from 'vitest';
import {Adventure} from '../src/adventure';
import {currentWorld,worldUrl,encodeWorldParty,decodeWorldParty} from '../src/world';
describe('world navigation',()=>{
 it('uses an explicit world ahead of remembered progress',()=>{
  expect(currentWorld('?world=yoshi','dkc')).toBe('yoshi');expect(currentWorld('?world=dkc','yoshi')).toBe('dkc');
  expect(currentWorld('?world=unknown','dkc')).toBe('yoshi');expect(currentWorld('','dkc')).toBe('dkc');expect(currentWorld('')).toBe('yoshi');
 });
 it('switches only the world and preserves isolated testing and the deployment path',()=>{
  const url=new URL(worldUrl('https://example.net/play/?debug=1&test=1&legacy=1#game','dkc'));
  expect(url.origin+url.pathname).toBe('https://example.net/play/');expect(url.searchParams.get('world')).toBe('dkc');expect(url.searchParams.get('debug')).toBe('1');expect(url.searchParams.get('test')).toBe('1');expect(url.searchParams.get('legacy')).toBe('1');expect(url.hash).toBe('#game');
  expect(new URL(worldUrl(url.href,'yoshi')).searchParams.get('world')).toBe('yoshi');
 });
});
describe('companions cross worlds without transplanting native progression',()=>{
 it('preserves the selected hero, mount and unlocked animals',()=>{
  const a=new Adventure();a.active='pink';a.animals=['rambi','squawks'];a.mount='rambi';
  const result=decodeWorldParty(encodeWorldParty(a.serialize()))!;
  expect(result.active).toBe('pink');expect(result.mount).toBe('rambi');expect(result.animals).toEqual(['rambi','squawks']);expect(result.available).toEqual(a.available);
 });
 it('does not transport Yoshi room pickups or a defeated guardian',()=>{
  const a=new Adventure();a.pickups=[{id:'old',room:'yoshi',kind:'rambi',x:50,y:80,collected:false}];
  const data=a.serialize();data.guardian={version:1,stage:0,room:'0',id:'gnawty',kind:'goal',slot:21,phase:'exit',hp:0,maxHp:3,x:50,y:80,floor:80,elapsed:3,phaseTime:0,nextAttack:2,hitUntil:0,facing:1,shots:[]};
  const result=decodeWorldParty(encodeWorldParty(data));expect(result?.guardian).toBeUndefined();expect(result?.pickups).toEqual([]);
 });
 it('rejects absent, malformed, oversized and unsupported transfer records',()=>{
  expect(decodeWorldParty(undefined)).toBeUndefined();expect(decodeWorldParty(new TextEncoder().encode('{'))).toBeUndefined();expect(decodeWorldParty(new Uint8Array(32769))).toBeUndefined();expect(decodeWorldParty(new TextEncoder().encode('{"version":1}'))).toBeUndefined();
 });
});
