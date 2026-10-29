#!/usr/bin/env python3
"""Export complete native Burt RGBA from private isolated PPU captures.

No Mesen execution or ROM mutation occurs here. Reuses captured native BG2
coverage, restores native OBJ layers, maps PAL raster coordinates, and registers
upper/lower native exposures without interpolation or invented pixels.

From the web workcopy:
  python scripts/export-burt-native-rgba.py --work .. --captures ../burt-virtual-camera
Outputs rgba/records.json and motion/rgba/records.json under --captures.

Capture directories consumed:
  matte/        295 original native IDs, virtual anchor(128,192)
  upper/matte/   90 source poses with vertical scale>=0x180, anchor(128,384)
  motion/matte/  72 selected motion IDs, anchor(128,192)
"""
import argparse, ast, hashlib, json, sys
from pathlib import Path
expected='91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90'
word=lambda b,i:b[i]|b[i+1]<<8
# EXPORT: Exact native BG2 coverage + native OBJ, no deformation heuristics.
def export_rgba(folder, work):
 sys.path.insert(0,str(Path(work).resolve()/"project"))
 from PIL import Image
 from bridge.snes import objects,object_image
 PART_TILES={0x1c0,0x1c2,0x1e0,0x1e2,0x1c4,0x1c6,0x1e4,0x1e6,0x1c8,0x1e8,0x1cc,0x1ce,0x1ec,0x1ee,0x1ca,0x1ea}
 mattefolder=folder/'matte'
 if not(mattefolder/'captures.json').exists():return
 entries=json.loads((mattefolder/'captures.json').read_text());upper=folder/'upper/matte';outdir=folder/'rgba';outdir.mkdir(exist_ok=True)
 def decode(p,n):
  raw=(p/f'raw-{n}.bin').read_bytes();st=ast.literal_eval((p/f'state-{n}.txt').read_text());h=(len(raw)-0x20000-0x8000-65536-544-512)//1024;at=h*1024;w=raw[at:at+0x20000];at+=0x20000;g=raw[at:at+0x8000];at+=0x8000;v=raw[at:at+65536];at+=65536;o=raw[at:at+544];c=raw[-512:]
  assert word(c,0)==0x7c1f and st['ppu.mainScreenLayers']=='2'and st['ppu.subScreenLayers']=='0'and st['ppu.colorMathEnabled']=='0','Native plane isolation not active'
  assert all((word(c,k)&0x7fff)!=0x7c1f for k in range(2,512,2)),'Backdrop collides with native art'
  raster=Image.frombytes('RGBA',(256,h),raw[:h*1024],'raw','BGRA');body=Image.new('RGBA',(256,h));body.paste(raster.crop((0,15,256,h)),(0,0));pixels=body.load();blankRows={yy for yy in range(h)if all(pixels[xx,yy][:3]==(0,0,0)for xx in range(256))}
  for yy in range(h):
   for xx in range(256):
    # Mesen PAL239 raster has15 leading border lines. The plane is
    # shifted by−15 above to native OAM/BG coordinates before composition.
    if yy in blankRows or yy>=209 or pixels[xx,yy][:3]==(255,0,255):pixels[xx,yy]=(0,0,0,0)
    else:pixels[xx,yy]=pixels[xx,yy][:3]+(255,) # Mesen framebuffer high byte is unused0, not art alpha
  behind=Image.new('RGBA',(256,h));front=behind.copy()
  for ob in reversed(list(objects(o,int(st['ppu.oamMode'])))):
   if ob.tile not in PART_TILES or ob.palette not in[6,7]or not 0<=ob.y<239:continue
   part=object_image(ob,v,c,int(st['ppu.oamBaseAddress'])*2,int(st['ppu.oamAddressOffset'])*2)
   (front if ob.priority==3 else behind).alpha_composite(part,(ob.x,ob.y))
  behind.alpha_composite(body);behind.alpha_composite(front)
  return behind,hashlib.sha256(raw).hexdigest()
 records=[];boundary=[]
 for row in entries:
  n=row['capture'];im,digest=decode(mattefolder,n);originY=0;upperdigest=None
  if(upper/f'raw-{n}.bin').exists():
   high,upperdigest=decode(upper,n);shift=384-row['nativeBodyAnchor'][1];canvas=Image.new('RGBA',(256,239+shift));seam=16
   canvas.alpha_composite(high.crop((0,0,256,seam+shift)),(0,0));canvas.alpha_composite(im.crop((0,seam,256,239)),(0,seam+shift));im=canvas;originY=-shift
  bb=im.getbbox()
  assert bb is not None,f'No native art for{n}'
  file=f'frame-{n}.png';im.crop(bb).save(outdir/file,optimize=True);bounds=[bb[0],bb[1]+originY,bb[2],bb[3]+originY]
  records.append({**row,'file':file,'bounds':bounds,'nativeRenderSha256':digest,'nativeUpperRenderSha256':upperdigest})
  if bb[0]==0 or bb[2]==256 or bb[1]==0 or bb[3]==im.height:boundary.append(n)
 provenance={'romSha256':expected,'source':'Native Yoshi Europe Burt RGBA, isolated original PPU BG2 render plus native4bpp OBJ','captureScript':'scripts/capture-burt-virtual-camera.py','exportScript':'scripts/export-burt-native-rgba.py','inMemoryROMRenderInputs':[{'offset':'0x3279f','before':'BD8076 LDA spritecamX,X','after':'A98000 LDA #128'},{'offset':'0x327a5','before':'BD8276 LDA spritecamY,X','after':'A9yyyy LDA #virtualY (192/216/384)'}],'fixture':'Run1100 native intro/growth frames toinitialize PPU graphics, thenrestore each original WRAM/GSU/VRAM/OAM/CGRAM snapshot independently; transpose only private render actor tovirtualanchor, disable terrain/velocity; reapply original pose tables forsecondframe nativeOBJhardware latency. Original worldtrajectory/timing remain sourceWorldFeet and are never sourced from fixture movement.','planeIsolation':{'TM':'EUWRAM0969=02 BG2 only','TS':'EUWRAM096A=00','CGWSEL':'EUWRAM096D=00','CGADSUB':'EUWRAM096E=00','CGRAM0':'GSU2000=7C1F controlled absent backdrop; strict guard against same value at any other native palette entry','coverage':'Native PPU body pixels retained wherever controlled backdrop is absent; Mesen unused framebuffer highbyte becomes nativecoverage alpha. Fullwidth entirelyblack forced-blank raster rows excluded, original bodypalette untouched. This is isolated native plane coverage, not original-scene color keying.'},'stitch':'Tall native source yscale>=180h captured at192 and384. Upper band is registered by192px; native seam at16, without interpolation. Native pixels only; cropped bounds can have negativeY. Primary body exposure uses192 tofit native209-row viewport; taller stretches use384 upper exposure registered by192px, seam16.','nativeRaster':'Source/render Mesen PAL239 raster has15 leading border lines and game209-row active region. Body plane shifts−15 to native OAM coordinates; lower viewport192 plus upper384 recover complete art.','boundaryCaptures':boundary}
 (outdir/'records.json').write_text(json.dumps({'records':records,'provenance':provenance},indent=2)+'\n');print('EXPORTED',outdir,len(records),'boundary',boundary,flush=True)

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--work',type=Path,required=True)
 p.add_argument('--captures','--out',dest='captures',type=Path,required=True)
 a=p.parse_args()
 export_rgba(a.captures.resolve(),a.work.resolve())
 export_rgba(a.captures.resolve()/'motion',a.work.resolve())

if __name__=='__main__':main()
