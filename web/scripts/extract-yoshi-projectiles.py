#!/usr/bin/env python3
"""Decode EU Yoshi native OBJ egg poses and tongue tiles from a Mesen capture.
Usage: extract-yoshi-projectiles.py raw.bin state.txt OUTPUT_DIRECTORY
Native capture layout: BGRA256x239, WRAM128K, GSU32K, VRAM64K, OAM544,CGRAM512.
"""
import ast,hashlib,json,sys
from pathlib import Path
from PIL import Image
rawpath,statepath,out=map(Path,sys.argv[1:]);raw=rawpath.read_bytes();state=ast.literal_eval(statepath.read_text())
h=(len(raw)-0x20000-0x8000-65536-544-512)//1024
if h not in(224,239):raise ValueError('Unexpected capture layout')
at=h*1024+0x20000+0x8000;v=raw[at:at+65536];c=raw[-512:];base=int(state['ppu.oamBaseAddress'])*2;offset=int(state['ppu.oamAddressOffset'])*2
specs=[('egg-upright',0x80,0,16),('egg-diagonal',0x82,0,16),('egg-flat',0x84,0,16),('tongue-tip',0x20,5,8),('tongue-body',0x21,5,8)]
atlas=Image.new('RGBA',(16*len(specs),16));frames={}
for n,(name,tile,pal,size) in enumerate(specs):
 im=Image.new('RGBA',(size,size))
 for y in range(size):
  for x in range(size):
   t=((tile&240)+(y//8)*16)&240 | (tile+x//8)&15;a=(base+((tile>>8)&1)*offset+t*32+(y%8)*2)&65535;bit=7-x%8
   col=sum(((v[(a+d)&65535]>>bit)&1)<<p for p,d in enumerate((0,1,16,17)))
   if col:
    ci=(128+pal*16+col)*2;color=c[ci]|c[ci+1]<<8;im.putpixel((x,y),tuple(((color>>s)&31)*255//31 for s in(0,5,10))+(255,))
 atlas.alpha_composite(im,(n*16,0));frames[name]={'x':n*16,'y':0,'w':size,'h':size,'tile':tile,'palette':pal}
out.mkdir(parents=True,exist_ok=True);atlas.save(out/'yoshi-projectiles.png',optimize=True)
(out/'yoshi-projectiles.json').write_text(json.dumps({'frames':frames,'provenance':{'source':'EU original 4bpp OBJ tiles and CGRAM; no redrawing','romSha256':'91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90','rawSha256':hashlib.sha256(raw).hexdigest(),'tongueSource':'bank09 tongue_OAM_data_horiz $098555, tip $09849E palette5','eggPoses':'VRAM OBJ tiles80,82,84 palette0'}},indent=2)+'\n')
