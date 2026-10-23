"""Frame-controlled MesenCE worker. No ROM modification, no global emulator settings."""
import os
import select
import shutil
import struct
import subprocess
import time
from pathlib import Path

BUTTONS = ('b','y','select','start','up','down','left','right','a','x','l','r')

class Snapshot:
    def __init__(self, data, state):
        if len(data)<12:raise ValueError('Missing emulator snapshot header')
        self.sequence, self.width, self.height = struct.unpack_from('<III',data)
        offset=12
        size=self.width*self.height*4
        self.bgra=data[offset:offset+size]; offset+=size
        for name,size in [('wram',0x20000),('gsu',0x8000),('vram',0x10000),('oam',544),('cgram',512)]:
            setattr(self,name,data[offset:offset+size]); offset+=size
        if offset != len(data): raise ValueError('Incomplete emulator snapshot')
        self.state=state

    def word(self, address):
        if 0x7e0000<=address<0x800000: return struct.unpack_from('<H',self.wram,address-0x7e0000)[0]
        if 0x700000<=address<0x708000: return struct.unpack_from('<H',self.gsu,address-0x700000)[0]
        raise ValueError('Unsupported memory address')

    def image(self):
        from PIL import Image
        return Image.frombytes('RGBA',(self.width,self.height),self.bgra,'raw','BGRA')

class Emulator:
    def __init__(self, executable, rom, directory, role='probe'):
        self.directory=Path(directory).resolve(); self.directory.mkdir(parents=True,exist_ok=True)
        executable=Path(executable).resolve()
        if not executable.is_file():raise FileNotFoundError(f'Mesen executable missing: {executable}')
        # A private portable home gives each worker its own SRAM/configuration.
        # Hard links share read-only binary bytes, not saves or settings.
        engine=self.directory/'engine';engine.mkdir(exist_ok=True)
        for source in [executable,*executable.parent.glob('*.dylib')]:
            destination=engine/source.name
            if not destination.exists():
                try:os.link(source,destination)
                except OSError:shutil.copy2(source,destination)
        shutil.copy2(executable.parent/'settings.json',engine/'settings.json')
        self.sequence=0
        self.closed=False
        for name in ('commands','replies'):
            p=self.directory/name
            if p.exists(): p.unlink()
            os.mkfifo(p,0o600)
        # O_RDWR prevents blocking during startup and keeps FIFO ownership local.
        self.command_fd=os.open(self.directory/'commands',os.O_RDWR)
        self.reply_fd=os.open(self.directory/'replies',os.O_RDWR|os.O_NONBLOCK)
        self.log=open(self.directory/'mesen.log','w')
        env=dict(os.environ,KONG_BRIDGE_WORKER=str(self.directory),KONG_BRIDGE_ROLE=role)
        script=Path(__file__).with_name('worker.lua').resolve()
        self.process=subprocess.Popen([str(engine/executable.name),'--testRunner','--timeout=86400','--enableStdout',str(script),str(Path(rom).resolve())],env=env,stdout=self.log,stderr=subprocess.STDOUT)

    def step(self, frames=1, buttons=(), writes=(), snapshot=True, timeout=30):
        if not isinstance(frames,int) or frames<1: raise ValueError('frames must be positive')
        unknown=set(buttons)-set(BUTTONS)
        if unknown: raise ValueError('Unknown buttons: '+str(unknown))
        self.sequence+=1
        mask=sum(1<<BUTTONS.index(b) for b in set(buttons))
        patches=','.join(f'{kind}:{address:x}:{value:x}:{width}' for kind,address,value,width in writes)
        line=f'{self.sequence} {frames} {mask} {int(snapshot)} {patches}\n'
        os.write(self.command_fd,line.encode('ascii'))
        end=time.monotonic()+timeout
        response=b''
        while b'\n' not in response:
            remaining=end-time.monotonic()
            if remaining<=0 or self.process.poll() is not None:
                raise RuntimeError(f'Mesen worker failed or timed out. See {self.directory}/mesen.log')
            if select.select([self.reply_fd],[],[],min(.1,remaining))[0]:
                response+=os.read(self.reply_fd,4096)
        if response.startswith(b'ERROR '):raise RuntimeError(response.decode().strip())
        if int(response.strip())!=self.sequence: raise RuntimeError('Out-of-order emulator reply')
        if not snapshot:return None
        state=dict(line.split('=',1) for line in (self.directory/'state.txt').read_text().splitlines())
        result=Snapshot((self.directory/'snapshot.bin').read_bytes(),state)
        if result.sequence!=self.sequence: raise RuntimeError(f'Stale emulator snapshot: wanted {self.sequence}, got {result.sequence}')
        return result

    def close(self):
        if self.closed:return
        self.closed=True
        if self.process.poll() is None:
            os.write(self.command_fd,b'quit\n')
            try:self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:self.process.terminate();self.process.wait(timeout=3)
        os.close(self.command_fd);os.close(self.reply_fd);self.log.close()

    def __enter__(self):return self
    def __exit__(self,*args):self.close()
