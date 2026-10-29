#!/usr/bin/env python3
"""Private Mesen fixture: real EU 1-2 handoff, injected legacy bubble, native return and map. Never reads user saves."""
import sys,json
from pathlib import Path
work=Path(__file__).resolve().parents[2];sys.path.insert(0,str(work/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import host_stage1
out=work/'goal-1-2-recovery-minimal';out.mkdir(exist_ok=True)
def describe(s):
 w=lambda p:s.word(0x7e0000+p);g=lambda p:s.word(0x700000+p)
 return {'mode':w(0x118),'stage':w(0x21a),'player':[g(0x8c),g(0x90)],'state':g(0xac),'baby':g(0x1b2),'babyMode':g(0x19d6),'babyXY':[g(0x10e2),g(0x1182)],'babyVelocity':[g(0x11e2),g(0x1222)],'return':w(0xd9c),'cutscene':w(0xb59),'actors':[{'slot':i,'id':g(0x1360+i*4),'state':g(0xf00+i*4),'x':g(0x10e2+i*4),'y':g(0x1182+i*4),'phase':g(0x1978+i*4),'timer':g(0x1a96+i*4)}for i in range(24)if g(0xf00+i*4)]}
with Emulator(work/'vendor/Mesen.app/Contents/MacOS/Mesen',work/'web-team-boss-layout/public/rom/yoshi-eu.sfc',out/'worker',role='probe') as core:
 host_stage1(core)
 writes=[('snesWorkRam',0x218,0,2),('snesWorkRam',0x21a,1,2),('snesWorkRam',0x17e00,1,1),('snesWorkRam',0x17e01,0xd9,1),('snesWorkRam',0x17e02,0x79,1),('snesWorkRam',0x17e03,0,1),('snesWorkRam',0x38c,1,2),('snesWorkRam',0x38e,0,2),('snesWorkRam',0x118,0xf,1)]
 s=core.step(180,writes=writes);trace=[describe(s)];s.image().save(out/'entry.png')
 for i in range(60):
  s=core.step(10,('right','b'));d=describe(s)
  if i%3==0:trace.append(d)
  if d['mode']==20:break
 s.image().save(out/'trigger.png');trace.append(describe(s))
 for i in range(200):
  s=core.step(2);d=describe(s)
  if any(a['id']==13 and a['phase']==3 for a in d['actors']) and d['baby']==0:break
 px,py=d['player'];s=core.step(400,writes=[('gsuWorkRam',0x10e2,px+160,2),('gsuWorkRam',0x1182,py-20,2),('gsuWorkRam',0x19d6,11,2)])
 trace.append({'fixture':'isolated free bubble during a real handoff',**describe(s)});s.image().save(out/'stalled.png')
 s=core.step(120,writes=[('gsuWorkRam',0x19d6,1,2)])
 trace.append({'repair':'request native return mode only; no position or completion flags written',**describe(s)});s.image().save(out/'repaired.png')
 s=core.step(800);trace.append(describe(s));s.image().save(out/'score-repaired.png');s=core.step(20,('b',));s=core.step(350);trace.append({'nextMapTile':s.word(0x7e1114),'world':s.word(0x7e0218),**describe(s)});s.image().save(out/'map-repaired.png');(out/'recovery-trace.json').write_text(json.dumps(trace,indent=2));print(json.dumps(trace[-3:]))

assert trace[-3]["baby"] & 0x8000, "Native return did not attach Baby Mario"
assert trace[-1]["nextMapTile"] == 2 and trace[-1]["stage"] == 2, "Native map did not select the next stage"
