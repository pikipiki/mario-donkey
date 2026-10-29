#!/usr/bin/env python3
"""Decode original EU Burt's BG2+OBJ graphics from private Mesen snapshots.
Usage: python3 scripts/extract-yoshi-boss.py CAPTURE_FOLDER OUTPUT_DIRECTORY
Capture raw layout: BGRA256xH, WRAM128KiB, GSU32KiB, VRAM64KiB, OAM544,
CGRAM512; state-N.txt is Mesen's matching PPU/HDMA state dictionary.
No screenshot color-keying, background redraw or AI art is used.
"""
import argparse,ast,hashlib,json,struct
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('captures',type=Path);p.add_argument('output',type=Path);p.add_argument('--selection',type=Path,help='JSON frames and optional groups, using capture IDs');args=p.parse_args()
CELL=192;ORIGIN=(96,176);selection=json.loads(args.selection.read_text())if args.selection else{};FRAMES=selection.get('frames',[18,19,20,21,23])
PART_TILES={0x1c0,0x1c2,0x1e0,0x1e2,0x1c4,0x1c6,0x1e4,0x1e6,0x1c8,0x1e8,0x1cc,0x1ce,0x1ec,0x1ee,0x1ca,0x1ea}
def decode(number):
 raw=(args.captures/f'raw-{number}.bin').read_bytes();state=ast.literal_eval((args.captures/f'state-{number}.txt').read_text());height=(len(raw)-0x20000-0x8000-0x10000-544-512)//1024
 if height not in [224,239]:raise ValueError('Unexpected native frame size')
 at=height*1024;w=raw[at:at+0x20000];at+=0x20000;g=raw[at:at+0x8000];at+=0x8000;v=raw[at:at+0x10000];at+=0x10000;o=raw[at:at+544];c=raw[at+544:]
 word=lambda memory,a:memory[a]|memory[a+1]<<8
 slots=[i for i in range(6,24) if word(g,0xf00+i*4)==0x10 and word(g,0x1360+i*4)==0x46]
 if len(slots)!=1:raise ValueError('A unique live Burt is required')
 slot=slots[0];x=word(g,0x10e2+slot*4)-word(w,0x39);feet=word(g,0x1182+slot*4)-word(w,0x3b)
 def palette(index):
  value=word(c,index*2);return tuple(((value>>shift)&31)*255//31 for shift in (0,5,10))+(255,)
 def hdma(table):
  values=[]
  while w[table] and len(values)<256:
   flag=w[table];count=flag&127 or 128;address=word(w,table+1);table+=3
   for _ in range(count):
    values.append(word(w,address))
    if flag&128:address+=2
  if len(values)<200:raise ValueError('Missing per-row Burt deformation')
  return values
 hs=hdma(int(state['dmaController.channel[3].srcAddress']));vs=hdma(int(state['dmaController.channel[4].srcAddress']))
 chrbase=int(state['ppu.layers[1].chrAddress'])*2;tilemap=int(state['ppu.layers[1].tilemapAddress'])*2
 def bgpixel(screenx,screeny):
  xx=(screenx+hs[min(screeny,len(hs)-1)])%512;yy=(screeny+vs[min(screeny,len(vs)-1)])%1024;tx,ty=xx//16,yy//16
  desc=word(v,(tilemap+(ty//32)*0x800+((ty%32)*32+tx)*2)&65535);px=xx%16;py=yy%16
  if desc&0x4000:px=15-px
  if desc&0x8000:py=15-py
  tile=(desc&1023)+(px//8)+(py//8)*16;address=(chrbase+tile*32+py%8*2)&65535;bit=7-px%8
  index=sum(((v[(address+off)&65535]>>bit)&1)<<plane for plane,off in enumerate((0,1,16,17)))
  return palette(((desc>>10)&7)*16+index) if index else(0,0,0,0)
 body=Image.new('RGBA',(256,height));body.putdata([bgpixel(xx,yy) for yy in range(height) for xx in range(256)])
 # The PPU's window hides the repeated triangle projection outside Burt. Keep
 # only the actor's local region; discard full-width wrap boundary scanlines.
 for yy in range(height):
  occupied=[xx for xx in range(256) if body.getpixel((xx,yy))[3]]
  wrap=occupied and occupied[-1]-occupied[0]>160
  for xx in range(256):
   if wrap or not(x-80<=xx<x+80 and feet-170<=yy<feet+8):body.putpixel((xx,yy),(0,0,0,0))
 behind=Image.new('RGBA',(256,height));front=behind.copy();base=int(state['ppu.oamBaseAddress'])*2;offset=int(state['ppu.oamAddressOffset'])*2
 for i in reversed(range(128)):
  xx,yy,tile,attr=o[i*4:i*4+4];ext=(o[512+i//4]>>((i%4)*2))&3;xx|=(ext&1)<<8;xx=xx-512 if xx>=256 else xx
  tile|=(attr&1)<<8;pal=(attr>>1)&7;priority=(attr>>4)&3;size=16 if ext&2 else 8
  if tile not in PART_TILES or pal not in [6,7] or not(x-90<=xx<x+80 and feet-180<=yy<feet+12):continue
  im=Image.new('RGBA',(size,size));origin=tile&255;start=(base+((tile>>8)&1)*offset)&65535
  for dy in range(size):
   sy=size-1-dy if attr&128 else dy
   for dx in range(size):
    sx=size-1-dx if attr&64 else dx;tn=(((origin&240)+(sy//8)*16)&240)|((origin+sx//8)&15);address=(start+tn*32+(sy%8)*2)&65535;bit=7-sx%8
    index=sum(((v[(address+off)&65535]>>bit)&1)<<plane for plane,off in enumerate((0,1,16,17)))
    if index:im.putpixel((dx,dy),palette(128+pal*16+index))
  (front if priority==3 else behind).alpha_composite(im,(xx,yy))
 behind.alpha_composite(body);behind.alpha_composite(front)
 result=Image.new('RGBA',(CELL,CELL));result.alpha_composite(behind,(ORIGIN[0]-x,ORIGIN[1]-feet))
 if result.getbbox() is None:raise ValueError('Empty native boss')
 return result,{'capture':number,'rawSha256':hashlib.sha256(raw).hexdigest(),'actorSlot':slot,'nativeFeet':[x,feet],'bounds':result.getbbox(),'nativePhase':g[0x1a36+slot*4],'nativeHitIndex':g[0x1902+slot*4]}
args.output.mkdir(parents=True,exist_ok=True);atlas=Image.new('RGBA',(CELL*len(FRAMES),CELL));evidence=[]
for i,n in enumerate(FRAMES):
 image,source=decode(n);atlas.alpha_composite(image,(i*CELL,0));evidence.append(source)
atlas.save(args.output/'yoshi-bosses.png',optimize=True)
animation={'start':0,'frames':len(FRAMES),'fps':6}
manifest={'cell':CELL,'columns':len(FRAMES),'origin':ORIGIN,'groups':{'burt':selection.get('groups',{'idle':animation,'attack':animation,'hurt':animation,'dead':{'start':len(FRAMES)-1,'frames':1,'fps':1}})},'provenance':{'source':'Yoshi Island Europe original Burt the Bashful; native BG2 4bpp + per-scanline HDMA + native 4bpp OBJ','romSha256':'91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90','captureHeight':239,'bodyTilemapWords':14336,'bodyChrWords':28672,'hdmaHorizontalTable':23576,'hdmaVerticalTable':23448,'frames':evidence,'limitations':selection.get('limitations','Attack/hurt use captured movement poses; dead uses last pose with runtime fade, not a separately captured original defeat animation.'),'captureFixture':selection.get('fixture','Original native movement captures')}}
(args.output/'yoshi-bosses.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Wrote',args.output/'yoshi-bosses.png',atlas.size,hashlib.sha256((args.output/'yoshi-bosses.png').read_bytes()).hexdigest())
