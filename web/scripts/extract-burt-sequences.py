#!/usr/bin/env python3
"""Pack complete original Burt poses from private isolated native render views.
Original unmodified simulation snapshots supply world motion and timing. The
independent virtual views recover pixels that the donor viewport originally
clipped; their actor/terrain/camera fixture positions NEVER become runtime motion.
Run capture-burt-poses.py, capture-burt-damage-motion.py and the documented
capture-burt-virtual-camera.py / export-burt-native-rgba.py passes first.
"""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image,ImageDraw
p=argparse.ArgumentParser();p.add_argument('--work',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
main=a.work/'burt-virtual-camera/rgba';motion=a.work/'burt-virtual-camera/motion/rgba'
banks={name:json.loads((folder/'records.json').read_text())for name,folder in [('main',main),('motion',motion)]}
rows={name:{r['capture']:r for r in bank['records']}for name,bank in banks.items()}
original={r['capture']:r for r in json.loads((a.work/'burt-full-native-4/captures.json').read_text())}
original_motion=json.loads((a.work/'burt-damage-motion/captures.json').read_text());clips={};evidence={}
def frame(n,bank='main',origin=None):
 record=rows[bank][n];folder=main if bank=='main'else motion;path=folder/record['file'];im=Image.open(path)
 if im.mode!='RGBA':raise ValueError(f'RGBA required: {path}')
 bounds=record['bounds'];anchor=record['nativeBodyAnchor'];world=record['sourceWorldFeet'];dx=world[0]-origin[0]if origin else 0;dy=world[1]-origin[1]if origin else 0
 expected=original[n]if bank=='main'else next(r for r in original_motion if r['capture']==n)
 if world!=[expected['x'],expected['y']]:raise ValueError(f'Fixture trajectory leaked into source{bank}{n}')
 name=f'{bank}-{n}.png';(a.out/name).write_bytes(path.read_bytes())
 evidence[(bank,n)]={**record,'sourceCaptureDirectory':Path(record.get('sourceCaptureDirectory','')).name,'captureBank':bank,'rgbaSha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 return {'file':name,'duration':6/50,'dx':bounds[0]-anchor[0]+dx,'dy':bounds[1]-anchor[1]+dy,'actorDx':dx,'actorDy':dy}
for stage,n in enumerate([163,224,267,310,353,396]):clips[f'idle-{stage}']=[frame(n)]
for stage,(start,end)in enumerate(zip([182,225,268,311,354,397],[224,267,310,353,396,476]),1):
 prehit=original[start-1];origin=[prehit['x'],prehit['y']]
 clips['dead'if stage==6 else f'hurt-{stage}']=[frame(n,origin=origin)for n in range(start,end)]
for stage,index in enumerate([10,8,6,4,2,0]):
 tier=[r for r in original_motion if r['index']==index and 40<r['x']<215]
 for pose in ['windup','rise','fall','land']:
  candidates=[r for r in tier if (r['phase']==0x1a if pose in ['windup','land']else(r['vy']>=32768 if pose=='rise'else r['vy']<32768)and r['phase']in[0x1c,0x1e])]
  if not candidates:raise ValueError(f'Missing original {pose} tier{stage}')
  clips[f'{pose}-{stage}']=[frame(r['capture'],'motion')for r in candidates[:4]]
result={'id':'burt','fps':50,'defeatCue':5.16,'clips':clips,'provenance':{'romSha256':'91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90','source':'Original native Burt body/OBJ graphics with complete virtual native PPU views; original unmodified simulation world positions remain authoritative','nativeSampleFrames':6,'records':list(evidence.values()),'nativeRenderFixtures':{name:bank.get('provenance',{})for name,bank in banks.items()},'scripts':['scripts/capture-burt-poses.py','scripts/capture-burt-damage-motion.py','scripts/capture-burt-virtual-camera.py','scripts/export-burt-native-rgba.py','scripts/extract-burt-sequences.py'],'adaptation':'Six native post-collision injury stimuli. Runtime movement/contact stays DKC adaptation; no fixture actor position or native clear flag exported. Native imagery sampled every six EU frames. Full original viewport-clipped deformations are recovered with registered native exposures, not stretched/redrawn from a replacement image.'}}
(a.out/'sequences.json').write_text(json.dumps(result,indent=2)+'\n')
sheet=Image.new('RGBA',(6*192,2*224),(28,45,48,255));draw=ImageDraw.Draw(sheet)
for i,n in enumerate([163,224,267,310,353,396,397,430,440,450,460,474]):
 r=rows['main'][n];im=Image.open(main/r['file']);x=i%6*192;y=i//6*224;sheet.alpha_composite(im,(round(x+96+r['bounds'][0]-r['nativeBodyAnchor'][0]),round(y+208+r['bounds'][1]-r['nativeBodyAnchor'][1])));draw.text((x+6,y+3),f'Tier{i}'if i<6 else f'Native{n}',fill='white')
sheet.save(a.out/'contact-sheet-complete.png');print('Burt complete',len(evidence),'native poses; injuries5.04s, death9.48s')
