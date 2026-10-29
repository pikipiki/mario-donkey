#!/usr/bin/env python3
"""Export EU Yoshi's Island native pipe SFX ($31), offline with local Mesen.
Usage: extract-yoshi-pipe.py ROM MesenCore.dylib OUTPUT.wav
Never touches player saves; emulation uses a private temporary home.
"""
import array,ctypes as C,hashlib,importlib.util,json,struct,sys,tempfile,time,wave
from pathlib import Path
spec=importlib.util.spec_from_file_location('dkc_sfx',Path(__file__).with_name('extract-dkc-sfx.py'))
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
rom_path,core_path,out=map(Path,sys.argv[1:]);rom=rom_path.read_bytes()
if hashlib.sha256(rom).hexdigest()!='91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90':raise ValueError('Verified EU ROM required')
# Native pipe entry signature, including LDA #$31.
if rom[0x264e2:0x264fb]!=bytes.fromhex('a93100ac4801c00d00d008ac06613007a9140022de8500eeb4'):raise ValueError('Pipe entry signature missing')
with tempfile.TemporaryDirectory(prefix='yoshi-pipe-') as temp:
 lib=C.CDLL(str(core_path.resolve()))
 for name,args in {'InitializeEmu':[C.c_char_p,C.c_void_p,C.c_void_p,C.c_bool,C.c_bool,C.c_bool,C.c_bool],'LoadRom':[C.c_char_p,C.c_char_p],'SetAudioConfig':[base.AudioConfig],'SetMemoryValues':[C.c_int,C.c_uint32,C.c_void_p,C.c_int],'SetMemoryValue':[C.c_int,C.c_uint32,C.c_uint8],'GetCpuState':[C.c_void_p,C.c_int],'SetCpuState':[C.c_void_p,C.c_int],'WaveRecord':[C.c_char_p]}.items():getattr(lib,name).argtypes=args
 lib.InitDll();lib.InitializeEmu(temp.encode(),None,None,True,True,True,True)
 cfg=base.AudioConfig();cfg.enabled=True;cfg.fixedRate=True;cfg.volume=100;cfg.rate=32000;cfg.latency=60;lib.SetAudioConfig(cfg)
 def write(kind,addr,data):lib.SetMemoryValues(kind,addr,C.create_string_buffer(data),len(data))
 def program(code):
  write(15,0x7000,bytes.fromhex(code));cpu=(C.c_ubyte*256)();lib.GetCpuState(cpu,0);cpu[18]=0;cpu[19]=0x70;cpu[20]=0x7e;cpu[22]|=0x24;cpu[29]=0;lib.SetCpuState(cpu,0)
 try:
  lib.LoadRom(str(rom_path.resolve()).encode(),None);time.sleep(4);lib.Pause();lib.InitializeDebugger()
  lib.SetMemoryValue(14,struct.unpack_from('<H',rom,0xffea)[0],0x40)
  # Native SPC command $F0 stops music; keep the SPC/DSP running, park CPU.
  program('e220 a9f0 8d4021 9c4321 80fe');lib.Resume();time.sleep(.6);lib.Pause()
  wav=Path(temp)/'pipe.wav';lib.WaveRecord(str(wav).encode())
  program('e220 a931 8d4321 80fe');lib.Resume();time.sleep(1.2);lib.Pause();lib.WaveStop()
  with wave.open(str(wav)) as f:stereo=array.array('h',f.readframes(f.getnframes()))
  mono=array.array('h',(round((stereo[i]+stereo[i+1])/2) for i in range(0,len(stereo),2)))
  audible=[i for i,v in enumerate(mono) if abs(v)>25]
  if not audible:raise ValueError('Silent native effect')
  clip=mono[max(0,audible[0]-160):min(len(mono),audible[-1]+321)]
  out.parent.mkdir(parents=True,exist_ok=True)
  with wave.open(str(out),'wb') as f:f.setparams((1,2,32000,0,'NONE','PCM'));f.writeframes(clip.tobytes())
  meta={'source':'Yoshi Island EU native pipe sound $31','romSha256':hashlib.sha256(rom).hexdigest(),'duration':len(clip)/32000,'peak':max(map(abs,clip)),'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}
  out.with_suffix('.json').write_text(json.dumps(meta,indent=2)+'\n');print(meta)
 finally:lib.Stop();lib.Release()
