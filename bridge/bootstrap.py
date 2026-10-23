"""Boot exact supported ROM revisions into the two starting areas."""
import hashlib
from pathlib import Path

ROM_HASHES={
 'host':'91a4dc481c54b620cb3bccaffe5fa3f69db955ae600309414d18bb59307cba90',
 'donor':'628147468c3539283197f58f03b94df49758a332831857481ea9cc31645f0527',
}

def find_roms(folder):
    found={}
    for p in Path(folder).glob('*.sfc'):
        digest=hashlib.sha256(p.read_bytes()).hexdigest()
        for role,expected in ROM_HASHES.items():
            if digest==expected:found[role]=p
    if len(found)!=2:raise ValueError('Expected the verified Yoshi Europe and DKC USA Rev 2 ROMs in project root')
    return found

def host_stage1(emu):
    emu.step(200,snapshot=False)
    # Language selection, then title/file select. EU game-mode table differs from USA.
    for _ in range(12):
        s=emu.step(120)
        mode=s.wram[0x118]
        if mode in (0x3c,0x3d):break
        emu.step(15,('start',) if mode<0xd else ('b',),snapshot=False)
    else:raise RuntimeError('Could not initialize a new Yoshi game')
    # Skip the prologue via the EU fade-to-overworld state, after new-game setup.
    s=emu.step(240,writes=[('snesWorkRam',0x118,0x23,1),
        ('snesWorkRam',0x200,0x010f,2),('snesWorkRam',0x218,0,2),
        ('snesWorkRam',0x21a,0,2)])
    for _ in range(6):
        if s.wram[0x118]==0x13 and s.word(0x70008c)>0:return s
        emu.step(15,('b',),snapshot=False)
        s=emu.step(180)
    raise RuntimeError(f'Yoshi stage 1-1 did not load (mode {s.wram[0x118]:02x})')

def donor_stage1(emu, character='dk'):
    emu.step(900,snapshot=False)
    emu.step(15,('start',),snapshot=False)
    emu.step(180,snapshot=False)
    for _ in range(12):
        patches=[('snesWorkRam',0x56f,2,2)] if character=='diddy' else []
        emu.step(15,('b',),snapshot=False,writes=patches)
        s=emu.step(150)
        if s.word(0x7e003e)==22:
            s=emu.step(300)
            offset=4 if character=='diddy' else 2
            if s.word(0x7e0d45+offset) in (1,2) and s.word(0x7e0b19+offset)>0:return s
    raise RuntimeError('DKC Jungle Hijinxs did not load')
