#!/usr/bin/env python3
"""Extract native reticle/egg smoke OBJ, captured by the private EU egg fixture.
Usage: extract-yoshi-combat-art.py CAPTURE_DIR OUTPUT_DIR
Capture has raw.bin/state.json plus shot-N.bin/json (BGRA, WRAM, GSU, VRAM, OAM, CGRAM).
"""
import sys,json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2];sys.path.insert(0,str(root/'project'))
from bridge.snes import objects,object_image
folder,out=map(Path,sys.argv[1:]);frames=[];evidence=[]
def load(name,meta):
 raw=(folder/name).read_bytes();state=json.loads((folder/meta).read_text());h=(len(raw)-0x20000-0x8000-65536-544-512)//1024;at=h*1024+0x28000
 return raw,state,raw[at:at+65536],raw[-1056:-512],raw[-512:]
def part(raw,state,v,o,c,predicate):
 items=[a for a in objects(o,int(state['ppu.oamMode'])) if a.y<224 and predicate(a)];im=Image.new('RGBA',(32,32));
 if not items:raise ValueError('Native OBJ missing')
 left=min(a.x for a in items);top=min(a.y for a in items);right=max(a.x+a.width for a in items);bottom=max(a.y+a.height for a in items)
 for a in reversed(items):im.alpha_composite(object_image(a,v,c,int(state['ppu.oamBaseAddress'])*2,int(state['ppu.oamAddressOffset'])*2),(int(16-(right-left)/2+a.x-left),int(16-(bottom-top)/2+a.y-top)))
 frames.append(im);evidence.append({'captureSha256':hashlib.sha256(raw).hexdigest(),'objects':[a.__dict__ for a in items]})
for name,meta in [('raw.bin','state.json'),('shot-2.bin','shot-2.json')]:part(*load(name,meta),lambda a:a.tile==0x9f)
for n,tile in [(8,0xe3),(12,0xe5),(20,0xe2),(20,0x58)]:
 data=load(f'shot-{n}.bin',f'shot-{n}.json');seen=[]
 def match(a):
  if a.tile!=tile or a.palette!=3 or seen:return False
  seen.append(a);return True
 part(*data,match)
sheet=Image.new('RGBA',(32*len(frames),32))
for i,im in enumerate(frames):sheet.alpha_composite(im,(i*32,0))
out.mkdir(parents=True,exist_ok=True);sheet.save(out/'yoshi-combat.png',optimize=True)
(out/'yoshi-combat.json').write_text(json.dumps({'cell':32,'groups':{'reticle':[0,1],'smoke':[2,3,4,5]},'source':'Native EU egg reticle and projectile smoke OBJ; palette index0 transparent','captures':evidence},indent=2)+'\n')
