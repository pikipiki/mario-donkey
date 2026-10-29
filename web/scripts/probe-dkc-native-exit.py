#!/usr/bin/env python3
"""Private Mesen fixture: exact Winky's Walkway native exit stays closed until release.

Supply a copy of DKC Rev2 patched with DkcBossRomHooks.sync(true). This is a
native-door regression fixture, not a full level/boss playthrough. A controlled
teleport loads the exit area, then real native frames attempt the exit. The
optional entered-door fixture seeds exactly the door/player/destination fields
written by native CODE_B6C4B2, as an old checkpoint could contain. No stage-clear,
map process, or progression field is written. All completion after release is
performed by the original ROM code. Only the private worker's SRAM is used.
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT.parent
sys.path.insert(0,str(WORK/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import donor_stage1


def writes(values,kind='snesWorkRam'):
    return [(kind,p,v,2) for p,v in values]


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--rom',type=Path,required=True)
    p.add_argument('--out',type=Path,default=WORK/'dkc-native-exit-proof')
    p.add_argument('--entered',action='store_true')
    args=p.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    evidence={}
    with Emulator(WORK/'vendor/Mesen.app/Contents/MacOS/Mesen',args.rom,args.out/'worker') as core:
        donor_stage1(core)
        s=core.step(300,writes=writes([(0x3e,0xd9),(0x40,0xd9),(0x527,0),(0x50a,0x81e3),(0x50c,0),(0x508,0x8279)]))
        def word(p):return s.word(0x7e0000+p)
        def capture(name):
            result={'entrance':word(0x3e),'scene':word(0x40),'height':word(0x4a),'playerState':word(0x102b),'x':word(0xb1b),'y':word(0xbc3),'doors':[dict(slot=j,id=word(0xd45+j),state=word(0x1029+j),x=word(0xb19+j),y=word(0xbc1+j),destination=word(0x1375+j))for j in range(6,0x34,2)if word(0xd45+j)in(0x6a,0x6b)],'progress':list(s.wram[0x583:0x783])}
            evidence[name]=result;s.image().save(args.out/(name+'.png'));return result
        capture('entry')
        # Load the exit tile/actor area without a playthrough. State0 is the
        # active native controller; state2 would drive the inactive partner.
        for _ in range(60):
            s=core.step(1,buttons=('right',),writes=writes([(0xb1b,57380),(0xbc3,311),(0x88b,57136),(0x1a62,57136),(0x16d1,10000),(0x102b,0),(0x11a3,193),(0x579,0),(0x1929,0),(0xef3,0),(0xe8b,0)]))
        prepared=capture('exit-area-fixture')
        assert prepared['doors']==[dict(slot=14,id=0x6a,state=0,x=57372,y=311,destination=0x2e)]
        s=core.step(30,buttons=('right',))
        held=capture('held-before-entry')
        assert held['scene']==0xd9 and held['height']==512 and held['playerState']<0x1b
        assert held['doors'][0]['state']==0 and held['progress']==prepared['progress']
        if args.entered:
            s=core.step(30,buttons=('right',),writes=writes([(0x1029+14,1),(0xbc3,311),(0x102b,0x1b),(0x1705,0x2e)]))
            entered=capture('held-entered-checkpoint')
            assert entered['scene']==0xd9 and entered['height']==512
            assert entered['doors'][0]['state']!=0 and entered['progress']==prepared['progress']
            s=core.step(1,writes=writes([(0x3bf87e,0)],'snesPrgRom'))
        else:
            s=core.step(1,writes=writes([(0x3bf87e,0)],'snesPrgRom')+writes([(0xb1b,57340),(0xbc3,311)]))
        for _ in range(8):
            s=core.step(120,buttons=('right',))
            if word(0x4a)==0:break
        complete=capture('native-completion')
        assert complete['height']==0 and complete['scene']==0x2e
        assert prepared['progress'][0x65c-0x583]&1==0
        assert complete['progress'][0x65c-0x583]&1==1,'Original ROM must mark Winky completed'
        (args.out/'evidence.json').write_text(json.dumps(evidence,indent=2)+'\n')
        print(json.dumps({'passed':True,'enteredFixture':args.entered,'nativeDestination':complete['scene'],'proof':str(args.out/'evidence.json')}))


if __name__=='__main__':main()
