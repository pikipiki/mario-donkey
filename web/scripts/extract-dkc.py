#!/usr/bin/env python3
"""Decode original DKC OAM frames through the existing local Mesen worker.
Only an offline authoring step: the delivered browser runs one Yoshi emulator.
"""
import argparse, json, sys, tempfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--project',type=Path,required=True);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
sys.path.insert(0,str(args.project))
from bridge.emulator import Emulator
from bridge.bootstrap import find_roms, donor_stage1
from bridge.snes import render_objects,signed16
from PIL import Image
args.output.mkdir(parents=True,exist_ok=True)
meta={'source':'Original DKC USA Rev 2, decoded from local ROM OAM/VRAM/CGRAM','cell':96,'columns':12,'characters':{}}
atlas=Image.new('RGBA',(96*12,96*10))
for ci,char in enumerate(('dk','diddy')):
 folder=Path(tempfile.mkdtemp(prefix='kong-atlas-'))
 with Emulator(args.project/'vendor/Mesen.app/Contents/MacOS/Mesen',find_roms(args.project)['donor'],folder,role='donor') as core:
  s=donor_stage1(core,char);off=4 if char=='diddy' else 2
  anchor_x=s.word(0x7e0b19+off);anchor_y=s.word(0x7e0bc1+off);camera=s.word(0x7e1a62)
  pin=[('snesWorkRam',0xb19+off,anchor_x,2),('snesWorkRam',0xbc1+off,anchor_y,2),('snesWorkRam',0x1a62,camera,2)]
  entries={}
  for ai,(name,buttons,frames) in enumerate((('idle',(),48),('walk',('right',),48),('jump',('b',),48),('roll',('right','y'),36),('ride',('down',),36))):
   # Release previous action and settle before taking a different animation.
   for _ in range(35):core.step(1,(),pin,snapshot=False)
   shots=[]
   for f in range(frames):
    s=core.step(1,buttons,pin,snapshot=f%max(1,frames//12)==0)
    if s is None:continue
    lo=64 if char=='diddy' else 0
    sprite=render_objects(s,lambda o:lo<=o.tile<lo+32)
    srcx=signed16(s.word(0x7e0b19+off)-s.word(0x7e1a62));srcy=s.word(0x7e0bc1+off)-12
    cell=Image.new('RGBA',(96,96));cell.alpha_composite(sprite,(48-srcx,80-srcy))
    if cell.getbbox() is None:raise RuntimeError(f'Empty original frame {char}/{name}/{f}')
    shots.append(cell)
   row=ci*5+ai
   for col,im in enumerate(shots[:12]):atlas.alpha_composite(im,(col*96,row*96))
   entries[name]={'row':row,'frames':min(12,len(shots)),'fps':18 if name in ('walk','roll') else 12,'anchor':[48,80]}
   print(char,name,len(shots),flush=True)
  meta['characters'][char]=entries
atlas.save(args.output/'dkc-original.png');(args.output/'dkc-original.json').write_text(json.dumps(meta,indent=2)+'\n')
print('Original atlas saved',args.output,flush=True)
