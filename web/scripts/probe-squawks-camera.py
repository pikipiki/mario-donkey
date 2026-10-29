#!/usr/bin/env python3
"""Private native EU-ROM proof: sustained Squawks velocity and native camera flag.
No camera coordinate, boundary, terrain or room object writes. --work supplies
existing project/bridge + vendor/Mesen.app; the game ROM stays unmodified.
"""
from pathlib import Path
import argparse,sys,json
p=argparse.ArgumentParser();p.add_argument('--work',type=Path,required=True);p.add_argument('--out',type=Path);args=p.parse_args();work=args.work.resolve();out=args.out or work/'squawks-camera-proof';out.mkdir(exist_ok=True)
sys.path.insert(0,str(work/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import host_stage1
rom=Path(__file__).resolve().parents[1]/'public/rom/yoshi-eu.sfc'
def read(s):
 return dict(y=s.word(0x700090),camera=s.word(0x7e003b),gsuCamera=s.word(0x70009c),follow=s.word(0x701e0a),airborne=s.word(0x7000c0),vy=s.word(0x7000aa),contacts=s.word(0x7000fc),upper=s.word(0x701e1c),lower=s.word(0x701e1e),mode=s.wram[0x118])
report={}
for follow in [False,True]:
 name='native-follow' if follow else 'velocity-only'
 with Emulator(work/'vendor/Mesen.app/Contents/MacOS/Mesen',rom,out/name,role='probe') as core:
  s=host_stage1(core)
  for _ in range(10):
   if s.wram[0xd11]:core.step(2,('a',),snapshot=False)
   s=core.step(20)
  table=list(s.gsu[0xcaa:0xd2a]);trace=[read(s)];s.image().save(out/(name+'-before.png'))
  # Genuine native B takeoff, then sustained released-B bird flight.
  s=core.step(8,('b',))
  for frame in range(180):
   values=[]
   if s.wram[0x118]==0x13 and s.word(0x7000c0) and not s.word(0x7000fc)&0x18 and all(s.word(0x700000+a)==0 for a in[0xac,0xae,0x1ae,0x1b0,0x1e2a]) and s.word(0x7001b2)&0x8000 and all(s.word(0x7e0000+a)==0 for a in[0xd11,0xc90,0xc1e,0xb57,0xb59,0x398]):
    y=s.word(0x700090);vy=s.word(0x7000aa);vy=vy-65536 if vy&32768 else vy;velocity=max(min(vy,-0x400),-max(0,y if y<32768 else y-65536)*256-0xa0)
    values.append(('gsuWorkRam',0xaa,velocity&65535,2))
    if follow:values.append(('gsuWorkRam',0x1e0a,1,2))
   s=core.step(1,writes=values)
   if frame%12==0:trace.append(read(s))
  s.image().save(out/(name+'-after.png'));report[name]={'trace':trace,'final':read(s),'nativeScreenTable':table}
(out/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:{'before':v['trace'][0],'after':v['final']}for k,v in report.items()},indent=2))
