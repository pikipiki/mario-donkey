#!/usr/bin/env python3
"""Capture original Yoshi Island bosses in a private Mesen worker.
A room-entry fixture and hero invulnerability isolate native graphics. Milde
and Roger additionally use a safe observer position and Kamek-completion event
fixture (USA source1015 is EU1017), described in the atlas provenance. Native
ROM art decompression and animation rendering are preserved.
"""
import argparse,json,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--work',required=True,type=Path);p.add_argument('--out',required=True,type=Path);p.add_argument('--boss',default='salvo');p.add_argument('--frames',type=int,default=1800);a=p.parse_args()
# IDs/placements from native level/*-spr.bin and bank03's original init table.
ROOMS={'froggy':(0xbf,31,0x15,0x6b,0x17),'milde':(0x82,39,0x02,0x79,0xd2),'roger':(0xcf,19,0x02,0x58,0x34),'salvo':(0x70,7,0x21,0x79,0x2d),'bigger-boo':(0x74,15,0xc4,0x76,0x16),'hookbill':(0x86,43,0x54,0x59,0xae),'sluggy':(0x8a,51,0x25,0x74,0xd7),'raphael':(0xc4,55,0xd,0x3f,0xc),'tap-tap':(0xcc,64,0x4c,0x76,0x3c)}
w=a.work.resolve();out=a.out.resolve();out.mkdir(parents=True,exist_ok=True);sys.path.insert(0,str(w/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import host_stage1
word=lambda b,i:b[i]|b[i+1]<<8
room,stage,x,y,sid=ROOMS[a.boss];log=[]
with Emulator(w/'vendor/Mesen.app/Contents/MacOS/Mesen',Path(__file__).resolve().parents[1]/'public/rom/yoshi-eu.sfc',out/'worker',role='probe') as core:
 s=host_stage1(core)
 writes=[('snesWorkRam',0x218,0,2),('snesWorkRam',0x21a,stage,2),('snesWorkRam',0x38e,0,2),('snesWorkRam',0x38c,1,2),('snesWorkRam',0x118,0xf,1)]
 writes.extend(('snesWorkRam',0x17e00+i,v,1)for i,v in enumerate([room,x,y,0]));s=core.step(60,writes=writes)
 for i in range(a.frames//12):
  slots=[j for j in range(0,24)if word(s.gsu,0xf00+j*4)and word(s.gsu,0x1360+j*4)==sid]
  num=len(log);row={'capture':num,'tick':i*12,'mode':s.wram[0x118],'camera':[word(s.wram,0x39),word(s.wram,0x3b)],'slots':[{'slot':j,'state':word(s.gsu,0xf00+j*4),'phase':word(s.gsu,0x1a36+j*4),'x':word(s.gsu,0x10e2+j*4),'y':word(s.gsu,0x1182+j*4)}for j in slots]}
  if i%10==0:print(row,flush=True);s.image().save(out/f'view-{num}.png')
  (out/f'raw-{num}.bin').write_bytes(s.bgra+s.wram+s.gsu+s.vram+s.oam+s.cgram);(out/f'state-{num}.txt').write_text(repr(s.state));log.append(row)
  if s.wram[0xd11]:core.step(2,('a',),snapshot=False)
  stimulus=[('gsuWorkRam',0x1d6,0x200,2)]
  if a.boss in ['milde','roger']:
   # Keep the observing hero over a fixed safe point; notify the native boss
   # when the Kamek intro event completes (animation fixture, not gameplay).
   stimulus.extend([('gsuWorkRam',0x8c,136 if a.boss=='milde'else 96,2),('gsuWorkRam',0x90,1936 if a.boss=='milde'else 1420,2),('gsuWorkRam',0xaa,0,2)])
   if i in[25,50,75]:stimulus.append(('snesWorkRam',0x1017,0xffff,2))
   if a.boss=='roger'and i in[25,50,75]:stimulus.append(('gsuWorkRam',0xac,2,2))
  s=core.step(12,('a',) if i%6==0 else (),writes=stimulus)
 (out/'captures.json').write_text(json.dumps(log,indent=2))
