#!/usr/bin/env python3
"""Private native EU reticle/smoke capture, no player saves or source ROM writes.
Usage: capture-yoshi-combat.py (workspace project/bridge and vendor/Mesen required)
Then extract-yoshi-combat-art.py ../yoshi-combat-native public/art.
"""
import sys,json,subprocess,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1];work=root.parent;sys.path.insert(0,str(work/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import host_stage1
from bridge.snes import objects,object_image
from PIL import Image
rom=(root/'public/rom/yoshi-eu.sfc').read_bytes();assert hashlib.sha256(rom).hexdigest()=='91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90'
out=work/'yoshi-combat-native';out.mkdir(exist_ok=True)
with Emulator(work/'vendor/Mesen.app/Contents/MacOS/Mesen',root/'public/rom/yoshi-eu.sfc',out/'worker',role='probe') as core:
 s=host_stage1(core)
 for _ in range(8):
  if s.wram[0xd11]:core.step(2,('a',),snapshot=False)
  s=core.step(20)
 program=json.loads(subprocess.check_output(['node',str(root/'scripts/export-native-egg-factory.mjs')],text=True,cwd=root));writes=[('snesPrgRom',0x1ff00+i,b,1) for i,b in enumerate(program)]+[('snesPrgRom',0x265+i,b,1) for i,b in enumerate([0x5c,0,0xff,3])]
 s=core.step(80,writes=writes);s=core.step(2,('a',));s=core.step(15);s.image().save(out/'aim.png');(out/'raw.bin').write_bytes(s.bgra+s.wram+s.gsu+s.vram+s.oam+s.cgram);(out/'state.json').write_text(json.dumps(s.state));print('eggstate',s.word(0x7000de),'eggs',s.word(0x701df6),'objects',[(o.x,o.y,o.tile,o.palette)for o in objects(s.oam,int(s.state['ppu.oamMode'])) if o.y<224],flush=True)



 for f in range(1,25):
  s=core.step(1,('a',) if f==1 else ())
  (out/('shot-'+str(f)+'.bin')).write_bytes(s.bgra+s.wram+s.gsu+s.vram+s.oam+s.cgram)
  (out/('shot-'+str(f)+'.json')).write_text(json.dumps(s.state))
  if f in [1,2,4,8,12,20]:print(f,[(o.x,o.y,o.tile,o.palette) for o in objects(s.oam,int(s.state['ppu.oamMode'])) if o.y<224 and o.palette!=5],flush=True)
