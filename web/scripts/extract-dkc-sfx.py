#!/usr/bin/env python3
"""Render original DKC USA Rev2 effects with an existing Mesen 2.2.1 core.

Offline build tool only. Runtime uses a small PCM bank, not a second emulator.
Usage: python3 scripts/extract-dkc-sfx.py ROM MesenCore.dylib OUTPUT_DIRECTORY
Uses a private temporary home, never the player's emulator settings or saves.
"""
from pathlib import Path
import argparse, array, ctypes as C, hashlib, json, struct, sys, tempfile, time, wave

ROM_SHA='628147468c3539283197f58f03b94df49758a332831857481ea9cc31645f0527'
EFFECTS={
 'rambi-land':0x0d,'rambi-pant':0x10,'crate-open':0x11,
 'rambi-step-1':0x27,'rambi-step-2':0x28,'animal-hit':0x34,
 'rambi-attack':0x56,'enguarde-attack':0x57,'animal-mount':0x58,
 'wing-flap':0x59,'animal-jump':0x5f,
}
# Native global sample set (ROM uploader). 35,121 bytes, below echo RAM $df00.
SAMPLES=[0,1,2,3,6,7,8,9,10,11,14,15,31,32,33,34,35,36,37,68,38,39,40,41,42,43,17,29,22,54]

class AudioConfig(C.Structure):
 _fields_=[('device',C.c_char_p),('enabled',C.c_bool),('fixedRate',C.c_bool),
  ('volume',C.c_uint32),('rate',C.c_uint32),('latency',C.c_uint32),
  ('muteBackground',C.c_bool),('reduceBackground',C.c_bool),('reduceFastForward',C.c_bool),('reduction',C.c_uint32),
  ('reverb',C.c_bool),('reverbStrength',C.c_uint32),('reverbDelay',C.c_uint32),
  ('crossfeed',C.c_bool),('crossfeedRatio',C.c_uint32),('equalizer',C.c_bool),
  *[(f'band{i}',C.c_double) for i in range(20)],
  ('limitTrack',C.c_bool),('trackLength',C.c_uint32),('detectSilence',C.c_bool),('silenceDelay',C.c_uint32)]

def run(rom_path,core_path,out):
 rom=rom_path.read_bytes()
 if hashlib.sha256(rom).hexdigest()!=ROM_SHA:raise ValueError('Requires the verified DKC USA Rev2 ROM; no guessed offsets.')
 if rom[0x9ff00:0x9ff06]!=bytes.fromhex('0000c7390ec7'):raise ValueError('BRR pointer table mismatch')
 out.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='dkc-fx-') as temp:
  lib=C.CDLL(str(core_path.resolve()))
  signatures={
   'InitializeEmu':[C.c_char_p,C.c_void_p,C.c_void_p,C.c_bool,C.c_bool,C.c_bool,C.c_bool],
   'LoadRom':[C.c_char_p,C.c_char_p],'SaveStateFile':[C.c_char_p],'LoadStateFile':[C.c_char_p],'SetAudioConfig':[AudioConfig],
   'GetMemoryState':[C.c_int,C.c_void_p], 'SetMemoryValues':[C.c_int,C.c_uint32,C.c_void_p,C.c_int],
   'SetMemoryValue':[C.c_int,C.c_uint32,C.c_uint8], 'GetCpuState':[C.c_void_p,C.c_int],
   'SetCpuState':[C.c_void_p,C.c_int], 'WaveRecord':[C.c_char_p],
  }
  for name,args in signatures.items():getattr(lib,name).argtypes=args
  lib.LoadRom.restype=C.c_bool
  lib.InitDll();lib.InitializeEmu(temp.encode(),None,None,True,True,True,True)
  cfg=AudioConfig();cfg.enabled=True;cfg.fixedRate=True;cfg.volume=100;cfg.rate=32000;cfg.latency=60
  lib.SetAudioConfig(cfg)
  try:
   if not lib.LoadRom(str(rom_path.resolve()).encode(),None):raise RuntimeError('Cannot open ROM')
   time.sleep(3);lib.Pause();lib.InitializeDebugger()
   ram=(C.c_ubyte*65536)();lib.GetMemoryState(21,ram);native=bytes(ram)
   # Match the actual Rev2 SPC code: source Rev0 labels differ by 5–8 bytes.
   call=native.index(bytes.fromhex('1c 2d e8 01 d5 a0 01'))
   main=native.index(bytes.fromhex('e4 f4 5d 65 de 04'))
   if call!=0x1178 or main!=0x606:raise ValueError('Unexpected SPC driver')
   if bytes.fromhex('f5 e8 04 ce d5 44 02') not in native:raise ValueError('Unexpected sample map')
   def write(kind,address,data):lib.SetMemoryValues(kind,address,C.create_string_buffer(data),len(data))
   sample_data=[];address=0x3300
   for physical,sample in enumerate(SAMPLES):
    offset=int.from_bytes(rom[0x9ff00+sample*3:0x9ff00+sample*3+3],'little')&0x3fffff
    loop,length=struct.unpack_from('<HH',rom,offset)
    write(21,address,rom[offset+4:offset+4+length])
    write(21,0x3200+4*physical,struct.pack('<HH',address,address+loop))
    lib.SetMemoryValue(21,0x4e8+sample,physical)
    sample_data.append({'id':sample,'romOffset':offset,'length':length,'loop':loop});address+=length
   if address>=0xdf00:raise ValueError('BRR overlaps echo RAM')
   # Park the donor CPU in a private RAM loop; SPC/DSP continue. Its NMI
   # returns immediately. These changes exist only in this export process.
   write(15,0x7000,bytes([0x80,0xfe]))
   nmi=struct.unpack_from('<H',rom,0xffea)[0];lib.SetMemoryValue(14,nmi,0x40)
   cpu=(C.c_ubyte*256)();lib.GetCpuState(cpu,0)
   cpu[18]=0;cpu[19]=0x70;cpu[20]=0x7e;cpu[22]|=4;cpu[29]=0;lib.SetCpuState(cpu,0)
   write(21,0x110,bytes(16));write(21,0x1a0,bytes(16));lib.SetMemoryValue(23,0x5c,255)
   lib.Resume();time.sleep(.3);lib.Pause()
   lib.SaveStateFile(str(Path(temp)/'silent.mss').encode())
   pcm=array.array('h');entries={}
   for name,sound_id in EFFECTS.items():
    lib.LoadStateFile(str(Path(temp)/'silent.mss').encode());lib.Pause()
    write(21,0x110,bytes(16));write(21,0x1a0,bytes(16));lib.SetMemoryValue(23,0x5c,255)
    lib.Resume();time.sleep(.15);lib.Pause()
    state=(C.c_ubyte*256)();lib.GetCpuState(state,1)
    # Original CODE_1178 plays A's effect on voice X. Return to its real loop.
    write(21,0x3e0,bytes([0xe8,sound_id,0xcd,0,0x3f,call&255,call>>8,0x5f,main&255,main>>8]))
    state[8]=0xe0;state[9]=3;lib.SetCpuState(state,1)
    wav_path=Path(temp)/(name+'.wav');lib.WaveRecord(str(wav_path).encode())
    lib.Resume();time.sleep(1.5);lib.Pause();lib.WaveStop()
    with wave.open(str(wav_path)) as wav:
     if wav.getframerate()!=32000 or wav.getnchannels()!=2:raise ValueError('Unexpected native PCM format')
     stereo=array.array('h',wav.readframes(wav.getnframes()))
    if sys.byteorder!='little':stereo.byteswap()
    mono=array.array('h',(round((stereo[i]+stereo[i+1])/2) for i in range(0,len(stereo),2)))
    audible=[i for i,v in enumerate(mono) if abs(v)>20]
    if not audible:
     st=(C.c_ubyte*256)();lib.GetCpuState(st,1);print('SILENT PC',hex(st[8]+256*st[9]),'stub',flush=True);raise ValueError('Native effect was silent: '+name)
    first=max(0,audible[0]-160);last=min(len(mono),audible[-1]+641)
    clip=mono[first:last]
    # Remove only the inaudible residual DC and taper the last 5ms to silence.
    for i in range(min(160,len(clip))):clip[-1-i]=round(clip[-1-i]*i/160)
    entry={'soundId':sound_id,'offset':len(pcm)/32000,'duration':len(clip)/32000,'peak':max(map(abs,clip))}
    entries[name]=entry;pcm.extend(clip);pcm.extend([0]*320)
    print(name,entry,flush=True)
   if sys.byteorder!='little':pcm.byteswap()
   with wave.open(str(out/'dkc-animals.wav'),'wb') as wav:
    wav.setparams((1,2,32000,0,'NONE','not compressed'));wav.writeframes(pcm.tobytes())
   manifest={'version':1,'romSha256':ROM_SHA,'rate':32000,'effects':entries,
    'bankSha256':hashlib.sha256((out/'dkc-animals.wav').read_bytes()).hexdigest(),
    'provenance':{'core':'Mesen 2.2.1','driverEntry':call,'driverLoop':main,'sampleMap':0x4e8,'samples':sample_data}}
   (out/'dkc-animals.json').write_text(json.dumps(manifest,indent=2)+'\n')
  finally:lib.Stop();lib.Release()

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('rom',type=Path);parser.add_argument('core',type=Path);parser.add_argument('output',type=Path)
 a=parser.parse_args();run(a.rom,a.core,a.output)
