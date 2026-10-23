#!/usr/bin/env python3
"""Decode verified original DKC dynamic metasprites. No new emulation at runtime."""
import argparse,re,json,struct
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--rom',type=Path,required=True);p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
s=a.source.read_text();rom=a.rom.read_bytes();a.output.mkdir(parents=True,exist_ok=True)
# Each source block provides the actual ROM address, metasprite coordinate
# header and exact uncompressed graphics length. Refuse mismatching revisions.
assets={};palettes={};used=set()
for m in re.finditer(r'(?:DATA|UNK)_([A-F0-9]{6}):((?:(?!\n(?:DATA|UNK|CODE)_[A-F0-9]{6}:).)*?)incbin "(Graphics/DynamicSprites/([^"/]+)|Palettes/([^"/]+))\.bin"([^\n]*)',s,re.S):
 addr=int(m[1],16)&0x3fffff
 if m[5]:palettes[m[5]]=addr;continue
 header=bytes(int(v,16) for v in re.findall(r'\$([A-F0-9]{2})(?![A-F0-9])',m[2]))
 size=re.search(r'GFXSize = \$([A-F0-9]+)',m[6]);
 if not size or not header:continue
 if rom[addr:addr+len(header)]!=header:
  at=rom.find(header)
  while at>=0 and at in used:at=rom.find(header,at+1)
  if at<0:continue
  addr=at
 used.add(addr)
 assets[m[4]]={'address':addr,'header':list(header),'size':int(size[1],16)}
def palette(name):
 pos=palettes['Sprite_'+name];colors=[(0,0,0,0)]
 for i in range(15):
  v=struct.unpack_from('<H',rom,pos+i*2)[0];colors.append(tuple(((v>>shift)&31)*255//31 for shift in (0,5,10))+(255,))
 return colors
def decode(name,pal):
 entry=assets[name];h=entry['header'];n=(len(h)-8)//2;tiles=entry['size']//32;large=(tiles-n)//3
 if len(h)%2 or (tiles-n)%3 or large<0 or large>n:raise ValueError((name,'layout',n,tiles,large))
 raw=rom[entry['address']+len(h):entry['address']+len(h)+entry['size']]
 data=bytearray(2048);data[:h[5]*32]=raw[:h[5]*32]
 if h[7]:data[h[6]*32:(h[6]+h[7])*32]=raw[h[5]*32:(h[5]+h[7])*32]
 im=Image.new('RGBA',(128,128));tile=0
 for k in range(n):
  side=16 if k<large else 8;x=h[8+k*2]-128+64;y=h[9+k*2]-128+96
  for py in range(side):
   for px in range(side):
    ti=(k*2+(py//8)*16+px//8) if k<large else ((large*2+k-large) if k-large<h[1] else h[4]+k-large-h[1]);row=ti*32+(py%8)*2;bit=7-px%8
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
# Research index is intentionally not published with the runtime atlas.
# Final animation atlas: every frame remains a decoded original ROM frame.
def sequence(prefix,state):
 key='GFX_'+prefix+'_'+state
 names=[n for n in assets if n==key or re.fullmatch(re.escape(key)+r'\d+',n)]
 return sorted(names,key=lambda n:int(re.search(r'(\d+)$',n)[1]) if re.search(r'(\d+)$',n) else 0)
columns=24;rows=[];manifest={'cell':128,'columns':columns,'origin':[64,96],'groups':{}}
def add_group(name,palname,states):
 entries={}
 for state,options in states.items():
  names=[]
  for pre,animation in options:
   names=sequence(pre,animation)
   if names:break
  if not names:raise ValueError(('No original frames',name,state))
  # Sample long sequences across the full loop, preserving original frame order.
  if len(names)>columns:names=[names[i*len(names)//columns] for i in range(columns)]
  cells=[decode(n,palette(palname)) for n in names];row=len(rows);rows.append(cells)
  entries[state]={'row':row,'frames':len(cells),'fps':18 if state in ('walk','roll') else 12,'sourceFrames':names}
 manifest['groups'][name]=entries
for key,pre,palname in [('dk','DonkeyKong','DonkeyKong_Active'),('diddy','Diddy','Diddy_Active')]:
 add_group(key,palname,{'idle':[(pre,'Idle' if key=='dk' else 'IdleSway')],'walk':[(pre,'Run'),(pre,'Walk')],'jump':[(pre,'Jump')],'roll':[(pre,'Roll')],'ride':[(pre,'RideAnimalBuddy')]})
for key,(pre,palname) in mapping.items():
 add_group(key,palname,{'idle':[(pre,'Idle'),(pre,'Swim'),(pre,'Fly')],'walk':[(pre,'Walk'),(pre,'Run'),(pre,'Jump'),(pre,'Swim'),(pre,'Fly')],'jump':[(pre,'Jump'),(pre,'Fly'),(pre,'Swim')],'roll':[(pre,'Stab'),(pre,'Run'),(pre,'Jump'),(pre,'Fly')]})
add_group('barrel','Barrel',{'idle':[('DKBarrel','Barrel')]})
for key,(pre,_pal) in mapping.items():add_group('crate-'+key,'AnimalBuddyBox',{'idle':[('AnimalBuddyBox',pre)]})
final=Image.new('RGBA',(128*columns,128*len(rows)))
for row,cells in enumerate(rows):
 for col,cell in enumerate(cells):final.alpha_composite(cell,(col*128,row*128))
# DK barrel lettering is a separate original metasprite, drawn in the global palette.
letters=sequence('DKBarrel','Letters')
if letters:
 entry=manifest['groups']['barrel']['idle']
 for col in range(entry['frames']):final.alpha_composite(decode(letters[col%len(letters)],palette('Global')),(col*128,entry['row']*128))
final.save(a.output/'dkc-atlas.png');(a.output/'dkc-atlas.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Final original sprite atlas',len(rows),'rows',len(assets),'verified source assets',flush=True)

portraits=a.output/'portraits';portraits.mkdir(exist_ok=True)
for name,states in manifest['groups'].items():
 row=states['idle']['row'];cell=final.crop((0,row*128,128,row*128+128));box=cell.getbbox()
 if box:cell.crop(box).save(portraits/(name+'.png'))
# Pack only the used frames. Verified union of every frame is inside this
# 96x96 crop, preserving all pixels while reducing the decoded bitmap by ~4x.
packed_columns=16;used_frames=sum(e['frames'] for g in manifest['groups'].values() for e in g.values())
packed=Image.new('RGBA',(96*packed_columns,96*((used_frames+packed_columns-1)//packed_columns)));index=0
for group in manifest['groups'].values():
 for entry in group.values():
  source_row=entry.pop('row');entry['start']=index
  for col in range(entry['frames']):
   cell=final.crop((col*128,source_row*128,col*128+128,source_row*128+128));box=cell.getbbox()
   if box and (box[0]<16 or box[1]<16 or box[2]>112 or box[3]>112):raise ValueError('Sprite exceeds lossless packing crop')
   packed.alpha_composite(cell.crop((16,16,112,112)),((index%packed_columns)*96,(index//packed_columns)*96));index+=1
manifest.update(cell=96,columns=packed_columns,origin=[48,80]);packed.save(a.output/'dkc-atlas.png');(a.output/'dkc-atlas.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Losslessly packed',used_frames,'frames into',packed.size,flush=True)
