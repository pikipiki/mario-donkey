import sys,json,hashlib
from pathlib import Path
from PIL import Image
import argparse
p=argparse.ArgumentParser();p.add_argument('--work',required=True,type=Path);args=p.parse_args();root=args.work.resolve();sys.path.insert(0,str(root/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import host_stage1
from bridge.snes import objects,object_image
out=root/'mario-yoshi-native';out.mkdir(exist_ok=True);frames=[];groups={};evidence=[]
def capture(s,name):
 x=s.word(0x70008c)-s.word(0x7e0039)+8;y=s.word(0x700090)-s.word(0x7e003b)+31
 image=Image.new('RGBA',(64,64));base=int(s.state['ppu.oamBaseAddress'])*2;offset=int(s.state['ppu.oamAddressOffset'])*2
 parts=[]
 for obj in reversed(list(objects(s.oam,int(s.state['ppu.oamMode'])))):
  if obj.palette!=5 or not (obj.tile<0x20 or 0x60<=obj.tile<=0x67) or abs(obj.x-x)>40 or abs(obj.y-y)>62:continue
  image.alpha_composite(object_image(obj,s.vram,s.cgram,base,offset),(round(32+obj.x-x),round(56+obj.y-y)));parts.append([obj.tile,obj.palette])
 if not image.getbbox() or not any(0x60<=p[0]<=0x67 for p in parts):
  s.image().save(out/'missing.png');print('MISSING',name,s.wram[0x118],s.word(0x7000c4),x,y,[obj for obj in objects(s.oam,int(s.state['ppu.oamMode'])) if abs(obj.x-x)<50 and abs(obj.y-y)<70],flush=True);raise ValueError('Baby Mario missing '+name)
 if s.word(0x7000c4)!=0:image=image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
 frames.append(image);evidence.append({'pose':name,'parts':parts,'rawSha256':hashlib.sha256(s.bgra+s.wram+s.gsu+s.vram+s.oam+s.cgram).hexdigest()})
 s.image().save(out/(name+'.png'))
with Emulator(root/'vendor/Mesen.app/Contents/MacOS/Mesen',Path(__file__).resolve().parents[1]/'public/rom/yoshi-eu.sfc',out/'worker',role='probe') as core:
 s=host_stage1(core)
 for _ in range(8):
  if s.wram[0xd11]:core.step(2,('a',),snapshot=False)
  s=core.step(20)
 # Safe source scene 1-1 spawn, original animation only.
 for name,buttons,count,spacing in [('idle',(),4,8),('walk',('right',),8,3),('jump',('b','right'),4,5),('flutter',('b',),4,5)]:
  if name=='flutter':core.step(8,snapshot=False)
  start=len(frames)
  for i in range(count):
   s=core.step(spacing,buttons);capture(s,name+'-'+str(i))
  groups[name]={'start':start,'frames':count,'fps':12 if name=='walk' else 8}
 # Exclude four captures with a dynamic OBJ upload crossing the OAM frame boundary.
 keep=[1,2,3,4,5,6,8,9,12,13,14,15,16,17,18,19]
 frames=[frames[i] for i in keep];evidence=[evidence[i] for i in keep]
 groups={'idle':{'start':0,'frames':3,'fps':6},'walk':{'start':3,'frames':5,'fps':12},'jump':{'start':8,'frames':4,'fps':8},'flutter':{'start':12,'frames':4,'fps':8}}
 sheet=Image.new('RGBA',(64*len(frames),64))
 for i,im in enumerate(frames):sheet.alpha_composite(im,(i*64,0))
 sheet.save(out/'mario-yoshi.png',optimize=True)
 (out/'mario-yoshi.json').write_text(json.dumps({'cell':64,'columns':len(frames),'origin':[32,56],'groups':{'mario-yoshi':groups},'provenance':{'source':'Yoshi Island EU native original Yoshi and Baby Mario OBJ, transparency from palette index0','romSha256':hashlib.sha256((Path(__file__).resolve().parents[1]/'public/rom/yoshi-eu.sfc').read_bytes()).hexdigest(),'captures':evidence}},indent=2))
 print('Captured',len(frames),flush=True)
