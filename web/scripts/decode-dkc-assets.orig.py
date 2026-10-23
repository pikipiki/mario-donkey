#!/usr/bin/env python3
"""Decode verified original DKC dynamic metasprites. No new emulation at runtime."""
import argparse,re,json,struct
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--rom',type=Path,required=True);p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
s=a.source.read_text();rom=a.rom.read_bytes();a.output.mkdir(parents=True,exist_ok=True)
# Each source block provides the actual ROM address, metasprite coordinate
# header and exact uncompressed graphics length. Refuse mismatching revisions.
assets={};palettes={}
for m in re.finditer(r'(?:DATA|UNK)_([A-F0-9]{6}):([^:]*?)incbin "(Graphics/DynamicSprites/([^"/]+)|Palettes/([^"/]+))\.bin"([^\n]*)',s):
 addr=int(m[1],16)&0x3fffff
 if m[5]:palettes[m[5]]=addr;continue
 header=bytes(int(v,16) for v in re.findall(r'\$([A-F0-9]{2})(?![A-F0-9])',m[2]))
 size=re.search(r'GFXSize = \$([A-F0-9]+)',m[6]);
 if not size or not header:continue
 if rom[addr:addr+len(header)]!=header:continue
 assets[m[4]]={'address':addr,'header':list(header),'size':int(size[1],16)}
def palette(name):
 pos=palettes['Sprite_'+name];colors=[(0,0,0,0)]
 for i in range(15):
  v=struct.unpack_from('<H',rom,pos+i*2)[0];colors.append(tuple(((v>>shift)&31)*255//31 for shift in (0,5,10))+(255,))
 return colors
def decode(name,pal):
 entry=assets[name];h=entry['header'];n=(len(h)-8)//2;tiles=entry['size']//32;large=(tiles-n)//3
 if len(h)%2 or (tiles-n)%3 or large<0 or large>n:raise ValueError((name,'layout',n,tiles,large))
 data=rom[entry['address']+len(h):entry['address']+len(h)+entry['size']];im=Image.new('RGBA',(128,128));tile=0
 for k in range(n):
  side=16 if k<large else 8;x=h[8+k*2]-128+64;y=h[9+k*2]-128+96
  for py in range(side):
   for px in range(side):
    ti=tile+(py//8)*(side//8)+px//8;row=ti*32+(py%8)*2;bit=7-px%8
    ci=sum(((data[row+off]>>bit)&1)<<plane for plane,off in enumerate((0,1,16,17)))
    if ci and 0<=x+px<128 and 0<=y+py<128:im.putpixel((x+px,y+py),pal[ci])
  tile+=side*side//64
 return im
mapping={'rambi':('Rambi','SteelKeg'),'winky':('Winky','Winky'),'expresso':('Expresso','Expresso'),'enguarde':('Enguarde','Enguarde'),'squawks':('Squawks','Squawks')}
preview=Image.new('RGBA',(128*5,128));info={}
for col,(key,(prefix,palname)) in enumerate(mapping.items()):
 candidates=sorted(n for n in assets if n.startswith('GFX_'+prefix+'_Idle') or n.startswith('GFX_'+prefix+'_Fly'))
 print(key,candidates[:3],palname in [k.removeprefix('Sprite_') for k in palettes],flush=True)
 if not candidates:continue
 try:im=decode(candidates[0],palette(palname))
 except KeyError:continue
 preview.alpha_composite(im,(col*128,0));info[key]=candidates
preview.save(a.output/'animals-preview.png');(a.output/'dkc-assets-source.json').write_text(json.dumps({'assets':assets,'palettes':palettes},indent=2))
