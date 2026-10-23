import {describe,it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {validateStartState} from '../src/bootstrap';
describe('bundled initial level',()=>{
 it('validates the shipped snapshot for the exact bundled core',async()=>{
  const bytes=new Uint8Array(await readFile(new URL('../public/bootstrap/yoshi-eu-map-snes9x-2.0.2.state',import.meta.url)));
  expect(await validateStartState(bytes)).toBe(bytes);
 });
 it('rejects truncated files and HTML fallback responses',async()=>{
  await expect(validateStartState(new TextEncoder().encode('<html>Not found</html>'))).rejects.toThrow('incomplete');
  await expect(validateStartState(new Uint8Array(100))).rejects.toThrow('incomplete');
 });
});
