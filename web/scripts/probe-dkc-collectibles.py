#!/usr/bin/env python3
"""Exact DKC Rev2 offline native egg-collection proof. Pass ROM patched with
DkcCollectibleHooks; no shipped ROM/SRAM or browser is changed. Banana fixture
submits a private ROM mailbox request, while native code owns the bitmap, FX
and final counter. Bunch/balloon fixture uses native spawned actors where found.
"""
import argparse,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT.parent
sys.path.insert(0,str(WORK/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import donor_stage1

def main():
 p=argparse.ArgumentParser();p.add_argument('--rom',type=Path,required=True);p.add_argument('--out',type=Path,default=Path('/tmp/dkc-collectibles-proof'));a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
 with Emulator(WORK/'vendor/Mesen.app/Contents/MacOS/Mesen',a.rom,a.out/'worker',role='probe') as c:
  donor_stage1(c);s=c.step(1)
  w=lambda p:s.word(0x7e0000+p)
  before={'bananas':w(0x57b),'lives':w(0x575),'heroX':w(0xb1b),'heroY':w(0xbc3)}
  chunk=0;bitmap=w(0xc00a);bits=w(bitmap);column=0
  while not bits:column+=2;bits=w(bitmap+column)
  bit=next(i for i in range(16) if bits&(1<<i));x=w(0xc000)+column*4;y=w(0xc002)+(15-bit)*8
  writes=[('snesPrgRom',p,v,2) for p,v in [(0x3bfde2,chunk),(0x3bfde4,x-1),(0x3bfde6,y-1),(0x3bfde0,1)]]
  s=c.step(1,writes=writes);after1={'bitmapBefore':bits,'bitmapAfter':w(bitmap+column),'bananas':w(0x57b),'actors':[(j,w(0xd45+j)) for j in range(0,0x34,2) if w(0xd45+j)]}
  s.image().save(a.out/'banana-native-effect.png')
  s=c.step(240);after={'bananas':w(0x57b),'lives':w(0x575),'heroX':w(0xb1b),'heroY':w(0xbc3)}
  result={'before':before,'request':{'chunk':chunk,'bitmap':bitmap+column,'bit':bit,'x':x,'y':y},'after1':after1,'after240':after}
  assert after1['bitmapAfter']==bits&~(1<<bit),result
  assert after['bananas']==before['bananas']+1,result
  assert after['heroX']==before['heroX'],result
  # Native level-load fixtures: DK's house contains the original life balloon.
  # Scene transitions are a test harness action, never the egg-hit mechanism.
  result['items']=[]
  for entrance in [0x5c,0x25]:
   s=c.step(180,writes=[('snesWorkRam',p,v,2) for p,v in [(0x3e,entrance),(0x40,entrance),(0x527,0),(0x50a,0x81e3),(0x50c,0),(0x508,0x8279)]])
   found=[(j,w(0xd45+j),w(0x1029+j)) for j in range(6,0x74,2) if w(0xd45+j) in (0x15,0x34)]
   print('entrance',entrance,'items',found)
   for slot,id,state in found:
    if state not in (0,1,3,4,5,6,7):continue
    previous=(w(0x57b),w(0x575))
    s=c.step(2,writes=[('snesWorkRam',0x1595+slot,0x8002,2)])
    immediate={'state':w(0x1029+slot),'request':w(0x1595+slot),'bananas':w(0x57b),'lives':w(0x575)}
    s.image().save(a.out/f'item-{entrance:x}-{id:x}.png')
    s=c.step(180)
    result['items'].append({'entrance':entrance,'slot':slot,'id':id,'before':previous,'immediate':immediate,'after':(w(0x57b),w(0x575))})
  # Bunch fixture: replace only the test ROM's original balloon SPAWN SCRIPT
  # with its original banana-bunch spawn script. No WRAM item ID is fabricated:
  # the native allocator initializes palette, tiles, animation and persistence.
  rom=a.rom.read_bytes();script=rom[0x35a51b:0x35a535]
  assert script[:4]==bytes.fromhex('450d1500')
  patches=[('snesPrgRom',0x35e531+i,v,1) for i,v in enumerate(script)]
  patches += [('snesWorkRam',p,v,2) for p,v in [(0x3e,0x5c),(0x40,0x5c),(0x527,0),(0x50a,0x81e3),(0x50c,0),(0x508,0x8279)]]
  s=c.step(180,writes=patches)
  bunch=next(j for j in range(6,0x34,2) if w(0xd45+j)==0x15)
  previous={'bananas':w(0x57b),'lives':w(0x575),'heroX':w(0xb1b),'heroY':w(0xbc3)}
  s=c.step(2,writes=[('snesWorkRam',0x1595+bunch,0x8002,2)])
  immediate={'state':w(0x1029+bunch),'request':w(0x1595+bunch)}
  s.image().save(a.out/'bunch-native-effect.png');s=c.step(240)
  after={'bananas':w(0x57b),'lives':w(0x575),'heroX':w(0xb1b),'heroY':w(0xbc3)}
  result['bunch']={'fixture':'original bunch spawn script in DK house','slot':bunch,'before':previous,'immediate':immediate,'after240':after}
  assert after['bananas']==previous['bananas']+10,result
  assert after['lives']==previous['lives'],result
  assert after['heroX']==previous['heroX'],result
  assert immediate['request']==0 and immediate['state']==2,result
  assert result['items'][0]['immediate']['lives']==result['items'][0]['before'][1]+1,result
  assert result['items'][1]['immediate']['lives']==result['items'][1]['before'][1]+2,result
  (a.out/'proof.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
if __name__=='__main__':main()
