#!/usr/bin/env python3
"""Native EU50Hz boss sequence capture in isolated Mesen, never player SRAM.
Private RAM stimuli enter original post-collision states; no animation code patched.
"""
import sys,json,hashlib,argparse
from pathlib import Path
from PIL import Image
P=argparse.ArgumentParser();P.add_argument('--work',type=Path,required=True);P.add_argument('--boss',choices=['raphael','tap-tap'],required=True);P.add_argument('--probe',action='store_true');a=P.parse_args();work=a.work.resolve();out=work/'native-boss-sequences'/a.boss;out.mkdir(parents=True,exist_ok=True);sys.path.insert(0,str(work/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import host_stage1
from bridge.snes import objects,object_image
rom=Path(__file__).resolve().parents[1]/'public/rom/yoshi-eu.sfc'
word=lambda b,i:b[i]|b[i+1]<<8
G=lambda addr,val,width=2:('gsuWorkRam',addr,val&65535,width)
W=lambda addr,val,width=1:('snesWorkRam',addr,val&65535,width)
room,stage,x,y,sid=(0xcb,55,8,8,0xc)if a.boss=='raphael'else(0xcc,64,0x4c,0x76,0x3c)
def slots(s):return[j for j in range(24)if word(s.gsu,0xf00+j*4)and word(s.gsu,0x1360+j*4)==sid]
def row(s,t):return {'t':t,'mode':s.wram[0x118],'headerMode':word(s.wram,0x148),'phase':s.wram[0x1061],'globals':s.wram[0x105e:0x1078].hex(),'camera':[word(s.wram,0x39),word(s.wram,0x3b)],'actors':[{'slot':j,'x':word(s.gsu,0x10e2+j*4),'y':word(s.gsu,0x1182+j*4),'hp':s.gsu[0x1900+j*4],'wild':s.gsu[0x1976+j*4:0x197a+j*4].hex(),'anim':word(s.gsu,0x1402+j*4)}for j in slots(s)]}
with Emulator(work/'vendor/Mesen.app/Contents/MacOS/Mesen',rom,out/'worker',role='probe')as core:
 s=host_stage1(core);writes=[W(0x218,0,2),W(0x21a,stage,2),W(0x38e,0,2),W(0x38c,1,2),W(0x118,0xf)]
 writes +=[W(0x17e00+i,v)for i,v in enumerate([room,x,y,0])];s=core.step(60,writes=writes)
 for t in range(0,900,30):
  if t%150==0:print(row(s,t),flush=True);s.image().save(out/f'probe-{t}.png')
  s=core.step(30,writes=[G(0x1d6,0x200)])
 print('READY',row(s,900),flush=True)

 if a.probe:sys.exit(0)
 clips={};evidence=[]
 def capture(name,count,writes,death=False):
  global s
  clip=[];anchor=None;last=None;seen={};folder=out/name;folder.mkdir(exist_ok=True)
  s=core.step(2,writes=writes) # settle native queued OAM after private fixture
  for tick in range(count):
   keep=[G(0x1d6,0x200)]
   s=core.step(1,writes=keep)
   ids=slots(s);j=ids[0]if ids else last
   if j is None:continue
   last=j;x=word(s.gsu,0x10e2+j*4)-word(s.wram,0x39);y=word(s.gsu,0x1182+j*4)-word(s.wram,0x3b)
   if anchor is None:anchor=(x,y)
   body=Image.new('RGBA',(256,224));base=int(s.state['ppu.oamBaseAddress'])*2;off=int(s.state['ppu.oamAddressOffset'])*2
   for obj in reversed(list(objects(s.oam,int(s.state['ppu.oamMode'])))):
    if not 0<=obj.y<224:continue
    bossArt=obj.palette in ([6,7]if a.boss=='raphael'else[6,7])and (0x1c0 if a.boss=='raphael'else 0x100)<=obj.tile<=0x1ff
    nativeFx=a.boss=='tap-tap'and death and ((obj.palette==3 and obj.tile in [0xe3,0xe5,0xe7])or(obj.palette==1 and obj.tile in[0x140,0x142]))
    if not(bossArt or nativeFx):continue
    # Native object storage has 8-bit y wrap. Recover nearest to actor for art.
    oy=obj.y
    if abs(obj.x-x)>100 or abs(oy-y)>140:continue
    im=object_image(obj,s.vram,s.cgram,base,off)
    if a.boss=='tap-tap'and death and bossArt:
     # Native lava foreground at screen184 occludes the submerged body.
     im=im.crop((0,0,im.width,max(0,min(im.height,184-oy))))
    if im.height:body.alpha_composite(im,(obj.x,oy))
   # The final Raphael star/constellation is Mode7 BG art, not OBJ.
   # Native OBJ palette0 during phase17+ is masked by PPU and must not leak.
   if a.boss=='raphael'and death and s.wram[0x1061]>=17:
    body=Image.new('RGBA',(256,224));aa,bb,cc,dd=[int(s.state[f'ppu.mode7.matrix[{i}]'])for i in range(4)];cx=int(s.state['ppu.mode7.centerX']);cy=int(s.state['ppu.mode7.centerY']);hs=int(s.state['ppu.mode7.hscroll']);vs=int(s.state['ppu.mode7.vscroll'])
    for yy in range(140,224):
     for xx in range(30,120):
      tx=((aa*(xx+hs-cx)+bb*(yy+vs-cy))//256+cx)%1024;ty=((cc*(xx+hs-cx)+dd*(yy+vs-cy))//256+cy)%1024;tile=s.vram[((ty//8)*128+tx//8)*2];ci=s.vram[(tile*64+(ty%8)*8+tx%8)*2+1]
      if ci in [62,63]:
       pv=word(s.cgram,ci*2);body.putpixel((xx,yy),tuple(((pv>>sh)&31)*255//31 for sh in [0,5,10])+(255,))
   bbox=body.getbbox();r=row(s,tick);r['bbox']=bbox;r['snapshotSha256']=hashlib.sha256(s.bgra+s.wram+s.gsu+s.vram+s.oam+s.cgram).hexdigest()
   if tick==0 or tick%40==0:
    (folder/f'raw-{tick}.bin').write_bytes(s.bgra+s.wram+s.gsu+s.vram+s.oam+s.cgram);(folder/f'state-{tick}.txt').write_text(repr(s.state))
   if bbox:
    img=body.crop(bbox);digest=hashlib.sha256(img.tobytes()+str(img.size).encode()).hexdigest();file=seen.get(digest)
    if file is None:file=f'{name}/frame-{len(seen):04}.png';seen[digest]=file;img.save(out/file)
    ax,ay=anchor if death else(x,y);frame={'file':file,'duration':.02,'nativeFrames':1,'dx':bbox[0]-ax,'dy':bbox[1]-ay,'phase':r['phase'],'hp':s.gsu[0x1900+j*4],'nativePosition':[x,y]}
    if clip and all(clip[-1].get(k)==frame.get(k)for k in ['file','dx','dy','phase','hp']):clip[-1]['duration']+=.02;clip[-1]['nativeFrames']+=1
    else:clip.append(frame)
   else:clip.append({'file':None,'duration':.02,'nativeFrames':1,'phase':r['phase']})
   evidence.append({'clip':name,**r})
   if tick%100==0:print(name,tick,r['phase'],bbox,flush=True);s.image().save(folder/f'view-{tick}.png')
  clips[name]={'frames':clip,'duration':count/50,'stimulus':writes,'offsetReference':'initial fixed screen actor feet'if death else'current actor feet'}
  (out/'clips.json').write_text(json.dumps({'boss':a.boss,'fps':50,'romSha256':hashlib.sha256(rom.read_bytes()).hexdigest(),'clips':clips},indent=2))
  (out/'evidence.json').write_text(json.dumps(evidence,indent=2))
 j=slots(s)[0];o=j*4
 if a.boss=='raphael':
  # Source B2FA exact post-stake collision globals, EU relocated +2.
  # Freeze angle top of moon (80h) for repeatable local hurt sprite pose.
  base=[W(0x105e,0x42),W(0x105f,0x80),W(0x1060,0x80),W(0x1066,255),W(0x1067,255),W(0x1017,0xffff,2),G(0x1402+o,0)]
  capture('idle-0',80,base+[W(0x1061,6),W(0x1062,0xff)])
  for n,hp in [(1,7),(2,3)]:
   capture(f'hurt-{n}',100,base+[G(0x1900+o,hp,1),W(0x1061,11),W(0x106e,8),W(0x1067,0xa0),W(0x1062,0),W(0x1063,0x18)])
  capture('dead',1000,base+[G(0x1900+o,1,1),W(0x1061,13),W(0x1062,0xa0),W(0x1063,0xa0)],True)
 else:
  # Source A1B8 exact native egg knockback entry and initial state scratch.
  base=[W(0x1017,0xffff,2),G(0x10e2+o,1216),G(0x1182+o,1896),G(0x1220+o,0),G(0x1222+o,0),G(0x1976+o,0),G(0x1402+o,0)]
  capture('idle-0',60,base+[W(0x1061,5)])
  capture('hurt-1',140,base+[W(0x1061,11),G(0x1220+o,0x300),G(0x1222+o,0xfd00)])
  # Native lava contact marker7862==18 runs source9C72 (sound7A,
  # lava splash setup,A4CA) then enters death0E. Original boss has no HP.
  capture('dead',1200,base+[G(0x1182+o,0x7c0),G(0x1862+o,0x18,1)],True)


# Native environment cutouts required by the original death scenes.
def build_contexts(root):
 import ast,struct
 def load(p):
  r=p.read_bytes();h=(len(r)-0x20000-0x8000-65536-544-512)//1024;at=h*1024+0x20000+0x8000
  return r[at:at+65536],r[-512:],ast.literal_eval(p.with_name(p.name.replace('raw-','state-').replace('.bin','.txt')).read_text())
 def pal(c,i):
  v=word(c,i*2);return tuple(((v>>sh)&31)*255//31 for sh in(0,5,10))+(255,)
 p=root/'raphael/idle-0/raw-40.bin'
 if p.exists():
  v,c,st=load(p);im=Image.new('RGBA',(120,120))
  for y in range(180,300):
   for x in range(200,320):
    t=v[((y//8)*128+x//8)*2];i=v[(t*64+(y%8)*8+x%8)*2+1]
    if 1<=i<=10 or 33<=i<=59:im.putpixel((x-200,y-180),pal(c,i))
  seen=set();parts=[]
  for y in range(120):
   for x in range(120):
    if(x,y)in seen or not im.getpixel((x,y))[3]:continue
    q=[(x,y)];seen.add((x,y));part=[]
    while q:
     a,b=q.pop();part.append((a,b))
     for cc,d in[(a-1,b),(a+1,b),(a,b-1),(a,b+1)]:
      if 0<=cc<120 and 0<=d<120 and(cc,d)not in seen and im.getpixel((cc,d))[3]:seen.add((cc,d));q.append((cc,d))
    parts.append(part)
  keep=set(max(parts,key=len))
  for y in range(120):
   for x in range(120):
    if(x,y)not in keep:im.putpixel((x,y),(0,0,0,0))
  im.save(root/'raphael/moon-native.png')
 p=root/'tap-tap/dead/raw-480.bin'
 if p.exists():
  v,c,st=load(p);im=Image.new('RGBA',(192,48));base=int(st['ppu.layers[0].chrAddress'])*2;tm=int(st['ppu.layers[0].tilemapAddress'])*2;hs=int(st['ppu.layers[0].hscroll']);vs=int(st['ppu.layers[0].vscroll'])
  for y in range(126,174):
   for x in range(64,256):
    bx=(x+hs)%512;by=(y+vs)%256;tx,ty=bx//8,by//8;addr=(tm+(tx//32)*0x800+((ty%32)*32+tx%32)*2)&65535;d=word(v,addr);px=bx%8;py=by%8
    if d&0x4000:px=7-px
    if d&0x8000:py=7-py
    aa=(base+(d&1023)*32+py*2)&65535;bit=7-px;i=sum(((v[(aa+off)&65535]>>bit)&1)<<n for n,off in enumerate((0,1,16,17)))
    if i:im.putpixel((x-64,y-126),pal(c,((d>>10)&7)*16+i))
  im.save(root/'tap-tap/lava-native-strip.png')
build_contexts(work/'native-boss-sequences')

# Canonical replay contract and full capture provenance.
import json,copy,hashlib
from pathlib import Path
root=work/'native-boss-sequences'
for boss in ['raphael','tap-tap']:
 p=root/boss
 if not(p/'clips.json').exists():continue
 data=json.loads((p/'clips.json').read_text());ev=json.loads((p/'evidence.json').read_text());clips={};empty=p/'transparent.png'
 from PIL import Image
 Image.new('RGBA',(1,1)).save(empty)
 def selected(name,start=0,end=None,death=False):
  fs=data['clips'][name]['frames'];rows=[r for r in ev if r['clip']==name];end=len(rows)if end is None else end
  target=rows[start];actor=target['actors'][0];ax=actor['x']-target['camera'][0];ay=actor['y']-target['camera'][1];bb=next(r['bbox']for r in rows[start:]if r['bbox']);footShift=((bb[0]+bb[2])/2-ax,bb[3]-ay)
  original=rows[0];oa=original['actors'][0];ox=oa['x']-original['camera'][0];oy=oa['y']-original['camera'][1];rebase=(ax-ox,ay-oy)if death else(0,0)
  result=[];at=0
  for frame in fs:
   n=frame.get('nativeFrames',round(frame['duration']*50));l=max(at,start);r=min(at+n,end);at+=n
   if l>=r:continue
   f={'file':frame.get('file')or'transparent.png','duration':(r-l)/50,'dx':frame.get('dx',0)-footShift[0]-rebase[0],'dy':frame.get('dy',0)-footShift[1]-rebase[1]};result.append(f)
  return result
 idle=selected('idle-0',2,80 if boss=='raphael'else 60)
 if boss=='raphael':
  h1=selected('hurt-1',0,60);h2=selected('hurt-2',0,60);idle1=selected('hurt-1',75,100);idle2=selected('hurt-2',75,100)
  for n in range(6):clips[f'idle-{n}']=copy.deepcopy(idle if n==0 else idle1 if n<=2 else idle2)
  for n in range(1,6):clips[f'hurt-{n}']=copy.deepcopy(h1 if n<=3 else h2)
  clips['dead']=selected('dead',0,781,True)
  limitations=['Original native fight has three stakes/hits (HP mask7→3→1), not six. Six crossover damage levels alias the two actual native stake injuries and associated palette levels; no extra invented injury frames.','Moon orbit AI and camera are not emulated by these RGBA clips. Native death screen travel/rotation/scale is preserved; optional native moon texture provides original environmental context.','Final star and constellation are decoded from native Mode7 matrix projection and BG palette indices62/63. OBJ palette0 is PPU-masked at that point and deliberately omitted. Final sprite slot disappears at native frame781 (15.62 seconds).','Hurt replay enters verified original post-stake state with private WRAM writes; it does not replay a whole player-controlled stake collision.']
  context={'moon':{'file':'moon-native.png','source':'Mode7 VRAM map/pixels from idle-0/raw-40.bin; source palette indices1..10 and33..59 connected moon/stake component, index0 transparent; no screenshot color key','nativeTextureBounds':[200,180,320,300]}}
 else:
  h=selected('hurt-1',0,124)
  for n in range(6):clips[f'idle-{n}']=copy.deepcopy(idle)
  for n in range(1,6):clips[f'hurt-{n}']=copy.deepcopy(h)
  rows=[r for r in ev if r['clip']=='dead'];start=next(r['t']for r in rows if r['actors']and r['actors'][0]['y']>=0x7c0 and r['phase']==14);clips['dead']=selected('dead',start,891,True)
  limitations=['Original TapTap is invulnerable and has no HP. All five crossover damage reactions deliberately reuse his authentic egg knockback clip; six-hit HP is a crossover adaptation.','Defeat reproduces his real lava sequence0E sinking→0F mouth/rise→10 submerge→11 despawn, not an invented generic HP death.','Original lava foreground masks body at native screen184; original native droplets and splashes are retained from OBJ palettes1/3. The lava strip can be tiled below it in the crossover.','Private contact fixture initially clamps against intact native stage floor. Canonical death begins at actual lava surface y7C0, removes that fixture delay, and ends at original despawn frame891.','This is a graphics replay, not the original destructible-block arena or donor boss AI.']
  context={'lava':{'file':'lava-native-strip.png','source':'Native BG1 tilemap,4bpp VRAM tiles,CGRAM from dead/raw-480.bin; source texture crop64,126..256,174','surfaceNativeY':184,'canonicalStartNativeFrame':start}}
 provenance={'romSha256':data['romSha256'],'nativeRate':50,'source':'Yoshi Island Europe, private Mesen native sprite and VRAM captures','captureScript':'scripts/capture-raphael-taptap-sequences.py','sourceDisassembly':{'path':'../yoshi-source/disassembly/bank0F.asm','sha256':hashlib.sha256((root.parent/'yoshi-source/disassembly/bank0F.asm').read_bytes()).hexdigest(),'addresses':['0FAD27','0FB2AC','0FB5D4','0FB6C9-0FB8DB']if boss=='raphael'else['0F9C58','0FA1B8','0FA383-0FA5CD']},'nativeRoom':0xcb if boss=='raphael'else 0xcc,'EUWRAMRelocation':'USA boss globals+2; verified on exact ROM opcodes','stimuli':{name:d['stimulus']for name,d in data['clips'].items()},'pixelExtraction':'Original generated4bpp OBJ tiles with exact CGRAM; transparent native color0; inactive OAM y>=224 omitted; no perframe rescaling. Each clip applies one constant first visible-foot correction. Death offsets remain relative a fixed encounter anchor.','context':context,'limitations':limitations}
 (p/'sequences.json').write_text(json.dumps({'boss':boss,'clips':clips,'defeatCue':3.14 if boss=='raphael'else 0,'context':([{'file':'moon-native.png','dx':-97.5,'dy':-29,'layer':'behind','clips':['dead']}]if boss=='raphael'else[{'file':'lava-native-strip.png','dx':-124.5,'dy':-14,'layer':'front','clips':['dead']}]),'provenance':provenance},indent=2)+'\n')
 print(boss,{n:round(sum(f['duration']for f in fs),2)for n,fs in clips.items()},'size',sum((p/f['file']).stat().st_size for fs in clips.values()for f in fs))
