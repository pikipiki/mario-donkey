// Offline capture helper. Execute the existing TypeScript factory builder only;
// this VM cannot access the filesystem or network and never runs the game bridge.
import ts from 'typescript';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/boss-eggs.ts',import.meta.url),'utf8');
const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:()=>({})});
process.stdout.write(JSON.stringify([...exports.nativeEggRefillProgram()]));
