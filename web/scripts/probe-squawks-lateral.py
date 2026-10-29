#!/usr/bin/env python3
"""Exact EU ROM native lateral camera proof while airborne.
A genuine jump takes off; EU released-B gravity is compensated by vy=-C8 for an
isolated horizontal-flight fixture. Only native Right/Left controls move X.
Only the already-verified vertical follow flag is requested; no horizontal
camera flag, coordinate, boundary, player position or terrain is written.
"""
from pathlib import Path
import argparse,sys,json
p=argparse.ArgumentParser();p.add_argument('--work',type=Path,required=True);p.add_argument('--out',type=Path);args=p.parse_args();work=args.work.resolve();out=args.out or work/'squawks-lateral-proof';out.mkdir(exist_ok=True)
sys.path.insert(0,str(work/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import host_stage1
rom=Path(__file__).resolve().parents[1]/'public/rom/yoshi-eu.sfc'
def describe(s):return{'x':s.word(0x70008c),'y':s.word(0x700090),'cameraX':s.word(0x7e0039),'cameraY':s.word(0x7e003b),'airborne':s.word(0x7000c0),'leftBound':s.word(0x701e18),'rightBound':s.word(0x701e1a),'followY':s.word(0x701e0a)}
report={}
with Emulator(work/'vendor/Mesen.app/Contents/MacOS/Mesen',rom,out/'worker',role='probe') as core:
 s=host_stage1(core)
 for _ in range(10):
  if s.wram[0xd11]:core.step(2,('a',),snapshot=False)
  s=core.step(20)
 s=core.step(12,('b',))
 for _ in range(25):s=core.step(1,writes=[('gsuWorkRam',0xaa,0xfc00,2),('gsuWorkRam',0x1e0a,1,2)])
 report['takeoff']=describe(s);s.image().save(out/'before.png')
 for direction in ['right','left']:
  trace=[describe(s)]
  for frame in range(180):
   writes=[('gsuWorkRam',0xaa,0xff38,2),('gsuWorkRam',0x1e0a,1,2)]if s.word(0x7000c0) and s.word(0x7000ac)==0 else[]
   s=core.step(1,(direction,),writes=writes)
   if frame%12==0:trace.append(describe(s))
  report[direction]={'trace':trace,'final':describe(s)};s.image().save(out/(direction+'-after.png'))
 (out/'report.json').write_text(json.dumps(report,indent=2))
 assert report['right']['final']['cameraX']>report['takeoff']['cameraX']+100,'Native right camera did not advance'
 assert report['left']['final']['cameraX']<report['right']['final']['cameraX']-100,'Native left camera did not reverse'
 assert report['right']['final']['airborne'] and report['left']['final']['airborne'],'Fixture must stay airborne'
 assert all(v['leftBound']==0 and v['rightBound']==3840 for v in[report['takeoff'],report['right']['final'],report['left']['final']]),'Native camera bounds changed'
(out/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v['final']if'final'in v else v for k,v in report.items()},indent=2))
