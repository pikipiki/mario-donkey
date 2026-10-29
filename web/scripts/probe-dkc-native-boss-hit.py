#!/usr/bin/env python3
"""Offline native Gnawty custom attack → hurt → victory → map regression.

Requires ../project/bridge and ../vendor/Mesen.app. Supply a ROM patched with
DkcBossRomHooks then DkcBossFinishHooks (--rom). This never patches the shipped
ROM or SRAM. The fixture lowers Very Gnawty to one HP, then submits its real
custom collision token from below the original stomp height gate; all death, banana, victory and map transitions are native.
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent
sys.path.insert(0, str(WORK / 'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import donor_stage1


def writes(values, kind='snesWorkRam'):
    return [(kind, p, v, 2) for p, v in values]


def describe(s):
    w = lambda p: s.word(0x7e0000 + p)
    return {
        'entrance': w(0x3e), 'scene': w(0x40), 'process': w(0x508),
        'height': w(0x4a), 'bossControl': w(0x1929),
        'victoryControl': w(0x1e2b), 'nativeSongPlaying': w(0x51d),
        'actors': [dict(slot=j, id=w(0xd45+j), state=w(0x1029+j),
                        x=w(0xb19+j), y=w(0xbc1+j), hp=w(0x14f9+j),
                        substate=w(0x152d+j), hit=w(0x1595+j))
                   for j in range(0, 0x34, 2) if w(0xd45+j)]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rom', type=Path, required=True)
    parser.add_argument('--out', type=Path, default=WORK/'dkc-boss-sequence-proof')
    parser.add_argument('--entrance', type=lambda v:int(v,0), default=0xe0, help='Native boss entrance (0xe0..0xe5)')
    parser.add_argument('--post-defeat-fixture', action='store_true', help='Exercise native controller after synthetic boss state4; not a full-fight proof')
    parser.add_argument('--krool', action='store_true', help='Use a synthetic final-command fixture at native K. Rool script $260; not a full-fight proof')
    parser.add_argument('--vanilla', action='store_true', help='Expect original automatic victory')
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    evidence = {}
    with Emulator(WORK/'vendor/Mesen.app/Contents/MacOS/Mesen', args.rom,
                  args.out/'worker', role='donor') as core:
        donor_stage1(core)
        s = core.step(300, writes=writes([(0x3e,0x68 if args.krool else args.entrance),(0x40,0x68 if args.krool else args.entrance),
                         (0x527,0),(0x50a,0x81e3),(0x50c,0),(0x508,0x8279)]))
        def capture(name, s):
            evidence[name] = describe(s)
            (args.out/(name+'.json')).write_text(json.dumps(evidence[name], indent=2)+'\n')
            s.image().save(args.out/(name+'.png'))
            return evidence[name]
        entry = capture('entry', s)
        entrance = 0x68 if args.krool else args.entrance
        assert entry['entrance'] == entrance and entry['scene'] == entrance
        assert not any(a['id'] == 0x74 for a in entry['actors']), 'Banana must not exist before defeat'
        linked = [s.word(0x7e0000+0x1375+a['slot']) for a in entry['actors'] if a['id'] == 0x6c]
        candidates = [a for a in entry['actors'] if a['id'] == 0x70]
        boss = next((a for a in candidates if a['slot'] in linked), candidates[0])
        slot = boss['slot']
        hero_slot = 4 if s.word(0x7e056f) == 2 else 2
        # DEV fixture: one HP remains. Invoke the original stomp collision path,
        # which requires hero Y >= $013f. Do not write a death/victory flag.
        if args.krool:
            owner = s.word(0x7e0000+0xded+slot)
            core.step(1, writes=writes([(0x152d+slot,2),(0x116d+owner,0x260),
                       (0x1341+owner,0),(0xbc1+slot,295),(0xb19+slot,180),
                       (0xe89+slot,0),(0xf25+slot,0),(0xc69+slot,0)]))
        elif args.post_defeat_fixture:
            core.step(1, writes=writes([(0x1029+slot,4),(0x11a1+slot,0),(0x16d1,10000),(0x16d3,10000)]))
        else:
            core.step(1, writes=writes([(0x14f9+slot,1),(0xbc1+hero_slot,300),
                                       (0x1595+slot,0x8001),(0x16d1,10000),(0x16d3,10000)]))
        pending = None
        for frame in range(1, 901):
            s = core.step(1)
            d = describe(s)
            if any(a['id'] == 0x74 for a in d['actors']):
                pending = capture('native-banana-created', s)
                evidence['framesToBanana'] = frame
                break
        assert pending is not None, 'Native final hit did not spawn victory banana'
        assert args.krool or args.post_defeat_fixture or any(a['id'] == 0x70 and a['hp'] == 0 for a in pending['actors'])
        if not args.vanilla:
            assert any(a['id'] == 0x74 and a['state'] == 0 for a in pending['actors'])
            s = core.step(600)
            held = capture('held-for-guardian', s)
            assert held['entrance'] == entrance and held['scene'] == entrance
            assert held['victoryControl'] == 0
            assert any(a['id'] == 0x74 and a['state'] == 0 for a in held['actors'])
            # Verify the hero remains controllable during the added encounter.
            hero_before = next(a for a in held['actors'] if a['slot'] == hero_slot)['x']
            s = core.step(20, buttons=('right',))
            moved = capture('held-hero-moved', s)
            hero_after = next(a for a in moved['actors'] if a['slot'] == hero_slot)['x']
            evidence['heldMovement'] = {'before': hero_before, 'after': hero_after}
            assert hero_after > hero_before, 'Hero cannot move during guardian hold'
            # Release only the bridge's private ROM gate; native WRAM untouched.
            s = core.step(1, writes=writes([(0x3bfbfe,0)], 'snesPrgRom'))
        s = core.step(900)
        completed = capture('native-completion', s)
        assert completed['height'] == 0, 'Native map was not reached after release'
        assert completed['entrance'] != entrance
    (args.out/'report.json').write_text(json.dumps(evidence, indent=2)+'\n')
    print(json.dumps({'ok': True, 'report': str(args.out/'report.json'),
                      'framesToBanana': evidence['framesToBanana'],
                      'mapEntrance': completed['entrance']}))

if __name__ == '__main__':
    main()
