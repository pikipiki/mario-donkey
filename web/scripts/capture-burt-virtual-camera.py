#!/usr/bin/env python3
"""Re-render existing native Burt captures with a private virtual BG2 viewport.
The original simulation trajectory is authoritative. Each source snapshot is
restored independently before one native render step, so modified GSU collision
scratch cannot propagate into its movement. ROM file/player SRAM unchanged.
"""
import argparse,sys,ast,json,hashlib,struct
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--work',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--frames',default='450');p.add_argument('--anchor-y',type=int,default=192);p.add_argument('--source',type=Path);p.add_argument('--matte','--isolate',dest='matte',action='store_true',help='Isolate original native BG2 with a guarded unused backdrop; required for RGBA export');p.add_argument('--export-only',action='store_true');a=p.parse_args();work=a.work.resolve();out=a.out.resolve();out.mkdir(parents=True,exist_ok=True);sys.path.insert(0,str(work/'project'))
from bridge.emulator import Emulator
from bridge.bootstrap import host_stage1
source=(a.source or work/'burt-full-native-4').resolve();rom=Path(__file__).resolve().parents[1]/'public/rom/yoshi-eu.sfc';rows=json.loads((out/'captures.json').read_text())if(out/'captures.json').exists()else[];rows={r['capture']:r for r in rows if 'sourceRawSha256'in r}
expected='91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90'
original=rom.read_bytes();assert hashlib.sha256(original).hexdigest()==expected,'Unsupported Yoshi ROM revision'
for addr,before in[(0x3279f,bytes.fromhex('bd8076')),(0x327a5,bytes.fromhex('bd8276'))]:assert original[addr:addr+3]==before,f'Unexpected render opcode at{addr:x}'
nums=[]
for q in a.frames.split(','):
 if '-'in q:lo,hi=map(int,q.split('-'));nums.extend(range(lo,hi+1))
 else:nums.append(int(q))
word=lambda b,i:b[i]|b[i+1]<<8
if not a.export_only:
 with Emulator(work/'vendor/Mesen.app/Contents/MacOS/Mesen',rom,out/'worker',role='probe')as core:
  host_stage1(core)
  scene=[('snesWorkRam',0x218,0,2),('snesWorkRam',0x21a,3,2),('snesWorkRam',0x38e,0,2),('snesWorkRam',0x38c,1,2),('snesWorkRam',0x118,15,1)]
  scene.extend(('snesWorkRam',0x17e00+i,v,1)for i,v in enumerate([0x3d,5,0x63,0]));core.step(240,writes=scene)
  # Execute native growth/init so hardware CGRAM HDMA channels1/2 are mature.
  # RAM snapshots alone do not restore hardware DMA configuration.
  core.step(1100,writes=[('gsuWorkRam',0x1d6,0xffff,2)])
  patch=[]
  for addr,bs in[(0x3279f,bytes.fromhex('a98000')),(0x327a5,bytes([0xa9,a.anchor_y&255,a.anchor_y>>8]))]:patch.extend(('snesPrgRom',addr+i,v,1)for i,v in enumerate(bs))
  s=core.step(1,writes=patch)
  for number in nums:
   anchorY=(192 if number>=440 else 216)if a.anchor_y==0 else a.anchor_y
   raw=(source/f'raw-{number}.bin').read_bytes();h=(len(raw)-0x20000-0x8000-65536-544-512)//1024;at=h*1024;data={}
   for name,size in [('snesWorkRam',0x20000),('gsuWorkRam',0x8000),('snesVideoRam',65536),('snesSpriteRam',544),('snesCgRam',512)]:data[name]=raw[at:at+size];at+=size
   g=data['gsuWorkRam'];w=data['snesWorkRam'];slot=next(i for i in range(24)if word(g,0x1360+i*4)==0x46 and g[0xf00+i*4]);j=slot*4
   current={'snesWorkRam':s.wram,'gsuWorkRam':s.gsu,'snesVideoRam':s.vram,'snesSpriteRam':s.oam,'snesCgRam':s.cgram}
   writes=[(name,i,word(b,i),2)for name,b in data.items()for i in range(0,len(b),2)if b[i:i+2]!=current[name][i:i+2]]
   # Isolated graphics-only pose transposition: native OBJ renderer must see
   # the face inside its viewport, otherwise it software-culls eye objects.
   # Preserve all original pose/scale state; no fixture motion is exported.
   writes += [('snesPrgRom',0x327a6,anchorY&255,1),('snesPrgRom',0x327a7,anchorY>>8,1)]
   writes += [('gsuWorkRam',0x10e2+j,word(w,0x39)+128,2),('gsuWorkRam',0x1182+j,word(w,0x3b)+anchorY,2),('gsuWorkRam',0x1680+j,128,2),('gsuWorkRam',0x1682+j,anchorY,2),('gsuWorkRam',0xfa2+j,word(g,0xfa2+j)&0xffe0,2),('gsuWorkRam',0x1860+j,0,2),('gsuWorkRam',0x1220+j,0,2),('gsuWorkRam',0x1222+j,0,2),('gsuWorkRam',0x1540+j,0,2),('gsuWorkRam',0x1542+j,0,2)]
   assert not a.matte or all((word(data['snesCgRam'],i)&0x7fff)!=0x7c1f for i in range(2,512,2)),'Reserved backdrop color collides with native art'
   matte=[('snesWorkRam',0x969,2,1),('snesWorkRam',0x96a,0,1),('snesWorkRam',0x96d,0,1),('snesWorkRam',0x96e,0,1),('gsuWorkRam',0x2000,0x7c1f,2)]if a.matte else[]
   core.step(1,writes=writes+matte,timeout=60)
   # Preserve original pose inputs on the second frame while allowing the native
   # first-frame OBJ staging buffer to reach hardware OAM (one-frame latency).
   pose=[('gsuWorkRam',i,word(g,i),2)for i in range(0xf00,0x2000,2)]
   pose += [('snesWorkRam',i,word(w,i),2)for i in range(0x105e,0x1078,2)]
   pose += writes[-10:]
   s=core.step(1,writes=pose+matte,timeout=60)
   (out/f'raw-{number}.bin').write_bytes(s.bgra+s.wram+s.gsu+s.vram+s.oam+s.cgram);(out/f'state-{number}.txt').write_text(repr(s.state));s.image().save(out/f'view-{number}.png')
   row={'capture':number,'nativeBodyAnchor':[128,anchorY],'sourceWorldFeet':[word(g,0x10e2+j),word(g,0x1182+j)],'sourceScreenFeet':[word(g,0x10e2+j)-word(w,0x39),word(g,0x1182+j)-word(w,0x3b)],'sourcePhase':g[0x1a36+j],'sourceHitIndex':g[0x1902+j],'sourceRawSha256':hashlib.sha256(raw).hexdigest(),'renderedPhase':s.gsu[0x1a36+j],'renderedWorldFeet':[word(s.gsu,0x10e2+j),word(s.gsu,0x1182+j)]};row['sourceCaptureDirectory']=str(source);rows[number]=row
   if number%10==0:print(row,flush=True)
  (out/'captures.json').write_text(json.dumps([rows[n]for n in sorted(rows)],indent=2))

# Delegate to the standalone stable exporter; keep this legacy flag compatible.
if a.export_only:
 import importlib.util
 spec=importlib.util.spec_from_file_location('burt_native_rgba_export',Path(__file__).with_name('export-burt-native-rgba.py'))
 module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 module.export_rgba(out,work)
 module.export_rgba(out/'motion',work)
