#!/usr/bin/env python3
"""Extract original boss art from private Mesen snapshots, never screenshots.
Salvo, Milde and Bigger Boo combine 4bpp BG2 with native per-line HDMA and
4bpp OBJ details. Raphael, Tap-Tap and Prince Froggy use native generated OBJ.
Repeated BG projection components hidden by the native PPU actor window are
removed before composition. No screen color keying or generated art is used.
Usage: python extract-yoshi-guardians.py --work .. --output public/art
"""
import argparse,ast,hashlib,json,math
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--work',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
CELL=192;ORIGIN=(96,176);COLS=8
SOURCES={
 'froggy':{'folder':'guardian-froggy-native-outside','id':0x17,'frames':[3,5,10],'pal':[1],'tiles':set(range(0x100,0x120))},
 'milde':{'folder':'guardian-milde-native-eu','id':0xd2,'frames':[90,95,100,105,130,135,140],'pal':[6,7],'tiles':set(range(0x1c0,0x200)),'bg':True},
 'bigger-boo':{'folder':'guardian-bigger-boo-native','id':0x16,'below':80,'frames':[70,72,74,76,78,80,82,84],'pal':[1],'tiles':set(range(0x1c0,0x200)),'bg':True},
 'raphael':{'folder':'guardian-raphael-native','id':0xc,'frames':[78,79,80],'pal':[6],'tiles':set(range(0x1c0,0x200))},
 'tap-tap':{'folder':'guardian-tap-tap-native-fight','id':0x3c,'frames':[30,40,60,110,130,140],'pal':[6],'tiles':set(range(0x100,0x200))},
 'salvo':{'folder':'guardian-salvo-native','id':0x2d,'frames':[130,135,140,145,150,155,160,165,170,175,180,185,190],'pal':[0],'tiles':{0x10d,0x11d},'bg':True},

}
def decode(boss,config,number):
 folder=a.work/config['folder'];raw=(folder/f'raw-{number}.bin').read_bytes();state=ast.literal_eval((folder/f'state-{number}.txt').read_text());height=(len(raw)-0x20000-0x8000-0x10000-544-512)//1024
 if height not in[224,239]:raise ValueError('Unexpected native frame size')
 at=height*1024;w=raw[at:at+0x20000];at+=0x20000;g=raw[at:at+0x8000];at+=0x8000;v=raw[at:at+0x10000];at+=0x10000;o=raw[at:at+544];c=raw[at+544:]
 word=lambda memory,i:memory[i]|memory[i+1]<<8
 slots=[i for i in range(0,24)if word(g,0xf00+i*4)==0x10 and word(g,0x1360+i*4)==config['id']]
 if len(slots)!=1:raise ValueError(f'Unique active {boss} required: {slots}')
 slot=slots[0];x=word(g,0x10e2+slot*4)-word(w,0x39);feet=word(g,0x1182+slot*4)-word(w,0x3b)
 def palette(index):
  value=word(c,index*2);return tuple(((value>>shift)&31)*255//31 for shift in(0,5,10))+(255,)
 def hdma(table):
  values=[]
  while w[table]and len(values)<256:
   flag=w[table];count=flag&127 or 128;address=word(w,table+1);table+=3
   for _ in range(count):
    values.append(word(w,address))
    if flag&128:address+=2
  if len(values)<200:raise ValueError('Missing per-row deformation')
  return values
 shift=256 if config.get('virtual')else 0;canvas=768 if shift else 256;body=Image.new('RGBA',(canvas,height))
 if config.get('bg'):
  hs=hdma(int(state['dmaController.channel[3].srcAddress']));vs=hdma(int(state['dmaController.channel[4].srcAddress']));layer=config.get('layer',1);bpp=config.get('bpp',4);tileSize=16 if state[f'ppu.layers[{layer}].largeTiles']=='true'else 8;dw=state[f'ppu.layers[{layer}].doubleWidth']=='true';dh=state[f'ppu.layers[{layer}].doubleHeight']=='true';chrbase=int(state[f'ppu.layers[{layer}].chrAddress'])*2;tilemap=int(state[f'ppu.layers[{layer}].tilemapAddress'])*2
  if config.get('static'):hs=[int(state[f'ppu.layers[{layer}].hscroll'])]*256;vs=[int(state[f'ppu.layers[{layer}].vscroll'])]*256
  for yy in range(height):
   for xx in range(-shift,canvas-shift):
    bx=(xx+hs[min(yy,len(hs)-1)])%(tileSize*32*(2 if dw else 1));by=(yy+vs[min(yy,len(vs)-1)])%(tileSize*32*(2 if dh else 1));tx,ty=bx//tileSize,by//tileSize;desc=word(v,(tilemap+(ty//32)*(0x1000 if dw else 0x800)+(tx//32)*0x800+((ty%32)*32+tx%32)*2)&65535);px=bx%tileSize;py=by%tileSize
    if desc&0x4000:px=tileSize-1-px
    if desc&0x8000:py=tileSize-1-py
    tile=(desc&1023)+px//8+(py//8)*16;address=(chrbase+tile*(bpp*8)+py%8*2)&65535;bit=7-px%8;index=sum(((v[(address+off)&65535]>>bit)&1)<<plane for plane,off in enumerate((0,1,16,17)[:bpp]))
    if index:body.putpixel((xx+shift,yy),palette(((desc>>10)&7)*(1<<bpp)+index))
   occupied=[xx for xx in range(-shift,canvas-shift)if body.getpixel((xx+shift,yy))[3]];wrap=occupied and occupied[-1]-occupied[0]>(400 if shift else 160)
   for xx in range(-shift,canvas-shift):
    if wrap or not(x-(200 if shift else 80)<=xx<x+(200 if shift else 80) and feet-170<=yy<feet+config.get('below',16)):body.putpixel((xx+shift,yy),(0,0,0,0))
 if config.get('bg'):
  pixels=body.load();seen=set();components=[]
  for yy in range(height):
   for xx in range(-shift,canvas-shift):
    xx+=shift
    if (xx,yy)in seen or not pixels[xx,yy][3]:continue
    stack=[(xx,yy)];seen.add((xx,yy));part=[]
    while stack:
     px,py=stack.pop();part.append((px,py))
     for nx,ny in[(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
      if 0<=nx<canvas and 0<=ny<height and(nx,ny)not in seen and pixels[nx,ny][3]:seen.add((nx,ny));stack.append((nx,ny))
    if len(part)>20:
     cx=sum(px for px,py in part)/len(part);cy=sum(py for px,py in part)/len(part);components.append(((cx-(x+shift))**2+(cy-(feet-25))**2,part))
  if components:
   keep=set(min(components,key=lambda c:c[0])[1])
   for yy in range(height):
    for xx in range(-shift,canvas-shift):
     if(xx+shift,yy)not in keep:pixels[xx+shift,yy]=(0,0,0,0)
 base=int(state['ppu.oamBaseAddress'])*2;offset=int(state['ppu.oamAddressOffset'])*2
 for i in reversed(range(128)):
  xx,yy,tile,attr=o[i*4:i*4+4];ext=(o[512+i//4]>>((i%4)*2))&3;xx|=(ext&1)<<8;xx=xx-512 if xx>=256 else xx;tile|=(attr&1)<<8;pal=(attr>>1)&7;size=16 if ext&2 else 8
  if tile not in config['tiles']or pal not in config['pal']or not(x-120<=xx<x+120 and feet-180<=yy<feet+80):continue
  im=Image.new('RGBA',(size,size));origin=tile&255;start=(base+((tile>>8)&1)*offset)&65535
  for dy in range(size):
   sy=size-1-dy if attr&128 else dy
   for dx in range(size):
    sx=size-1-dx if attr&64 else dx;tn=(((origin&240)+(sy//8)*16)&240)|((origin+sx//8)&15);address=(start+tn*32+(sy%8)*2)&65535;bit=7-sx%8;index=sum(((v[(address+off)&65535]>>bit)&1)<<plane for plane,off in enumerate((0,1,16,17)))
    if index:im.putpixel((dx,dy),palette(128+pal*16+index))
  body.alpha_composite(im,(xx+shift,yy))
 bbox=body.getbbox()
 if bbox is None:raise ValueError(f'Empty {boss} native frame{number}')
 # Boss sprite positions can refer to the center (Boo), or the lower body
 # (Salvo). Align the extracted visible feet to one common atlas anchor.
 crop=body.crop(bbox);scale=min(1,180/crop.width,170/crop.height)
 if scale<1:crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
 result=Image.new('RGBA',(CELL,CELL));result.alpha_composite(crop,(ORIGIN[0]-crop.width//2,ORIGIN[1]-crop.height))
 return result,{'capture':number,'rawSha256':hashlib.sha256(raw).hexdigest(),'actorSlot':slot,'nativePosition':[x,feet],'sourceBounds':bbox,'nativePhase':g[0x19d6+slot*4],'nativeYSpeed':word(g,0x1222+slot*4)}
frames=[];groups={};evidence={}
for boss,config in SOURCES.items():
 start=len(frames);rows=[]
 for number in config['frames']:
  im,ev=decode(boss,config,number);frames.append(im);rows.append(ev)
 anim={'start':start,'frames':len(rows),'fps':8};groups[boss]={state:anim.copy()for state in['idle','attack','hurt','windup','rise','fall','land']};groups[boss]['dead']={'start':len(frames)-1,'frames':1,'fps':1}
 evidence[boss]={'captureDirectory':config['folder'],'nativeSpriteId':config['id'],'fixture':('Room entry, safe observer coordinates and Kamek intro completion notification at EU1017; native mature Milde animation'if boss=='milde'else 'Room entry and observer invulnerability'),'layers':'BG2+OBJ'if config.get('bg')else'OBJ','frames':rows}
atlas=Image.new('RGBA',(COLS*CELL,math.ceil(len(frames)/COLS)*CELL))
for i,im in enumerate(frames):atlas.alpha_composite(im,(i%COLS*CELL,i//COLS*CELL))
a.output.mkdir(parents=True,exist_ok=True);atlas.save(a.output/'yoshi-guardians.png',optimize=True)
manifest={'cell':CELL,'columns':COLS,'origin':ORIGIN,'groups':groups,'provenance':{'source':'Original Yoshi Island Europe ROM; native 4bpp tiles, CGRAM palettes and HDMA; no recolors or generated art','romSha256':'91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90','captureScript':'scripts/capture-yoshi-guardians.py','extractScript':'scripts/extract-yoshi-guardians.py','bosses':evidence,'limitations':'Froggy uses his original outside frog form (roomBF sprite17 subtype0D); the original battle inside his stomach is not recreated. Raphael uses original transformation poses, not a complete moon fight sequence. Original captured movement poses; no separately captured hurt/defeat sequences. Runtime hurt flash and defeat fade are adaptations. Motion ports are source-informed adaptations, not emulation of donor AI.'}}
(a.output/'yoshi-guardians.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Wrote',len(frames),'native poses',atlas.size)
