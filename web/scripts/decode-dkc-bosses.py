#!/usr/bin/env python3
"""Decode original DKC USA Rev2 boss frames from the local ROM/source metadata."""
import argparse,hashlib,json,re,struct
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--rom',type=Path,required=True);p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
r=a.rom.read_bytes();source=a.source.read_text()
if hashlib.sha256(r).hexdigest()!='628147468c3539283197f58f03b94df49758a332831857481ea9cc31645f0527':raise ValueError('Unsupported donor ROM')
assets={};palettes={};used=set()
for m in re.finditer(r'(?:DATA|UNK)_([A-F0-9]{6}):((?:(?!\n(?:DATA|UNK|CODE)_[A-F0-9]{6}:).)*?)incbin "(Graphics/DynamicSprites/([^"/]+)|Palettes/([^"/]+))\.bin"([^\n]*)',source,re.S):
 addr=int(m[1],16)&0x3fffff
 if m[5]:palettes[m[5]]=addr;continue
 header=bytes(int(v,16) for v in re.findall(r'\$([A-F0-9]{2})(?![A-F0-9])',m[2]));size=re.search(r'GFXSize = \$([A-F0-9]+)',m[6])
 if not size or not header:continue
 if r[addr:addr+len(header)]!=header:
  addr=r.find(header)
  while addr>=0 and addr in used:addr=r.find(header,addr+1)
  if addr<0:continue
 used.add(addr);assets[m[4]]=(addr,header,int(size[1],16))
def palette(name):
 pos=palettes['Sprite_'+name];colors=[(0,0,0,0)]
 for i in range(15):
  value=struct.unpack_from('<H',r,pos+2*i)[0];colors.append(tuple(((value>>s)&31)*255//31 for s in (0,5,10))+(255,))
 return colors
cell=192;origin=(96,144)
def decode(name,pal):
 addr,h,size=assets[name];n=(len(h)-8)//2;large=(size//32-n)//3
 if len(h)%2 or (size//32-n)%3 or large<0 or large>n:raise ValueError((name,'layout'))
 raw=r[addr+len(h):addr+len(h)+size];data=bytearray(8192);data[:h[5]*32]=raw[:h[5]*32]
 if h[7]:data[h[6]*32:(h[6]+h[7])*32]=raw[h[5]*32:(h[5]+h[7])*32]
 im=Image.new('RGBA',(cell,cell))
 for k in range(n):
  side=16 if k<large else 8;x=h[8+2*k]-128+origin[0];y=h[9+2*k]-128+origin[1]
  for py in range(side):
   for px in range(side):
    tile=(k//8)*32+(k%8)*2+(py//8)*16+px//8 if k<large else large*2+k-large if k-large<h[1] else h[4]+k-large-h[1]
    row=tile*32+(py%8)*2;bit=7-px%8;color=sum(((data[row+off]>>bit)&1)<<plane for plane,off in enumerate((0,1,16,17)))
    if color:
     if not (0<=x+px<cell and 0<=y+py<cell):raise ValueError((name,'clipped pixel'))
     im.putpixel((x+px,y+py),pal[color])
 return im
entries=[('gnawty','VeryGnawty','GreenGnawty'),('necky','MasterNecky','MasterNecky'),('queen-b','QueenB','YellowQueenB'),('really-gnawty','VeryGnawty','RedGnawty'),('dumb-drum','DumbDrum','DumbDrum'),('necky-snr','MasterNecky','MasterNeckySnr'),('k-rool','KRool','KRool')]
frames=[];groups={};bounds={};sequences={}
for key,prefix,pal in entries:
 states={}
 for state,choices in {'idle':['Idle','Fly','Hop'],'attack':['Run','Dump','Hop','Idle','Fly'],'hurt':['Hurt','HurtLaugh','Dead','Idle','Fly','Hop'],'dead':['Dead','Hurt','HurtLaugh','Dump','Idle','Fly','Hop']}.items():
  names=[]
  for animation in choices:
   root='GFX_'+prefix+'_'+animation
   names=[n for n in assets if n==root or re.fullmatch(re.escape(root)+r'\d+',n)]
   names.sort(key=lambda n:int(re.search(r'(\d+)$',n)[1]) if re.search(r'(\d+)$',n) else 0)
   if names:break
  if not names:raise ValueError((key,state,'missing original animation'))
  if len(names)>12:names=[names[i*len(names)//12] for i in range(12)]
  sequence=(pal,tuple(names));start=sequences.get(sequence)
  if start is None:
   start=len(frames);sequences[sequence]=start
   for name in names:
    image=decode(name,palette(pal));bounds[name]=image.getbbox();frames.append(image)
  states[state]={'start':start,'frames':len(names),'fps':10,'sourceFrames':names}
 groups[key]=states
# Lossless union crop: every boss frame fits inside this 128px square.
cell=128;origin=(64,104);columns=12
image=Image.new('RGBA',(cell*columns,cell*((len(frames)+columns-1)//columns)))
for i,frame in enumerate(frames):
 box=frame.getbbox()
 if not box or box[0]<32 or box[1]<40 or box[2]>160 or box[3]>168:raise ValueError('Boss crop would lose pixels')
 image.alpha_composite(frame.crop((32,40,160,168)),((i%columns)*cell,(i//columns)*cell))
a.output.mkdir(parents=True,exist_ok=True);image.save(a.output/'dkc-bosses.png')
(a.output/'dkc-bosses.json').write_text(json.dumps({'cell':cell,'columns':columns,'origin':origin,'groups':groups,'romSha256':hashlib.sha256(r).hexdigest()},indent=2)+'\n')
print('Boss atlas',len(frames),'frames',image.size,'PNG bytes',(a.output/'dkc-bosses.png').stat().st_size)
for key,prefix,pal in entries:print(key,[v for k,v in bounds.items() if k.startswith('GFX_'+prefix+'_')][:2])
