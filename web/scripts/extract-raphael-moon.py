#!/usr/bin/env python3
"""Decode original Raphael Mode7 moon, retaining every native material shade.
Read-only donor captures; never edits ROM, SRAM, runtime or existing atlas.
"""
import argparse,ast,json,hashlib
from collections import Counter
from pathlib import Path
from PIL import Image,ImageDraw
p=argparse.ArgumentParser();p.add_argument('--work',type=Path,default=Path(__file__).resolve().parents[2]);a=p.parse_args();w=a.work.resolve();out=w/'native-boss-sequences/raphael';source=out/'idle-0/raw-40.bin';raw=source.read_bytes();h=(len(raw)-0x20000-0x8000-65536-1056)//1024;v=raw[h*1024+0x28000:h*1024+0x38000];c=raw[-512:]
word=lambda b,i:b[i]|b[i+1]<<8
def palette(i):
 value=word(c,i*2);return tuple(((value>>n)&31)*255//31 for n in[0,5,10])+(255,)
def pixel(x,y):
 tile=v[((y//8)*128+x//8)*2];return v[(tile*64+y%8*8+x%8)*2+1]
im=Image.new('RGBA',(192,192));dist=Counter()
for y in range(144,336):
 for x in range(160,352):
  ci=pixel(x,y);dist[ci]+=1;im.putpixel((x-160,y-144),palette(ci))
im.save(out/'moon-all-indices.png')
sw=Image.new('RGBA',(512,160));dr=ImageDraw.Draw(sw)
for i in range(80):
 x=i%16*32;y=i//16*32;dr.rectangle((x,y,x+31,y+31),fill=palette(i));dr.text((x+1,y+1),str(i),fill='red')
sw.save(out/'moon-palette.png');print('palette11',palette(11));print(dist)
# Native material index families: primary sphere1..10, alternate sphere/wood
#33..41, stakes49..59. Index0 is native Mode7 transparency;11 is space.
# A palette-index ceiling10 removed original stake tiles embedded at sphere edge.
allowed=set(range(1,11))|set(range(33,60));pixels={(x,y):pixel(x,y)for y in range(144,336)for x in range(160,352)if pixel(x,y)in allowed};seen=set();parts=[]
for q in pixels:
 if q in seen:continue
 todo=[q];seen.add(q);part=set()
 while todo:
  x,y=todo.pop();part.add((x,y))
  for z in[(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
   if z in pixels and z not in seen:seen.add(z);todo.append(z)
 parts.append(part)
keep=max(parts,key=len);bounds=[min(x for x,y in keep),min(y for x,y in keep),max(x for x,y in keep)+1,max(y for x,y in keep)+1]
# Preserve the published context's dimensions/anchor. Also export complete bounds
# variant so callers can include protruding original stakes without clipping.
for name,box in [('moon-fixed.png',(200,180,320,300)),('moon-complete.png',bounds)]:
 im=Image.new('RGBA',(box[2]-box[0],box[3]-box[1]))
 for x,y in keep:
  if box[0]<=x<box[2]and box[1]<=y<box[3]:im.putpixel((x-box[0],y-box[1]),palette(pixels[x,y]))
 im.save(out/name)
provenance={'source':str(source.relative_to(w)),'rawSha256':hashlib.sha256(raw).hexdigest(),'romSha256':'91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90','nativeMode':'Mode7 VRAM tilemap even bytes, indexed character pixels odd bytes, original CGRAM colors','oldDefect':'Index<=10 mask removed original alternate moon/stake material indices33..59, producing rectangular holes at stake tiles; palette0 incorrectly retained though native transparent.','materialIndices':sorted(allowed),'actualRetainedIndices':sorted({pixels[z]for z in keep}),'removedNativeTransparentIndex':0,'excludedNativeSpaceIndex':11,'nativeCompleteBounds':bounds,'publishedCompatibleBounds':[200,180,320,300],'componentPixels':len(keep),'alpha':'Original native material support plus component membership; no RGB color keying, no filling, no invented pixels','scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(out/'moon-fixed-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n');print('Complete native moon bounds',bounds,'pixels',len(keep),'indices',provenance['actualRetainedIndices'])
