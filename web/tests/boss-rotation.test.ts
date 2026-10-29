import{it,expect}from'vitest';
import{bossForStage,STAGE_BOSSES,yoshiStageOrdinal,validateGuardian}from'../src/boss';
import{dkcStageOrdinal,DKC_STAGE_ORDER,dkcStageName}from'../src/dkc-levels';
import{guardianForEntrance,YOSHI_GUARDIANS}from'../src/yoshi-guardian-spec';
import{DkcGuardian,validateDkcGuardian}from'../src/dkc-guardian';
import{pendingBossVictory}from'../src/dkc-boss-finish';
import{DKC}from'../src/dkc-profile';import{writeWord}from'../src/profile';
it('cycles all seven DKC bosses across all48 Yoshi main stages without repeats at world boundaries',()=>{
 const stages=Array.from({length:48},(_,i)=>Math.floor(i/8)*12+i%8),ids=stages.map(s=>bossForStage(s).id);
 stages.forEach((stage,i)=>{expect(yoshiStageOrdinal(stage)).toBe(i);expect(ids[i]).toBe(STAGE_BOSSES[i%7].id);if(i)expect(ids[i]).not.toBe(ids[i-1]);});
 for(let i=0;i+7<=ids.length;i++)expect(new Set(ids.slice(i,i+7)).size).toBe(7);
 expect(ids.slice(0,9)).toEqual(['gnawty','necky','queen-b','really-gnawty','dumb-drum','necky-snr','k-rool','gnawty','necky']);
});
it('assigns Yoshi extras after the main campaign and excludes menu slots',()=>{
 for(let world=0;world<6;world++){expect(yoshiStageOrdinal(world*12+8)).toBe(48+world);for(const menu of[9,10,11])expect(yoshiStageOrdinal(world*12+menu)).toBeUndefined();}
 for(const bad of[-1,72,1.2,NaN])expect(yoshiStageOrdinal(bad)).toBeUndefined();
});
it('cycles all seven Yoshi bosses across the40 DKC stages in native campaign order',()=>{
 expect(DKC_STAGE_ORDER).toHaveLength(40);expect(new Set(DKC_STAGE_ORDER.map(dkcStageName)).size).toBe(40);
 const ids=DKC_STAGE_ORDER.map((entrance,i)=>{expect(dkcStageOrdinal(entrance)).toBe(i);expect(guardianForEntrance(entrance)?.id).toBe(YOSHI_GUARDIANS[i%7].id);return guardianForEntrance(entrance)!.id;});
 for(let i=1;i<ids.length;i++)expect(ids[i]).not.toBe(ids[i-1]);for(let i=0;i+7<=ids.length;i++)expect(new Set(ids.slice(i,i+7)).size).toBe(7);
 expect(ids.slice(0,8)).toEqual(['burt','salvo','bigger-boo','milde','froggy','raphael','tap-tap','burt']);
});
it('keeps checkpoints and bonus rooms on the same boss instead of advancing or restarting rotation',()=>{
 for(const group of[[22,6,8,14,26,37,71,76,92,95,110],[12,15,27,28,111,112],[234,1,2,4,9,11,38,72,201],[46,56,204],[217,79,81,218],[7,3,16,17,21,120,121,151],[54,55,61,73,132,133]]){
  for(const entrance of group){expect(dkcStageOrdinal(entrance)).toBe(dkcStageOrdinal(group[0]));expect(guardianForEntrance(entrance)).toBe(guardianForEntrance(group[0]));}
 }
 for(const entrance of[0,33,52,94,108,166,210,211,235,236,237,238,244,250,NaN,1.5])expect(guardianForEntrance(entrance)).toBeUndefined();
});
it('spawns the expected guardian at all40 native doors or post-boss victory boundaries',()=>{
 for(const [ordinal,entrance]of DKC_STAGE_ORDER.entries()){
  const arena=[224,225,226,227,228,229,104].includes(entrance);
  const w=new Uint8Array(0x20000);for(const[p,v]of[[DKC.height,512],[DKC.loadedScene,entrance],[DKC.entrance,entrance],[DKC.id+2,1],[DKC.x+2,140],[DKC.y+2,200],[DKC.id+6,arena?0x74:0x6a],[0x12a7,1],[DKC.x+6,250],[DKC.y+6,200]])writeWord(w,p,v);
  const boss=new DkcGuardian();boss.update(w,1,()=>true,pendingBossVictory(w));expect(boss.state?.id).toBe(YOSHI_GUARDIANS[ordinal%7].id);
 }
});
it('migrates old DKC region encounters without healing, but preserves death and completed exits',()=>{
 const base={version:1,level:12,slot:6,id:'burt',phase:'fight',hp:2,maxHp:6,x:150,y:312,floor:312,elapsed:10,phaseTime:1,hitUntil:20,cameraX:0,cameraY:0,animationX:100,animationY:240}as const;
 const save=validateDkcGuardian(base)!;expect(save.id).toBe('salvo');expect(save.hp).toBe(2);expect(save.animationX).toBeUndefined();
 for(const phase of['dying','released']as const)expect(validateDkcGuardian({...base,phase,hp:0})?.id).toBe('burt');
});
it('migrates old Yoshi world-boundary assignments without healing or changing a finished cinematic',()=>{
 const base={version:1,stage:12,room:'test',id:'necky-snr',kind:'goal',slot:6,phase:'fight',hp:1,maxHp:4,x:100,y:200,floor:200,elapsed:5,phaseTime:1,nextAttack:6,hitUntil:8,facing:1,shots:[]}as const;
 expect(validateGuardian({...base,shots:[]})?.id).toBe('necky');expect(validateGuardian({...base,shots:[]})?.hp).toBe(1);
 for(const phase of['dying','exit','released']as const)expect(validateGuardian({...base,phase,shots:[]})?.id).toBe('necky-snr');
});
