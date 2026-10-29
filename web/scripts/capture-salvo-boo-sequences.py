#!/usr/bin/env python3
"""Private EU Mesen source-seeded post-hit capture. No user save/ROM edits.
USA source boss globals 105C..10BC have +2 byte EU WRAM displacement.
Sprite tables have identical offsets. Native CPU/GSU executes between stimuli.
"""
import argparse,ast,hashlib,json,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--boss',choices=['salvo','bigger-boo'],required=True);p.add_argument('--extract-only',action='store_true');a=p.parse_args()
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT.parent;OUT=WORK/'native-boss-sequences'/a.boss;OUT.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(WORK/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import host_stage1
u=lambda b,i:int.from_bytes(b[i:i+2],'little')
SID=0x2d if a.boss=='salvo' else 0x16
records=[];clips=[]
def save(s,clip,tick):
 n=len(records);raw=s.bgra+s.wram+s.gsu+s.vram+s.oam+s.cgram
 (OUT/f'raw-{n}.bin').write_bytes(raw);(OUT/f'state-{n}.txt').write_text(repr(s.state))
 slots=[j for j in range(24) if u(s.gsu,0x1360+j*4)==SID];j=slots[0] if slots else 23
 row={'capture':n,'clip':clip,'tick':tick,'nativeFrameDuration':2,'slot':j,'active':u(s.gsu,0xf00+4*j),'phase':s.gsu[0x19d6+j*4],'scale':u(s.gsu,0x1a36+j*4),'targetScale':u(s.gsu,0x1976+j*4),'mass':u(s.wram,0x107a),'nativeWorldPosition':[u(s.gsu,0x10e2+j*4),u(s.gsu,0x1182+j*4)],'camera':[u(s.wram,0x39),u(s.wram,0x3b)],'rawSha256':hashlib.sha256(raw).hexdigest()};records.append(row)
 if tick%50==0:s.image().save(OUT/f'view-{n}.png');print(row,flush=True)
 return row
if not a.extract_only:
 with Emulator(WORK/'vendor/Mesen.app/Contents/MacOS/Mesen',ROOT/'public/rom/yoshi-eu.sfc',OUT/'worker',role='probe') as core:
  s=host_stage1(core);room,stage,x,y=(0x70,7,0x21,0x79) if a.boss=='salvo' else (0x74,15,0xc4,0x76)
  writes=[('snesWorkRam',0x218,0,2),('snesWorkRam',0x21a,stage,2),('snesWorkRam',0x38e,0,2),('snesWorkRam',0x38c,1,2),('snesWorkRam',0x118,0xf,1)]+[('snesWorkRam',0x17e00+i,v,1)for i,v in enumerate([room,x,y,0])]
  s=core.step(60,writes=writes)
  for i in range(210):
   if s.wram[0xd11]:core.step(2,('a',),snapshot=False)
   s=core.step(12,('a',) if i%6==0 else (),writes=[('gsuWorkRam',0x1d6,0x200,2)])
   slots=[j for j in range(24)if u(s.gsu,0xf00+j*4)==0x10 and u(s.gsu,0x1360+j*4)==SID]
   if i>120 and slots and s.gsu[0x19d6+slots[0]*4]<3:break
  if not slots:raise RuntimeError('Native boss not active')
  j=slots[0];print('Mature boss',a.boss,j,i,flush=True)
  def clip(name,length,stimulus,source,hp):
   global s
   entry={'name':name,'hp':hp,'source':source,'writes':stimulus,'start':len(records),'nativeFrames':length,'fps':50};clips.append(entry)
   s=core.step(1,writes=stimulus)
   for t in range(0,length,2):
    save(s,name,t)
    s=core.step(2,writes=[('gsuWorkRam',0x1d6,0x200,2)]+observer)
   entry['end']=len(records)
  observer=[('gsuWorkRam',0x8c,3200,2),('gsuWorkRam',0x90,1920,2),('gsuWorkRam',0xaa,0,2)] if a.boss=='bigger-boo' else []
  if a.boss=='bigger-boo':s=core.step(1,writes=observer+[('gsuWorkRam',0x1182+j*4,1920,2)])
  clip('healthy',30,[],('Original intro completed naturally; Boo observer/boss positioned at Y1920 to retain full native HDMA body'if a.boss=='bigger-boo'else'Original intro completed naturally'),5)
  if a.boss=='bigger-boo':
   # Native post-hit field writes from $04B893..04B8E1. Cumulative targets
   # grow $48 each hit. Final target1E8 drives state2 inflation/explosion.
   for hit,target in enumerate([0xc8,0x110,0x158,0x1a0,0x1e8],1):
    stimulus=[('gsuWorkRam',addr+j*4,0,2)for addr in [0x1220,0x1222,0x1540,0x1542]]+ [('snesWorkRam',0x1068,1,2),('snesWorkRam',0x1060,target-0x30,2),('gsuWorkRam',0x1976+j*4,target,2),('gsuWorkRam',0x19d8+j*4,1,1)]
    stimulus += [('gsuWorkRam',0x1182+j*4,1920,2)]
    if hit==5:stimulus += [('gsuWorkRam',0x1979+j*4,8,1),('gsuWorkRam',0x1402+j*4,2,2),('gsuWorkRam',0x19d6+j*4,2,1),('gsuWorkRam',0x336c,0,2),('gsuWorkRam',0x1a96+j*4,0,2)]
    clip('hurt-'+str(hit)if hit<5 else 'defeat',210 if hit<5 else 430,stimulus,'$04B893..B8E1; target growth +$48; final states $04BAC4 and $04BB6B',5-hit)
  else:
   for hit,mass in enumerate([0xcfff,0x9fff,0x6fff,0x4bff],1):
    # Aggregated16 native hits per displayed mass tier, last clamps4BFF.
    stimulus=[('snesWorkRam',0x107a,mass,2),('snesWorkRam',0x106c,0x20,2),('snesWorkRam',0x1086,1,2),('snesWorkRam',0x1088,2,2),('gsuWorkRam',0x1a98+j*4,2,2)]
    stimulus += [('gsuWorkRam',0x10e2+j*4,560,2)] # capture fixture: keep donor face OAM inside native viewport
    if hit==4:stimulus += [('gsuWorkRam',0x8c,560,2)]
    clip('damage-tier-'+str(hit)if hit<4 else 'defeat',100 if hit<4 else 700,stimulus,'$0688E3 mass -$0300 each hit, clamp4BFF; $06866E death threshold; $068BC6..068D64 native collapse/eyes escape',4-hit)
 (OUT/'records.json').write_text(json.dumps({'romSha256':hashlib.sha256((ROOT/'public/rom/yoshi-eu.sfc').read_bytes()).hexdigest(),'boss':a.boss,'fps':50,'clips':clips,'records':records},indent=2))
# Load decoder function only, removing normalization so native coordinate offsets
# remain available for nonprocedural playback. Shared extractor never modified.
source=(ROOT/'scripts/extract-yoshi-guardians.py').read_text();source=source[source.index('def decode('):source.index('frames=[];groups=')]
source=source.replace(" if config.get('bg'):\n  pixels=body.load()"," if config.get('bg')and not config.get('keepAll'):\n  pixels=body.load()")
source=source.replace("slots=[i for i in range(0,24)if word(g,0xf00+i*4)==0x10 and word(g,0x1360+i*4)==config['id']]","slots=[config['slot']]")
# Vectorize the exact SNES 4bpp/2bpp background decoder; preserve native indices.
bgstart=source.index('  for yy in range(height):\n   for xx in range(-shift,canvas-shift):')
bgend=source.index(' base=int(state',bgstart)
source=source[:bgstart]+"""  import numpy as np
  from PIL import ImageDraw
  yy,xx=np.indices((height,canvas));xx=xx-shift
  hs=np.array(hs);vs=np.array(vs)
  bx=(xx+hs[np.minimum(yy,len(hs)-1)])%(tileSize*32*(2 if dw else 1));by=(yy+vs[np.minimum(yy,len(vs)-1)])%(tileSize*32*(2 if dh else 1))
  tx,ty=bx//tileSize,by//tileSize;addr=(tilemap+(ty//32)*(0x1000 if dw else 0x800)+(tx//32)*0x800+((ty%32)*32+tx%32)*2)&65535
  vv=np.frombuffer(v,dtype=np.uint8).astype(np.int32);desc=vv[addr]|(vv[(addr+1)&65535]<<8);px=bx%tileSize;py=by%tileSize
  px=np.where(desc&0x4000,tileSize-1-px,px);py=np.where(desc&0x8000,tileSize-1-py,py)
  tile=(desc&1023)+px//8+(py//8)*16;address=(chrbase+tile*(bpp*8)+py%8*2)&65535;bit=7-px%8
  index=sum(((vv[(address+off)&65535]>>bit)&1)<<plane for plane,off in enumerate((0,1,16,17)[:bpp]))
  pal=np.array([palette(i)for i in range(256)],dtype=np.uint8);rgba=pal[((desc>>10)&7)*(1<<bpp)+index]
  alpha=(yy<210)&(index!=0)&(xx>=x-200)&(xx<x+200)&(yy>=feet-170)&(yy<feet+config.get('below',16))
  if config.get('booBody'):
   radius=word(g,0x1a36+slot*4)/4+4;alpha &= (np.abs(xx-(x+8))<=radius)&(np.abs(yy-feet)<=radius)
  occupied=alpha.any(axis=1);left=alpha.argmax(axis=1);right=canvas-1-alpha[:,::-1].argmax(axis=1)
  if not shift:alpha[occupied&(right-left>400),:]=False
  if not config.get('keepAll')and alpha.any():
   coords=np.argwhere(alpha);nearest=coords[np.argmin((coords[:,1]-(x+shift))**2+(coords[:,0]-(feet-50))**2)]
   mask=Image.fromarray((alpha*255).astype(np.uint8)).copy();ImageDraw.floodfill(mask,(int(nearest[1]),int(nearest[0])),128);alpha=np.asarray(mask)==128
  rgba[:,:,3]=np.where(alpha,255,0);body=Image.fromarray(rgba)
"""+source[bgend:]
start=source.index(' # Boss sprite positions');source=source[:start]+" return body,{'nativePosition':[x,feet],'sourceBounds':bbox,'nativePhase':g[0x19d6+slot*4]}\n"
from PIL import Image
ns={'Image':Image,'ast':ast,'hashlib':hashlib,'a':type('Args',(),{'work':WORK})()};exec(source,ns)
data=json.loads((OUT/'records.json').read_text());config={'folder':str(OUT),'id':SID,'slot':23,'bg':True,'pal':[0]if a.boss=='salvo'else[1],'tiles':{0x10d,0x10e,0x10f,0x11d,0x11e,0x11f}if a.boss=='salvo'else set(range(0x1c0,0x200)),'below':130,'virtual':True}
anchor=None
for row in data['records']:
 try:
  cfg=config.copy();cfg['booBody']=a.boss=='bigger-boo'

  raw=(OUT/f"raw-{row['capture']}.bin").read_bytes();height=(len(raw)-0x20000-0x8000-0x10000-1056)//1024;g=raw[height*1024+0x20000:height*1024+0x28000]
  explosion=[j for j in range(24)if u(g,0xf00+j*4)and u(g,0x1360+j*4)==0x12e]
  if a.boss=='salvo'and row['phase']==11:
   w=raw[height*1024:height*1024+0x20000]
   if u(w,0x108a):cfg['bg']=False;row['effect']='native escaping eye OBJ'
  if a.boss=='bigger-boo'and row['phase']>=3 and explosion:cfg.update(booBody=False,slot=explosion[0],layer=2,bpp=2,static=True,keepAll=True,tiles=set());row['effect']='native BG3 explosion sprite012E'
  im,ev=ns['decode'](a.boss,cfg,row['capture']);box=im.getbbox()
  if (not row['active'] or (a.boss=='bigger-boo' and row['phase']>=3))and not explosion:im=Image.new('RGBA',(1,1));box=None
  if anchor is None:anchor=[row['nativeWorldPosition'][0],row['nativeWorldPosition'][1]]
  if box:
   crop=im.crop(box);name=f"frame-{row['capture']:04d}.png";crop.save(OUT/name);row.update(file=name,bounds=list(box),offset=[box[0]-256+row['camera'][0]-anchor[0],box[1]+row['camera'][1]-anchor[1]],nativeAnchorOffset=[row['nativeWorldPosition'][0]-anchor[0],row['nativeWorldPosition'][1]-anchor[1]])
  else:row.update(file=None,bounds=None,offset=None)
 except Exception as e:row['extractionError']=str(e)
data.update(anchorWorld=anchor,sourceReferences=['disassembly/bank04.asm $04B884..04BB8A','disassembly/bank06.asm $0687A5..068D64'],limitations=['Source-seeded post-hit fields, not captured successful player projectile input.','Salvo damage tiers aggregate native mass decrements.','Body and original face OBJ retained. Auxiliary explosion/eye ambient sprites require separate decoder when main boss sprite despawns.'])
(OUT/'clips.json').write_text(json.dumps(data,indent=2));print('Wrote',OUT/'clips.json',flush=True)
# Export compact runtime timeline. Native size stages map monotonically onto
# six gameplay HP slots; repeated tiers hold the actual settled donor pose.
transparent=OUT/'transparent.png';Image.new('RGBA',(1,1)).save(transparent)
byname={c['name']:c for c in data['clips']}
def rows(name,settled=False):
 c=byname[name];r=data['records'][c['start']:c['end']]
 if name=='defeat':
  inactive=next((i for i,v in enumerate(r)if not v['active']),None)
  if inactive is not None:r=r[:inactive+1]
 elif settled:r=r[2:14]if a.boss=='salvo'and name=='damage-tier-3'else r[-12:]
 elif a.boss=='bigger-boo'and name.startswith('hurt-'):
  done=next((i for i,v in enumerate(r)if v['scale']==v['targetScale']),None)
  if done is not None:r=r[:min(len(r),done+7)]
 if a.boss=='salvo'and not settled and name!='healthy':r=r[2:] # donor framebuffer/HDMA pipeline settles after fixture coordinate write
 return r
export={}
def emit(key,name,settled=False):
 rr=rows(name,settled);anchor=rr[0]['nativeWorldPosition'];ff=[]
 for r in rr:
  box=r.get('bounds');file=r.get('file') or 'transparent.png'
  if box and r.get('file'):dx=box[0]-256+r['camera'][0]-anchor[0];dy=box[1]+r['camera'][1]-anchor[1]
  else:dx=dy=0
  actorDx=r['nativeWorldPosition'][0]-anchor[0];actorDy=r['nativeWorldPosition'][1]-anchor[1]
  if settled:dx-=actorDx;dy-=actorDy;actorDx=actorDy=0
  f={'file':file,'duration':r['nativeFrameDuration']/50,'dx':dx,'dy':dy,'actorDx':actorDx,'actorDy':actorDy,'nativePhase':r['phase'],'nativeCapture':r['capture'],'scale':r['scale'],'targetScale':r['targetScale'],'mass':r['mass']}
  # Coalesce only byte-identical RGBA + offsets/actor motion. Durations remain
  # the exact captured EU native-frame sum.
  signature=(hashlib.sha256((OUT/file).read_bytes()).hexdigest(),dx,dy,f['actorDx'],f['actorDy'])
  if ff and signature==ff[-1].get('_signature'):ff[-1]['duration']=round(ff[-1]['duration']+f['duration'],6)
  else:f['_signature']=signature;ff.append(f)
 for f in ff:f.pop('_signature',None)
 export[key]={'frames':ff,'sourceClip':name,'settledPoseHold':settled,'nativeFrames':sum(v['nativeFrameDuration']for v in rr),'duration':sum(v['nativeFrameDuration']for v in rr)/50,'nativeAnchorWorld':anchor,'endActorOffset':[ff[-1]['actorDx'],ff[-1]['actorDy']]}
if a.boss=='bigger-boo':
 tiers=['healthy','hurt-1','hurt-2','hurt-2','hurt-3','hurt-4']
 transitions=[('hurt-1',False),('hurt-2',False),('hurt-2',True),('hurt-3',False),('hurt-4',False)]
else:
 tiers=['healthy','damage-tier-1','damage-tier-1','damage-tier-2','damage-tier-2','damage-tier-3']
 transitions=[('damage-tier-1',False),('damage-tier-1',True),('damage-tier-2',False),('damage-tier-2',True),('damage-tier-3',False)]
for i,n in enumerate(tiers):emit(f'idle-{i}',n,True)
for i,(n,settled)in enumerate(transitions,1):emit(f'hurt-{i}',n,settled)
emit('dead','defeat')
limitations=['Source-seeded native post-hit state fields, not successful player projectile input. No ROM modification or user saves.','Native EU 50fps donor render with per-frame palette, HDMA, original body deformation, original face OBJ; native offsets retained.','Six gameplay damage slots monotonically map onto native permanent size/mass tiers; repeated tier uses settled native pose hold.']
if a.boss=='salvo':limitations += ['Salvo sprite X is seeded560 at each tier fixture to keep original face OAM on-screen; subsequent native hurt/death movement preserved. Salvo source original native mass can lose $0300 repeatedly during one projectile collision; displayed tiers aggregate 16 such decrements.','First four native frames after Salvo fixture writes are excluded so PPU OAM and BG2 pipeline settle after coordinate/mass seeding; retained frames are actual native render states. Original global room-color/window defeat flash (sprite0013) is a scene composition effect and is omitted from isolated boss RGBA. Main-body collapse and original escaping eye OBJ are included; transparent wait preserved until native main actor despawns.']
else:limitations += ['Native sprite012E BG3 explosion star included. Final maximum-size Boo fills original 239-line native viewport; native GSU logical viewport is210 rows ($08E317), so out-of-view top/bottom pixels are clipped exactly at that boundary.','Native translucent Boo colors captured directly from donor CGRAM, not recolored; original world backdrop color math is not baked into RGBA.']
result={'boss':a.boss,'fps':50,'romSha256':data['romSha256'],'clips':export,'provenance':{'captureScript':'scripts/capture-salvo-boo-sequences.py','records':'records.json','decodedRecords':'clips.json','sourceReferences':data['sourceReferences'],'limitations':limitations}}
deathPhase=10 if a.boss=='salvo' else 3
deathStart=byname['defeat']['start'];cue=next(r for r in data['records'][deathStart:]if r['phase']==deathPhase)
result['defeatCue']=max(0,(cue['tick']-(4 if a.boss=='salvo'else 0))/50)
result['defeatCueEvent']='Native collapse state10 starts'if a.boss=='salvo'else'Native inflation ends; BG3 burst state3 starts'
result['provenance']['sourceFilesSha256']={name:hashlib.sha256((WORK/'yoshi-source/disassembly'/name).read_bytes()).hexdigest()for name in ['bank04.asm','bank06.asm','bank08.asm','vars/sprite_table_vars.asm']}
(OUT/'timeline.json').write_text(json.dumps(result,indent=2)+'\n');(OUT/'sequences.json').write_text(json.dumps(result,indent=2)+'\n');print('Runtime timeline',OUT/'timeline.json',flush=True)
