#!/usr/bin/env python3
"""Keep original Raphael pixels; undo the captured moon angle in Canvas metadata.
The EU idle raw capture at native frame0 records rotation1060=E6 (-26/256
turn), GSU angles run opposite Canvas. No PNG pixels are edited or regenerated.
"""
import argparse,copy,json,math
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=Path('public/art/guardian-sequences'));a=p.parse_args();out=a.output
path=out/'raphael.json'
if not path.exists():raise SystemExit(0)
m=json.loads(path.read_text());clip=copy.deepcopy(m['clips']['idle-0']);clip.pop('orientation',None)
f=clip['frames'][0];im=Image.open(out/'raphael.png').convert('RGBA');alpha=im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])).getchannel('A')
radians=-26*math.tau/256;c,s=math.cos(radians),math.sin(radians);points=[]
for y in range(f['h']):
 for x in range(f['w']):
  if alpha.getpixel((x,y)):
   for ox,oy in [(0,0),(1,0),(0,1),(1,1)]:
    px,py=x+ox+f['dx'],y+oy+f['dy'];points.append((px*c-py*s,px*s+py*c))
left,right=min(x for x,y in points),max(x for x,y in points);top,bottom=min(y for x,y in points),max(y for x,y in points)
clip['orientation']={'radians':radians,'dx':-(left+right)/2,'dy':-bottom}
for tier in range(6):m['clips'][f'idle-{tier}']=copy.deepcopy(clip)
m['provenance']['uprightIdle']={'sourceRotationEU1060':230,'canvasRotationRadians':radians,'method':'Original native idle pixels, Canvas orientation correction only; foot anchor from transformed alpha bounds. Injury and defeat sequences unchanged.'}
path.write_text(json.dumps(m,separators=(',',':'))+'\n')
box={'dx':-(right-left)/2,'dy':top-bottom,'w':right-left,'h':bottom-top};boxes=json.loads((out/'body-boxes.json').read_text());boxes['raphael']={str(t):box.copy() for t in range(6)};(out/'body-boxes.json').write_text(json.dumps(boxes,indent=2)+'\n')
runtime=out.resolve().parents[2]/'src/generated/guardian-runtime.json';data=json.loads(runtime.read_text());data['bodyBoxes']=boxes;runtime.write_text(json.dumps(data,indent=2)+'\n')
print('Raphael upright bounds',box)
