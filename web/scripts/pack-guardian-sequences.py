#!/usr/bin/env python3
"""Pack trimmed native frames; offsets/timing stay independent of texture packing.
Runs after private captures. Ships no snapshots, ROM data or savestates.
"""
import argparse,hashlib,json,math
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--input',type=Path,default=Path('../native-boss-sequences'));p.add_argument('--output',type=Path,default=Path('public/art/guardian-sequences'));a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True);timings={};endOffsets={};effectCues={};bodyBoxes={}
for folder in sorted(a.input.iterdir()):
 source=folder/'sequences.json'
 if not source.exists():continue
 data=json.loads(source.read_text());clips=data['clips'];unique={};frames={}
 if 'idle-0'not in clips:
  legacy=json.loads((a.output.parent/'yoshi-guardians.json').read_text());group=legacy['groups'][folder.name]['idle'];image=Image.open(a.output.parent/'yoshi-guardians.png');cell=legacy['cell'];cols=legacy['columns'];origin=legacy['origin'];hold=[]
  for i in range(group['start'],group['start']+group['frames']):
   im=image.crop((i%cols*cell,i//cols*cell,i%cols*cell+cell,i//cols*cell+cell));box=im.getbbox();name=f'legacy-movement-{i}.png';im.crop(box).save(folder/name);hold.append({'file':name,'duration':1/group['fps'],'dx':box[0]-origin[0],'dy':box[1]-origin[1]})
  for tier in range(6):clips[f'idle-{tier}']=hold
  data.setdefault('provenance',{})['movementBank']='Existing native extracted yoshi-guardians idle poses; no permanent damage morphology in the outside body'

 for clip in clips.values():
  if isinstance(clip,dict):clip=clip['frames']
  for f in clip:
   name=f.get('file');im=Image.open(folder/name).convert('RGBA')if name else Image.new('RGBA',(1,1));key=hashlib.sha256(im.tobytes()+str(im.size).encode()).hexdigest();unique.setdefault(key,im);frames[name]=key
 for context in data.get('context',[]):
  name=context['file'];im=Image.open(folder/name).convert('RGBA');key=hashlib.sha256(im.tobytes()+str(im.size).encode()).hexdigest();unique.setdefault(key,im);frames[name]=key
 # Shelves with padded edges; nearest sampling does not bleed neighboring cells.
 width=2048;placed={};x=y=row=0
 for key,im in sorted(unique.items(),key=lambda kv:-kv[1].height):
  if im.width+2>width:raise ValueError('Native crop exceeds mobile texture width')
  if x+im.width+2>width:x=0;y+=row;row=0
  placed[key]=(x+1,y+1);x+=im.width+2;row=max(row,im.height+2)
 height=max(1,y+row)
 if height>4096:raise ValueError(f'{folder.name}: split this bank; height{height}>4096')
 atlas=Image.new('RGBA',(width,height))
 for key,im in unique.items():atlas.alpha_composite(im,placed[key])
 outclips={}
 for key,clip in clips.items():
  loop=key.startswith(('idle','windup','rise','fall','land'))
  if isinstance(clip,dict):loop=clip.get('loop',loop);clip=clip['frames']
  rows=[]
  for f in clip:
   im=unique[frames[f.get('file')]];px,py=placed[frames[f.get('file')]]
   rows.append({'x':px,'y':py,'w':im.width,'h':im.height,'dx':f['dx'],'dy':f['dy'],'duration':f['duration']})
  last=clip[-1];endOffsets.setdefault(folder.name,{})[key]=[last.get('actorDx',0),last.get('actorDy',0)]
  outclips[key]={'frames':rows,'duration':round(sum(f['duration']for f in rows),6),'loop':loop,'scale':data.get('clipScales',{}).get(key,1),'opaque':all(unique[frames[f.get('file')]].getextrema()[3][0]==255 for f in clip)}
 scale={'burt':.78,'salvo':.78,'bigger-boo':1,'milde':.78,'froggy':2,'raphael':1,'tap-tap':1.1}[folder.name]
 if folder.name=='bigger-boo':
  bodyBoxes[folder.name]={str(tier):{k:outclips[f'idle-{tier}']['frames'][0][k]*scale for k in ['dx','dy','w','h']}for tier in range(6)}
 contextRows=[]
 for item in data.get('context',[]):
  im=unique[frames[item['file']]];px,py=placed[frames[item['file']]];contextRows.append({'x':px,'y':py,'w':im.width,'h':im.height,'dx':item['dx'],'dy':item['dy'],'layer':item['layer'],'clips':item['clips']})
 presentation=data.get('presentation',{}).copy()
 if folder.name=='raphael':presentation['departureLift']={'start':3.14,'duration':.8,'dy':-60}
 result={'presentation':presentation,'context':contextRows,'id':folder.name,'scale':scale,'clips':outclips,'provenance':{'romSha256':data.get('romSha256',data.get('provenance',{}).get('romSha256')) ,**data.get('provenance',{})},'packing':{'width':width,'height':height,'uniqueFrames':len(unique),'filter':'nearest','sourceOffsetsPreserved':True}}
 atlas.save(a.output/f'{folder.name}.png',optimize=True);(a.output/f'{folder.name}.json').write_text(json.dumps(result,separators=(',',':'))+'\n');timings[folder.name]={k:v['duration']for k,v in outclips.items()};effectCues[folder.name]=data.get('defeatCue',min(.2,max(0,timings[folder.name].get('dead',1)-.5)));print(folder.name,len(unique),'frames',atlas.size,'dead',timings[folder.name].get('dead'))
(a.output/'timings.json').write_text(json.dumps(timings,indent=2)+'\n')

(a.output/'end-offsets.json').write_text(json.dumps(endOffsets,indent=2)+'\n')

(a.output/'effect-cues.json').write_text(json.dumps(effectCues,indent=2)+'\n')

(a.output/'body-boxes.json').write_text(json.dumps(bodyBoxes,indent=2)+'\n')

# Runtime metadata is a source module. Importing files from public/ directly
# produces Vite dev-server warnings; large PNG/clip banks remain lazy assets.
runtime=a.output.resolve().parents[2]/'src/generated/guardian-runtime.json';runtime.parent.mkdir(parents=True,exist_ok=True)
runtime.write_text(json.dumps({'timings':timings,'endOffsets':endOffsets,'effectCues':effectCues,'bodyBoxes':bodyBoxes},indent=2)+'\n')

# Metadata-only upright idle correction; does not alter native PNG pixels.
import subprocess,sys
subprocess.run([sys.executable,str(Path(__file__).with_name('normalize-raphael-idle.py')),'--output',str(a.output)],check=True)
