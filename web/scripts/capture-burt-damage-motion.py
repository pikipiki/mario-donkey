#!/usr/bin/env python3
"""Isolated native EU Burt pose capture; no browser save or ROM modification.
Uses the application's test-castle room fixture then actual native movement.
Hit fixture reproduces the post-collision fields from source06A897..A8C0;
this is animation stimulus, not a claim a real projectile collision was played.
"""
import argparse,json,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--work',required=True,type=Path);p.add_argument('--out',required=True,type=Path);args=p.parse_args();work=args.work.resolve();out=args.out.resolve();out.mkdir(parents=True,exist_ok=True);sys.path.insert(0,str(work/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import host_stage1
word=lambda b,a:b[a]|b[a+1]<<8
log=[];number=0;last_hit=-100;hits=0;last_index=None;index_since=0
with Emulator(work/'vendor/Mesen.app/Contents/MacOS/Mesen',Path(__file__).resolve().parents[1]/'public/rom/yoshi-eu.sfc',out/'worker',role='probe') as core:
 s=host_stage1(core)
 writes=[('snesWorkRam',0x218,0,2),('snesWorkRam',0x21a,3,2),('snesWorkRam',0x38e,0,2),('snesWorkRam',0x38c,1,2),('snesWorkRam',0x118,0x0f,1)]
 writes.extend(('snesWorkRam',0x17e00+i,v,1)for i,v in enumerate([0x3d,0x05,0x63,0]))
 s=core.step(240,writes=writes)
 for i in range(900):
  slots=[j for j in range(6,24)if word(s.gsu,0xf00+j*4)==0x10 and word(s.gsu,0x1360+j*4)==0x46]
  if slots:
   j=slots[0]*4;phase=s.gsu[0x1a36+j];hp=s.gsu[0x1902+j]
   if hp!=last_index:last_index=hp;index_since=i
   row={'capture':number,'tick':i*6,'phase':phase,'index':hp,'x':word(s.gsu,0x10e2+j),'y':word(s.gsu,0x1182+j),'vy':word(s.gsu,0x1222+j),'mode':s.wram[0x118]}
   raw=s.bgra+s.wram+s.gsu+s.vram+s.oam+s.cgram
   if phase in [0x1a,0x1c,0x1e]:
    (out/f'raw-{number}.bin').write_bytes(raw);(out/f'state-{number}.txt').write_text(repr(s.state));log.append(row)
    if number%10==0:print(row,flush=True)
    number+=1
   if hp==0 and i-index_since>80:break
  else:
   if i%20==0:print('No Burt',i,s.wram[0x118],hex(word(s.wram,0x21a)),flush=True);s.image().save(out/'missing.png')
  if s.wram[0xd11]:core.step(2,('a',),snapshot=False)
  stimulus=[]
  # Preserve the observer hero while the independent native boss runs.
  stimulus=[('gsuWorkRam',0x1d6,0x200,2)]
  if slots and phase==0x1a and i>180 and i-last_hit>35 and i-index_since>35 and hits<5:
   stimulus.extend([('gsuWorkRam',0x1220+j,0xfe00 if word(s.gsu,0x10e2+j)-word(s.wram,0x39)>150 else 0x200,2),('gsuWorkRam',0x1222+j,0xfe00,2),('gsuWorkRam',0x1a38+j,0x10,2),('snesWorkRam',0x105e,0x140,2),('snesWorkRam',0x1060,0xc0,2),('snesWorkRam',0x1062,1,2),('gsuWorkRam',0x1a36+j,0x20,1)])
   last_hit=i;hits+=1;print('HIT FIXTURE',hits,i,flush=True)
  s=core.step(6,writes=stimulus)
 (out/'captures.json').write_text(json.dumps(log,indent=2))
