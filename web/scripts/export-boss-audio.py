#!/usr/bin/env python3
"""Offline original boss music/FX export. Requires local verified ROMs and Mesen.
Usage: export-boss-audio.py CORE_DYLIB OUTPUT_DIR
ROMs are read from ../public/rom. Private temp HOME/CPU RAM only; originals intact.
"""
from pathlib import Path
import array,ctypes as C,hashlib,importlib.util,json,struct,subprocess,sys,tempfile,time,wave
import numpy as np
spec=importlib.util.spec_from_file_location('fx',Path(__file__).with_name('extract-dkc-sfx.py'));fx=importlib.util.module_from_spec(spec);spec.loader.exec_module(fx)
class EmulationConfig(C.Structure):_fields_=[('speed',C.c_uint32),('turbo',C.c_uint32),('rewind',C.c_uint32),('ahead',C.c_uint32)]
ROOT=Path(__file__).resolve().parent.parent
TRACKS={'dkc':('dkc-usa-rev2.sfc',0x15),'k-rool':('dkc-usa-rev2.sfc',0x18),'yoshi':('yoshi-eu.sfc',0x0a),'yoshi-major':('yoshi-eu.sfc',0x0c)}
def run(core,out):
 out.mkdir(parents=True,exist_ok=True);evidence={}
 if (out/'boss-music.json').exists():evidence=json.loads((out/'boss-music.json').read_text())['tracks']
 with tempfile.TemporaryDirectory(prefix='native-boss-audio-') as temp:
  lib=C.CDLL(str(core.resolve()))
  for name,args in {'InitializeEmu':[C.c_char_p,C.c_void_p,C.c_void_p,C.c_bool,C.c_bool,C.c_bool,C.c_bool],'LoadRom':[C.c_char_p,C.c_char_p],'SetAudioConfig':[fx.AudioConfig],'SetEmulationConfig':[EmulationConfig],'SetMemoryValues':[C.c_int,C.c_uint32,C.c_void_p,C.c_int],'SetMemoryValue':[C.c_int,C.c_uint32,C.c_uint8],'GetCpuState':[C.c_void_p,C.c_int],'SetCpuState':[C.c_void_p,C.c_int],'WaveRecord':[C.c_char_p],'GetMemoryState':[C.c_int,C.c_void_p]}.items():getattr(lib,name).argtypes=args
  lib.InitDll();lib.InitializeEmu(temp.encode(),None,None,True,True,True,True)
  cfg=fx.AudioConfig();cfg.enabled=True;cfg.fixedRate=True;cfg.volume=100;cfg.rate=32000;cfg.latency=60;lib.SetAudioConfig(cfg)
  def write(kind,addr,data):lib.SetMemoryValues(kind,addr,C.create_string_buffer(data),len(data))
  def program(code):
   write(15,0x7f00,bytes.fromhex(code));cpu=(C.c_ubyte*256)();lib.GetCpuState(cpu,0);cpu[16]=cpu[17]=0;cpu[18]=0;cpu[19]=0x7f;cpu[20]=0x7e;cpu[21]=0;cpu[22]|=4;cpu[29]=0;lib.SetCpuState(cpu,0)
  try:
   for name,(filename,track) in TRACKS.items():
    if len(sys.argv)>3 and sys.argv[3]=='--yoshi' and not name.startswith('yoshi'):continue
    if len(sys.argv)>3 and sys.argv[3]=='--long' and name=='dkc':continue
    rp=ROOT/'public/rom'/filename;r=rp.read_bytes();sha=hashlib.sha256(r).hexdigest()
    expected=fx.ROM_SHA if not name.startswith('yoshi') else '91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90'
    if sha!=expected:raise ValueError('Unverified source ROM')
    lib.SetEmulationConfig(EmulationConfig(100,300,100,0));lib.LoadRom(str(rp).encode(),None);lib.Resume();time.sleep(3);lib.Pause();lib.InitializeDebugger()
    if not name.startswith('yoshi'):lib.SetMemoryValue(14,struct.unpack_from('<H',r,0xffea)[0],0x40)
    if name.startswith('yoshi'):
     if r[0x54f:0x555]!=bytes.fromhex('8e5001ae5001'):raise ValueError('EU uploader signature')
     # Replay the exact SPC upload blocks directly into the private SPC RAM.
     # This avoids executing the host's GSU-dependent title/loader concurrently.
     program('78e230 a900 8d0042 9c4021 9c4321 80fe')
     for block in (0x25,0x16 if name=='yoshi' else 0x19,0x0a if name=='yoshi' else 0x1f):
      ptr=int.from_bytes(r[0x4b8+block-1:0x4bb+block-1],'little')&0x3fffff
      for _ in range(100):
       length,dest=struct.unpack_from('<HH',r,ptr);ptr+=4
       if not length:break
       if dest+length>65536:raise ValueError('SPC upload bounds')
       write(21,dest,r[ptr:ptr+length]);ptr+=length
      else:raise ValueError('Unterminated SPC upload')
     spc=(C.c_ubyte*256)();lib.GetCpuState(spc,1);spc[8]=0;spc[9]=4;lib.SetCpuState(spc,1)
     lib.Resume();time.sleep(.3);lib.Pause();program(f'78e230 a9{track:02x} 8d4021 80fe')
    else:
     if r[0x399036:0x399049]!=bytes.fromhex('4820619022e790b968482027906822ce90b96b'):raise ValueError('DKC uploader signature')
     program(f'c230 a9{track:02x}00 223690b9 80fe')
    # Native music samples, tempo and SPC/DSP remain unchanged. Fixed sample
    # rate records emulated time, accelerated CPU scheduling only saves export time.
    raw=Path(temp)/(name+'.wav');lib.WaveRecord(str(raw).encode());lib.SetEmulationConfig(EmulationConfig(800,800,100,0));lib.Resume();time.sleep(20);lib.Pause();lib.WaveStop()
    with wave.open(str(raw)) as f:
     data=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,2).mean(axis=1).astype(np.int16);rate=f.getframerate()
    audible=np.flatnonzero(np.abs(data)>30)
    if not len(audible):
     cpu=(C.c_ubyte*256)();lib.GetCpuState(cpu,0);spc=(C.c_ubyte*256)();lib.GetCpuState(spc,1);print('CPU',bytes(cpu[:32]).hex(),'SPC',bytes(spc[:16]).hex(),flush=True);raise ValueError('Silent music '+name)
    first=max(0,int(audible[0])-160);data=data[first:]
    # Find a repeated native phrase from the amplitude envelope. A two-second
    # window avoids arbitrary zero-crossing cuts; retain the opening phrase.
    env=np.sqrt(np.mean(data[:len(data)//320*320].astype(float).reshape(-1,320)**2,axis=1));window=200;candidates=[]
    for start in (200,1000,2000,3000):
     a=env[start:start+window]
     if len(a)!=window:continue
     for off in range(start+2000,len(env)-window):
      b=env[off:off+window];corr=np.corrcoef(a,b)[0,1]
      if np.isfinite(corr):candidates.append((float(corr),off,start))
    corr,repeat,start=max(candidates) if candidates else (0,0,0)
    loop_start=start*.01;loop_end=repeat*.01
    if corr<.93 or loop_end<=loop_start:loop_start=0;loop_end=len(data)/rate
    # Keep only the verified repeat plus a little decode padding.
    data=data[:min(len(data),round((loop_end+.15)*rate))]
    pcm=Path(temp)/(name+'-mono.wav')
    with wave.open(str(pcm),'wb') as f:f.setparams((1,2,rate,0,'NONE','PCM'));f.writeframes(data.astype('<i2').tobytes())
    target=out/('boss-'+name+'.mp3');subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(pcm),'-codec:a','libmp3lame','-b:a','96k',str(target)],check=True)
    evidence[name]={'file':target.name,'trackId':track,'romSha256':sha,'duration':len(data)/rate,'loopStart':loop_start,'loopEnd':loop_end,'repeatCorrelation':corr,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    print(name,evidence[name],flush=True)
   (out/'boss-music.json').write_text(json.dumps({'version':1,'tracks':evidence,'provenance':'Original native SPC/DSP music, Mesen2.2.1 fixed32kHz PCM export; MP3 96kbps mono'},indent=2)+'\n')
  finally:lib.Stop();lib.Release()
def effects(core,out):
 # Names/IDs from DKC1 Misc_Defines_DKC1.asm, exact Rev2 driver verified by fx.run.
 fx.EFFECTS={'boss-hit':0x34,'boss-throw':0x5c,'boss-land':0x15,'boss-stomp':0x08,'boss-laugh':0x63,'necky-defeat':0x67}
 with tempfile.TemporaryDirectory(prefix='dkc-boss-fx-') as temp:
  dest=Path(temp);fx.run(ROOT/'public/rom/dkc-usa-rev2.sfc',core,dest)
  meta=json.loads((dest/'dkc-animals.json').read_text());(out/'boss-effects.wav').write_bytes((dest/'dkc-animals.wav').read_bytes());(out/'boss-effects.json').write_text(json.dumps(meta,indent=2)+'\n')
def yoshi_effects(core,out,combat=False):
 rp=ROOT/'public/rom/yoshi-eu.sfc';r=rp.read_bytes();effects=({'aim':0x1a,'throw':0x20,'tongue':0x3e,'swallow':0x14,'make':0x04,'impact':0x1f} if combat else {'yoshi-jump':0x13,'yoshi-land':0x23,'yoshi-hit':0x20,'yoshi-defeat':0x78,'salvo-hit':0x3b,'boo-hit':0x79,'boss-hurt':0x78,'boss-explode':0x74})
 if hashlib.sha256(r).hexdigest()!='91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90':raise ValueError('Verified EU ROM required')
 out.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='yoshi-boss-fx-') as temp:
  lib=C.CDLL(str(core.resolve()))
  for name,args in {'InitializeEmu':[C.c_char_p,C.c_void_p,C.c_void_p,C.c_bool,C.c_bool,C.c_bool,C.c_bool],'LoadRom':[C.c_char_p,C.c_char_p],'SetAudioConfig':[fx.AudioConfig],'SetMemoryValues':[C.c_int,C.c_uint32,C.c_void_p,C.c_int],'SetMemoryValue':[C.c_int,C.c_uint32,C.c_uint8],'GetCpuState':[C.c_void_p,C.c_int],'SetCpuState':[C.c_void_p,C.c_int],'WaveRecord':[C.c_char_p],'SaveStateFile':[C.c_char_p],'LoadStateFile':[C.c_char_p]}.items():getattr(lib,name).argtypes=args
  lib.InitDll();lib.InitializeEmu(temp.encode(),None,None,True,True,True,True)
  cfg=fx.AudioConfig();cfg.enabled=True;cfg.fixedRate=True;cfg.volume=100;cfg.rate=32000;cfg.latency=60;lib.SetAudioConfig(cfg)
  def program(code):
   b=bytes.fromhex(code);lib.SetMemoryValues(15,0x7000,C.create_string_buffer(b),len(b));cpu=(C.c_ubyte*256)();lib.GetCpuState(cpu,0);cpu[16]=cpu[17]=0;cpu[18]=0;cpu[19]=0x70;cpu[20]=0x7e;cpu[21]=0;cpu[22]|=0x24;cpu[29]=0;lib.SetCpuState(cpu,0)
  try:
   lib.LoadRom(str(rp).encode(),None);lib.Resume();time.sleep(4);lib.Pause();lib.InitializeDebugger();
   lib.SetMemoryValue(14,struct.unpack_from('<H',r,0xffea)[0],0x40);program('78e230 a900 8d0042 a9f0 8d4021 9c4321 80fe');
   # Same original uploader used for the boss music bank: restart the private
   # native SPC with its verified global sound/sample block, without GSU boot timing.
   if r[0x54f:0x555]!=bytes.fromhex('8e5001ae5001'):raise ValueError('EU uploader signature')
   for block in (0x25,):
    ptr=int.from_bytes(r[0x4b8+block-1:0x4bb+block-1],'little')&0x3fffff
    for _ in range(100):
     length,dest=struct.unpack_from('<HH',r,ptr);ptr+=4
     if not length:break
     if dest+length>65536:raise ValueError('SPC upload bounds')
     lib.SetMemoryValues(21,dest,C.create_string_buffer(r[ptr:ptr+length]),length);ptr+=length
    else:raise ValueError('Unterminated SPC upload')
   spc=(C.c_ubyte*256)();lib.GetCpuState(spc,1);spc[8]=0;spc[9]=4;lib.SetCpuState(spc,1)
   lib.Resume();time.sleep(.5);lib.Pause();state=Path(temp)/'silent.mss';lib.SaveStateFile(str(state).encode())
   pcm=array.array('h');entries={}
   for name,sound in effects.items():
    lib.LoadStateFile(str(state).encode());lib.Pause();raw=Path(temp)/(name+'.wav');lib.WaveRecord(str(raw).encode());program(f'78e230 a9{sound:02x} 8d4321 80fe');lib.Resume();time.sleep(1.5);lib.Pause();lib.WaveStop()
    with wave.open(str(raw)) as f:stereo=array.array('h',f.readframes(f.getnframes()))
    mono=array.array('h',(round((stereo[i]+stereo[i+1])/2) for i in range(0,len(stereo),2)));audible=[i for i,v in enumerate(mono) if abs(v)>25]
    if not audible:raise ValueError('Silent Yoshi FX '+name)
    clip=mono[max(0,audible[0]-160):min(len(mono),audible[-1]+321)];entries[name]={'soundId':sound,'offset':len(pcm)/32000,'duration':len(clip)/32000,'peak':max(map(abs,clip))};pcm.extend(clip);pcm.extend([0]*320);print(name,entries[name],flush=True)
   prefix='yoshi-combat' if combat else 'boss-yoshi-effects';target=out/(prefix+'.wav')
   with wave.open(str(target),'wb') as f:f.setparams((1,2,32000,0,'NONE','PCM'));f.writeframes(pcm.tobytes())
   (out/(prefix+'.json')).write_text(json.dumps({'version':1,'effects':entries,'romSha256':hashlib.sha256(r).hexdigest(),'bankSha256':hashlib.sha256(target.read_bytes()).hexdigest()},indent=2)+'\n')
  finally:lib.Stop();lib.Release()
if __name__=='__main__':
 if len(sys.argv)>3 and sys.argv[3]=='--yoshi-combat':yoshi_effects(Path(sys.argv[1]),Path(sys.argv[2]),True)
 elif len(sys.argv)>3 and sys.argv[3]=='--yoshi-effects':yoshi_effects(Path(sys.argv[1]),Path(sys.argv[2]))
 elif len(sys.argv)>3 and sys.argv[3]=='--effects':effects(Path(sys.argv[1]),Path(sys.argv[2]))
 else:
  run(Path(sys.argv[1]),Path(sys.argv[2]))
  if len(sys.argv)<4:
   subprocess.run([sys.executable,__file__,sys.argv[1],sys.argv[2],'--effects'],check=True)
   subprocess.run([sys.executable,__file__,sys.argv[1],sys.argv[2],'--yoshi-effects'],check=True)
