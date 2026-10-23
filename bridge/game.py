"""Prototype: DKC renders the actor; Yoshi's Island owns gameplay and collision."""
from concurrent.futures import ThreadPoolExecutor
from fractions import Fraction
from pathlib import Path
import time
import tempfile

from .bootstrap import find_roms,host_stage1,donor_stage1
from .emulator import Emulator
from .snes import FrameClock,world_to_screen,render_objects,signed16

HOST_RATE=Fraction(21281370,312*1364)
DONOR_RATE=Fraction(21477270,262*1364-2)


def host_inputs(buttons):
    # Keep the level's B jump and interactions; donor Y run/roll must not eat enemies.
    return set(buttons)&{'left','right','up','down','b','start'}


def donor_inputs(buttons):
    return set(buttons)&{'left','right','b','y','down'}


def actor_position(host):
    x,y=world_to_screen(host.word(0x70008c),host.word(0x700090),
                        host.word(0x7e0039),host.word(0x7e003b))
    # Yoshi's coordinate is the collision-box top-left. Native SNES image has 7 top padding rows.
    return x+12,y+32+7


def composite(host,donor,character='dk'):
    canvas=host.image()
    if host.wram[0x118]!=0x13:return canvas
    offset=4 if character=='diddy' else 2
    tile_min=64 if character=='diddy' else 0
    sprites=render_objects(donor,lambda o:tile_min<=o.tile<tile_min+32)
    target_x,target_y=actor_position(host)
    source_x=signed16(donor.word(0x7e0b19+offset)-donor.word(0x7e1a62))
    source_y=donor.word(0x7e0bc1+offset)-12
    canvas.alpha_composite(sprites,(target_x-source_x,target_y-source_y))
    return canvas


class Game:
    def __init__(self,root,character='dk',executable=None,on_status=lambda text:None):
        if character not in ('dk','diddy'):raise ValueError('Choose dk or diddy')
        self.character=character;self.root=Path(root).resolve()
        executable=executable or self.root/'vendor/Mesen.app/Contents/MacOS/Mesen'
        roms=find_roms(self.root)
        (self.root/'runtime').mkdir(exist_ok=True)
        self.session=Path(tempfile.mkdtemp(prefix='session-',dir=self.root/'runtime'))
        self.host=Emulator(executable,roms['host'],self.session/'host',role='host')
        try:self.donor=Emulator(executable,roms['donor'],self.session/'donor',role='donor')
        except Exception:self.host.close();raise
        self.clock=FrameClock(HOST_RATE,DONOR_RATE)
        self.frames=0
        self.pool=ThreadPoolExecutor(max_workers=2)
        try:
            on_status('Chargement des deux jeux…')
            h=self.pool.submit(host_stage1,self.host)
            d=self.pool.submit(donor_stage1,self.donor,character)
            self.h=h.result();self.d=d.result()
            self.anchor_x=self.d.word(0x7e0b19+(4 if character=='diddy' else 2))
            self.anchor_y=self.d.word(0x7e0bc1+(4 if character=='diddy' else 2))
            self.anchor_camera=self.d.word(0x7e1a62)
            on_status('Niveau 1-1 prêt')
        except Exception:self.close();raise

    def advance(self,buttons=()):
        if self.h.wram[0x21a]!=0:raise RuntimeError('Ce prototype est limité au niveau 1-1')
        host_future=self.pool.submit(self.host.step,1,host_inputs(buttons))
        offset=4 if self.character=='diddy' else 2
        patches=[('snesWorkRam',0xb19+offset,self.anchor_x,2),
                 ('snesWorkRam',0xbc1+offset,self.anchor_y,2),
                 ('snesWorkRam',0x1a62,self.anchor_camera,2)]
        count=self.clock.advance()
        donor_future=self.pool.submit(self.donor.step,count,donor_inputs(buttons),patches) if count else None
        self.h=host_future.result()
        if donor_future:self.d=donor_future.result()
        self.frames+=1
        return composite(self.h,self.d,self.character)

    def image(self):return composite(self.h,self.d,self.character)

    def close(self):
        self.pool.shutdown(wait=True)
        self.host.close();self.donor.close()

    def __enter__(self):return self
    def __exit__(self,*args):self.close()
