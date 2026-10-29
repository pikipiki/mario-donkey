#!/usr/bin/env python3
"""Private EU-ROM native sequence probes; never reads or writes player saves.
Milde fixture reproduces the stores after accepted ground pound (06B048).
Froggy uses the room's original exit controller selected by placement bits.
"""
import argparse,sys,json,hashlib,ast
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--boss',choices=['milde','froggy'],required=True);p.add_argument('--work',type=Path,default=Path(__file__).resolve().parents[2]);p.add_argument('--stomach',action='store_true');p.add_argument('--extract-only',action='store_true');p.add_argument('--hurt',action='store_true');p.add_argument('--frames',type=int,default=400);a=p.parse_args();w=a.work.resolve();repo=Path(__file__).resolve().parents[1];out=w/'native-boss-sequences'/a.boss;out=out/'stomach'if a.stomach else out/'hurt'if a.hurt else out;out.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(w/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import host_stage1
word=lambda b,i:b[i]|b[i+1]<<8

def info(s,t):
 return {'tick':t,'camera':[word(s.wram,0x39),word(s.wram,0x3b)],'global105e':word(s.wram,0x105e),'mode':s.wram[0x118],'slots':[{'slot':j,'id':word(s.gsu,0x1360+j*4),'state':word(s.gsu,0xf00+j*4),'phase':word(s.gsu,0x1a36+j*4),'w4':word(s.gsu,0x1978+j*4),'w5':word(s.gsu,0x19d6+j*4),'w6':word(s.gsu,0x19d8+j*4),'anim':word(s.gsu,0x1402+j*4),'x':word(s.gsu,0x10e2+j*4),'y':word(s.gsu,0x1182+j*4)}for j in range(24)if word(s.gsu,0xf00+j*4)]}

def save(s,i,t):
 raw=s.bgra+s.wram+s.gsu+s.vram+s.oam+s.cgram;(out/f'raw-{i}.bin').write_bytes(raw);(out/f'state-{i}.txt').write_text(repr(s.state));r=info(s,t);r['capture']=i;r['rawSha256']=hashlib.sha256(raw).hexdigest()
 if i%20==0:s.image().save(out/f'view-{i}.png');print(json.dumps(r),flush=True)
 return r

if not a.extract_only:
 with Emulator(w/'vendor/Mesen.app/Contents/MacOS/Mesen',repo/'public/rom/yoshi-eu.sfc',out/'worker',role='probe')as core:
  s=host_stage1(core)
  room,stage,x,y=(0x82,39,2,0x79)if a.boss=='milde'else(0xbf,31,0x15,0x6b)
  if a.stomach:room,stage,x,y=0xc9,31,6,0x75
  patches=[('snesWorkRam',0x218,0,2),('snesWorkRam',0x21a,stage,2),('snesWorkRam',0x38e,0,2),('snesWorkRam',0x38c,1,2),('snesWorkRam',0x118,15,1)]+[('snesWorkRam',0x17e00+i,v,1)for i,v in enumerate([room,x,y,0])]
  s=core.step(60,writes=patches)
  fixture=[]
  if a.boss=='milde':
   for i in range(100):
    patches=[('gsuWorkRam',0x1d6,512,2),('gsuWorkRam',0x8c,136,2),('gsuWorkRam',0x90,1936,2),('gsuWorkRam',0xaa,0,2)]
    if i in[25,50,75]:patches.append(('snesWorkRam',0x1017,65535,2))
    s=core.step(12,('a',)if i%6==0 else(),writes=patches)
   print('MATURE',json.dumps(info(s,0)),flush=True)
   # Stores performed by native accepted ground-pound code; subsequent state runs unpatched.
   slot=next(j for j in range(24)if word(s.gsu,0x1360+j*4)==0xd2 and word(s.gsu,0xf00+j*4))
   fixture=[('gsuWorkRam',0x1978+slot*4,256,2),('gsuWorkRam',0x19d6+slot*4,256,2),('gsuWorkRam',0x1976+slot*4,0xe000,2),('gsuWorkRam',0x1402+slot*4,9,2),('gsuWorkRam',0x1a36+slot*4,10,2),('gsuWorkRam',0x1220+slot*4,0,2),('gsuWorkRam',0xac,2,2)]
   if a.hurt:fixture=[('gsuWorkRam',0x1220+slot*4,0,2),('gsuWorkRam',0x1900+slot*4,0xfffc,2),('gsuWorkRam',0x1978+slot*4,252,2),('gsuWorkRam',0x1a36+slot*4,6,2),('gsuWorkRam',0x1902+slot*4,3,2),('gsuWorkRam',0xac,2,2)]
  else:
   # Native outside exit route has controller bit4 set in both X and Y.
   # Set controller placement before initialization; same original room/palettes.
   ids=info(s,0);print('ENTRY',json.dumps(ids),flush=True)
   # Native frog subtype0D is intro; subtype0E is post-stomach exit (bank02C814).
   slots=[j for j in range(24)if word(s.gsu,0x1360+j*4)==0x17 and word(s.gsu,0xf00+j*4)]
   if not slots:
    s=core.step(24);slots=[j for j in range(24)if word(s.gsu,0x1360+j*4)==0x17 and word(s.gsu,0xf00+j*4)]
   if slots:
    sl=slots[0];fixture=[('gsuWorkRam',0x10e2+sl*4,376,2),('gsuWorkRam',0x1182+sl*4,1688,2),('gsuWorkRam',0x8c,360,2),('gsuWorkRam',0x90,1680,2),('gsuWorkRam',0x1220+sl*4,0,2),('gsuWorkRam',0x1222+sl*4,0,2),('gsuWorkRam',0x1976+sl*4,0,2),('gsuWorkRam',0x1978+sl*4,0,2),('gsuWorkRam',0x19d8+sl*4,0,2),('gsuWorkRam',0xf00+sl*4,0xe,2),('gsuWorkRam',0x19d6+sl*4,0,2),('gsuWorkRam',0x1542+sl*4,0,2),('gsuWorkRam',0x1a96+sl*4,128,2),('snesWorkRam',0x105e,96,2)]
  if a.stomach:
   s=core.step(180,writes=[('gsuWorkRam',0x1d6,512,2)]);print('STOMACH',json.dumps(info(s,0)),flush=True)
   slots=[j for j in range(24)if word(s.gsu,0x1360+j*4)==0x45 and word(s.gsu,0xf00+j*4)]
   sl=slots[0];fixture=[('gsuWorkRam',0x1a96+sl*4,32,2),('gsuWorkRam',0x1a98+sl*4,32,2),('gsuWorkRam',0x1a38+sl*4,0x4000,2)]
  rows=[save(s,0,0)];s=core.step(1,writes=fixture)
  for i in range(1,a.frames//2+1):
   rows.append(save(s,i,i*2-1))
   patches=[('gsuWorkRam',0x1d6,512,2)]+([('gsuWorkRam',0xac,2,2)]if a.boss=='milde'else[])
   # Consecutive accepted ground pounds for all native descendants, cinematic fixture.
   if a.boss=='milde'and not a.hurt and i in [32,64,96,120,144]:
    sid={32:0xd3,64:0xd4,96:0x108,120:0x108,144:0x108}[i]
    targets=[j for j in range(24)if word(s.gsu,0x1360+j*4)==sid and word(s.gsu,0xf00+j*4)]
    event=[]
    for n,j in enumerate(targets):
     event.extend([('gsuWorkRam',0x10e2+j*4,221+(n-len(targets)//2)*(8 if sid==0x108 else 18),2),('gsuWorkRam',0x1220+j*4,0,2)])
     if sid in [0xd3,0xd4]:
      event.extend([('gsuWorkRam',0x1976+j*4,0,2),('gsuWorkRam',0x19d6+j*4,3,2),('gsuWorkRam',0xfa0+j*4,word(s.gsu,0xfa0+j*4)&0xf9ff,2)])
      if sid==0xd4:event.extend([('gsuWorkRam',0x1402+j*4,2,2),('gsuWorkRam',0x1040+j*4,(word(s.gsu,0x1040+j*4)&0x1ff)|0x4000,2)])
     else:event.extend([('gsuWorkRam',0x1978+j*4,2,2),('gsuWorkRam',0xfa0+j*4,0x7c60,2),('gsuWorkRam',0x1040+j*4,0x1175,2),('gsuWorkRam',0x1402+j*4,10,2),('gsuWorkRam',0x1a98+j*4,9,2),('gsuWorkRam',0x19d6+j*4,1,2)])
    patches.extend(event);fixture.append({'tick':i*2-1,'acceptedDescendantId':sid,'source':'0F9827 / 0F991A / 04D085','writes':event})
   s=core.step(2,writes=patches)
  (out/'captures.json').write_text(json.dumps({'boss':a.boss,'romSha256':hashlib.sha256((repo/'public/rom/yoshi-eu.sfc').read_bytes()).hexdigest(),'nativeHz':50,'fixture':fixture,'source':['06B02A-06B071','06AEA0-06AFA6']if a.boss=='milde'else['02C7F4-02C89D','sprite17 native state0E'],'captures':rows},indent=2))


# Reuse the audited tile/HDMA decoder, preserving native crop coordinates.
def extract(folder,boss,clip,indices):
 from types import SimpleNamespace
 from PIL import Image
 source=(repo/'scripts/extract-yoshi-guardians.py').read_text()
 source=source[source.index('def decode('):source.index('frames=[];groups=')]
 source=source.replace("word(g,0xf00+i*4)==0x10", "word(g,0xf00+i*4)!=0")
 source=source.replace('(400 if shift else 160)','(400 if shift else 240)')
 source=source.replace('(200 if shift else 80)','(200 if shift else 120)')
 begin=source.index(' crop=body.crop(bbox);scale=')
 end=source.index(' return result,',begin)
 source=source[:begin]+" crop=body.crop(bbox)\n"+source[end:]
 source=source.replace('return result,','return crop,')
 source=source.replace(" base=int(state['ppu.oamBaseAddress'])", " if config.get('bg'):\n  counts=[sum(bool(body.getpixel((xx,yy))[3])for xx in range(canvas))for yy in range(height)]\n  for yy,count in enumerate(counts):\n   if count>100 and max(counts[yy-1]if yy else 0,counts[yy+1]if yy+1<height else 0)<count*.65:\n    for xx in range(canvas):body.putpixel((xx,yy),(0,0,0,0))\n base=int(state['ppu.oamBaseAddress'])")
 source=source.replace("  if (tile not","  if (tile not")
 source=source.replace("  im=Image.new('RGBA',(size,size))","  hp=word(g,0x1362);hc=g[0x1041]&252\n  hero={(word(g,j)&511,(word(g,j+2)-1)&255,g[j+4],g[j+5])for j in range(max(0,hp-48),min(0x8000,hp+hc),8)}\n  if(xx&511,yy,tile&255,attr)in hero:continue\n  im=Image.new('RGBA',(size,size))")
 source=source.replace("if tile not in config['tiles']or pal not in config['pal']or","if (tile not in config.get('palTiles',{}).get(pal, config['tiles']if pal in config['pal']else set()))or")
 ns={'a':SimpleNamespace(work=w),'ast':ast,'hashlib':hashlib,'Image':Image}
 exec(source,ns)
 rawmeta=json.loads((folder/'captures.json').read_text());records=[];anchor=None
 config={'folder':str(folder.relative_to(w)),'id':0xd2 if boss=='milde'else 0x17,'pal':[6,7]if boss=='milde'else[1],'tiles':set(range(512))if boss=='milde'else set(range(0x100,0x120))}
 if a.stomach:config.update(id=0x45,bg=True,layer=0,below=120,pal=[7],tiles={0x1cc,0x1ce,0x1ec,0x1ee,0x12b})
 for n in [0,*indices]:
  row=rawmeta['captures'][n]
  if boss=='milde':
   config['id']=0xd2 if any(s['id']==0xd2 for s in row['slots'])else 0x13
   config['bg']=any(s['id']==0xd2 and s['phase']<14 for s in row['slots'])
   config['palTiles']={4:set(range(512)),6:set(range(512)),7:set(range(512)),5:set(),3:{0x44,0x45,0x54,0x55,0xe1}}
  try:im,ev=ns['decode'](boss,config,n)
  except ValueError as err:
   if 'Empty'not in str(err):raise
   im=Image.new('RGBA',(1,1));ev={'sourceBounds':[0,0,1,1],'nativePosition':anchor or[0,0]}
  bounds=ev['sourceBounds']
  if n==0:continue
  if anchor is None:anchor=[(bounds[0]+bounds[2])//2,bounds[3]]
  fn=f'{clip}-{n:03}.png';im.save(folder/fn)
  records.append({'file':fn,'duration':.04,'nativeFrames':2,'dx':bounds[0]-anchor[0]if im.getbbox()else 0,'dy':bounds[1]-anchor[1]if im.getbbox()else 0,'capture':n,'nativePhase':next((s['phase']for s in row['slots']if s['id']==config['id']),None),'nativePositions':row['slots'],'rawSha256':row['rawSha256']})
 return records

clip='hurt-1'if a.hurt or a.stomach else'dead'
count=len(json.loads((out/'captures.json').read_text())['captures'])
indices=range(1,min(count,65 if a.boss=='froggy'else count))
frames=extract(out,a.boss,clip,indices)
(out/'clips.json').write_text(json.dumps({'boss':a.boss,'nativeHz':50,'clips':{clip:frames},'provenance':json.loads((out/'captures.json').read_text())|{'captures':'See captures.json; raw snapshots retained privately'}},indent=2)+'\n')
print('Extracted',len(frames),a.boss,clip,flush=True)

provenance=json.loads((out/'clips.json').read_text())['provenance']
provenance['sourceHashes']={name:hashlib.sha256((w/'yoshi-source/disassembly'/name).read_bytes()).hexdigest()for name in ['bank02.asm','bank04.asm','bank06.asm','bank0E.asm','bank0F.asm']}
provenance['captureScriptSha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
provenance['notes']=("Original D2 nonfatal squash (06AFF1), no persistent HP/size loss. Terminal accepted-ground-pound squash (06B048) then D3->D4->108 splits and small-Milde pops (0F9827,0F991A,04D085). Descendants are repositioned ONLY at scripted contact to fit donor viewport. A second accepted stomp kills the last3 that resumed walking after simultaneous stomp fixture; all descendant slots gone by native frame257. Native trajectories between contact events retained. BG2+OBJ decoded from VRAM/OAM/CGRAM, no screen keying. Native standard boss-clear fullscreen palette/window wipe13 is not reproduced as a fullscreen effect; its localized native burst particles are retained. No user SRAM read."if a.boss=='milde'else "Outside post-stomach return, native headbop state0E (02C814 and0EF7CE): frog mouth frames0F/10, ejection/restoration timing128 native frames. Frog is positioned from original controller return offsets(-58,-28), motion state reset as fresh spawn. This is NOT the native inside-stomach hurt phase, and original outside frog does not shrink/disappear like Burt. Outside combat hurt remains unavailable. OBJ decoded without screen keying. No user SRAM read.")
clips={clip:[{k:r[k]for k in ['file','duration','dx','dy']}for r in frames]}
if a.stomach:
 provenance['notes']='Original roomC9 native stomach/throat damage wobble, timer1/timer2=32 and accumulated damage4000 post-collision fixture. Original main02C950 and hurt selection02CCD3. BG1 HDMA context native; damage-palette one-shot02CC88 interpolation was not invoked, so do not claim full HP palette progression. Native inside context is deliberately separate from outside frog.'
if a.boss=='milde'and not a.hurt:
 hurt=json.loads((out/'hurt/clips.json').read_text())['clips']['hurt-1']
 for n in range(1,6):clips[f'hurt-{n}']=[{'file':'hurt/'+r['file'],'duration':r['duration'],'dx':r['dx'],'dy':r['dy']}for r in hurt[:25]]
(out/'sequences.json').write_text(json.dumps({'boss':a.boss,'clips':clips,'provenance':provenance},indent=2)+'\n')
if a.boss=='froggy'and not a.stomach:
 from PIL import Image
 inner=out/'stomach';innerlog=json.loads((inner/'captures.json').read_text());inset=[]
 for n in range(1,25):
  raw=(inner/f'raw-{n}.bin').read_bytes();height=(len(raw)-0x20000-0x8000-0x10000-1056)//1024
  im=Image.frombytes('RGBA',(256,height),raw[:height*1024],'raw','BGRA').crop((96,16,160,88)).convert('RGB').convert('RGBA')
  fn=f'hurt-native-{n:03}.png';im.save(out/fn)
  inset.append({'file':fn,'duration':.04,'dx':-32,'dy':-140})
 j=json.loads((out/'sequences.json').read_text())
 for n in range(1,6):j['clips'][f'hurt-{n}']=inset
 j['clipScales']={f'hurt-{n}':.5 for n in range(1,6)}
 j['presentation']={'hurt':{'type':'native-stomach-inset','outsideFrogBehind':True,'rect':[96,16,160,88],'nativeDamageFixture':innerlog['fixture'],'nativeHz':50,'frames':48,'sourceAddresses':['02C950','02CC51','02CCD3','02CE78'],'sourceSnapshots':[r['rawSha256']for r in innerlog['captures'][1:25]],'limitations':'Original internal throat hurt wobble inset; original swallowing and internal arena not recreated. Observer/Yoshi and original HUD excluded geometrically. Native framebuffer pixels preserved; no color keying. Damage palette one-shot interpolation02CC88 not invoked by the post-collision timer/damage fixture.'}}
 j['provenance']['nativeStomachInset']=j['presentation']['hurt']
 (out/'sequences.json').write_text(json.dumps(j,indent=2)+'\n')
 print('Merged exact native internal throat hurt inset above outside frog',flush=True)
