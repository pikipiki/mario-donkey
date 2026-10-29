#!/usr/bin/env python3
"""Exact Rev2 source-boundary fixture for native Dumb Drum defeat guard.

This is NOT a full battle. Fixture places the real loaded boss at its existing
end-of-wave check. Production may ONLY request the private slot token; native
AI still waits for its dump animation and all current wave enemies to finish.
No boss death state, banana, map progression, or completion flag is injected.
"""
from pathlib import Path
import argparse,sys,json,hashlib
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT.parent
sys.path.insert(0,str(WORK/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import donor_stage1
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',type=Path,default=WORK/'dumb-drum-proof');a=p.parse_args();out=a.out;out.mkdir(parents=True,exist_ok=True)
r=bytearray((ROOT/'public/rom/dkc-usa-rev2.sfc').read_bytes())
assert hashlib.sha256(r).hexdigest()=='628147468c3539283197f58f03b94df49758a332831857481ea9cc31645f0527'
assert r[0x36dd7e:0x36dd86]==bytes.fromhex('bd f9 14 c9 05 00 b0 3b')
assert not any(r[0x3bfc3e:0x3bfc60])
# LDA originalwave,X / PHA / LDA tokenlong / CMP currentindex / BNE original /
# PLA / SEC / RTL / original: PLA / CMP#5 / RTL. Original following BCS kept.
guard=bytes.fromhex('bd f9 14 48 af 3e fc fb c5 82 d0 03 68 38 6b 68 c9 05 00 6b')
r[0x36dd7e:0x36dd84]=bytes.fromhex('22 40 fc fb ea ea');r[0x3bfc40:0x3bfc40+len(guard)]=guard;r[0x3bfc3e:0x3bfc40]=b'\xff\xff'
rom=out/'private-test.sfc';rom.write_bytes(r)
def writes(v,kind='snesWorkRam'):return[(kind,k,n,2)for k,n in v]
def desc(s):
 w=lambda k:s.word(0x7e0000+k)
 return{'entrance':w(0x3e),'height':w(0x4a),'control':w(0x1929),'victory':w(0x1e2b),'actors':[{'slot':j,'id':w(0xd45+j),'state':w(0x1029+j),'sub':w(0x152d+j),'wave':w(0x14f9+j),'x':w(0xb19+j),'y':w(0xbc1+j)}for j in range(0,0x34,2)if w(0xd45+j)]}
report={'scope':'Synthetic real end-of-wave source-boundary fixture, not a full fight','guardFile':hex(0x3bfc40),'patchFile':hex(0x36dd7e)}
with Emulator(WORK/'vendor/Mesen.app/Contents/MacOS/Mesen',rom,out/'worker',role='probe')as core:
 donor_stage1(core);s=core.step(120,writes=writes([(0x3e,0xe3),(0x40,0xe3),(0x527,0),(0x50a,0x81e3),(0x50c,0),(0x508,0x8279)]))
 def capture(k,s):report[k]=desc(s);s.image().save(out/(k+'.png'));return report[k]
 for _ in range(30):
  if any(v['id']==0x70 and v['state']==7 for v in desc(s)['actors']):break
  s=core.step(5)
 entry=capture('entry',s);boss=next(v for v in entry['actors']if v['id']==0x70);slot=boss['slot'];assert boss['state']==7
 # Exact original boundary prerequisites: substate5, dump timer elapsed,
 # no spawn delay, wave1. Current-wave check uses its own last enemy ID.
 fixture=[(0x152d+slot,5),(0x145d+slot,0xffff),(0x1375+slot,0),(0x14f9+slot,1),(0x1561+slot,0xffff)]
 s=core.step(1,writes=writes(fixture));d=capture('ordinary-next-wave',s);b=next(v for v in d['actors']if v['slot']==slot);assert b['state']==7 and b['wave']==2 and b['sub']==0
 # Pending request cannot skip even a single live member of current wave.
 core.step(1,writes=writes([(0x3bfc3e,slot)],'snesPrgRom'))
 s=core.step(1,writes=writes(fixture[:-1]+[(0x1561+slot,1)]));d=capture('request-waits-for-enemies',s);b=next(v for v in d['actors']if v['slot']==slot);assert b['sub']==5 and b['wave']==1
 # Remove only the synthetic enemy-match prerequisite; native code now chooses
 # its real death path through6,7,4 and lets controller spawn victory banana.
 s=core.step(1,writes=writes([(0x1561+slot,0xffff)]));d=capture('native-death-begins',s);b=next(v for v in d['actors']if v['slot']==slot);assert b['sub']==6 and b['state']==7 and b['wave']==1
 trace=[];banana=None
 for frame in range(1,901):
  s=core.step(1)
  d=desc(s)
  if frame%20==0:trace.append({'frame':frame,**d})
  if any(v['id']==0x74 for v in d['actors']):banana=capture('native-banana-created',s);report['framesToBanana']=frame;break
 assert banana,'Native death did not produce banana'
 s=core.step(900);d=capture('native-map-completion',s);assert d['height']==0 and d['entrance']!=0xe3
 report['trace']=trace;report['ok']=True
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'ok':True,'report':str(out/'report.json'),'framesToBanana':report['framesToBanana']}))
