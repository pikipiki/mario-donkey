import{it,expect}from'vitest';import{advanceYoshiGuardian}from'../src/yoshi-guardian-motion';import{YOSHI_GUARDIANS}from'../src/yoshi-guardian-spec';
it.each(YOSHI_GUARDIANS)('keeps $id inside its fixed DKC arena through movement and long frames',spec=>{
 const s={id:spec.id,x:180,y:300,floor:300,hp:6,maxHp:6,arenaLeft:40,arenaRight:216,elapsed:0};
 for(let i=0;i<1000;i++){s.elapsed+=1/60;advanceYoshiGuardian(s,1/60,i<500?60:200,1);expect(s.x).toBeGreaterThanOrEqual(40);expect(s.x).toBeLessThanOrEqual(216);expect(s.y).toBeLessThanOrEqual(300);expect(Number.isFinite(s.y)).toBe(true);}
});
it('Bigger Boo freezes horizontal pursuit when watched and resumes from behind',()=>{
 const s={id:'bigger-boo' as const,x:180,y:260,floor:300,hp:6,arenaLeft:40,arenaRight:216,elapsed:1};advanceYoshiGuardian(s,.06,60,1);expect(s.x).toBe(180);advanceYoshiGuardian(s,.06,60,-1);expect(s.x).toBeLessThan(180);
});
