"""SNES object decoding, independent of either game's framebuffer/background."""
import struct
from dataclasses import dataclass
from fractions import Fraction


def signed16(value):
    value &= 0xffff
    return value-0x10000 if value & 0x8000 else value


def world_to_screen(x, y, camera_x, camera_y):
    return signed16(x-camera_x), signed16(y-camera_y)


class FrameClock:
    """Rational donor clock; no accumulating float error or assumed 1:1 frames."""
    def __init__(self, host_rate, donor_rate):
        self.ratio=Fraction(donor_rate)/Fraction(host_rate)
        self.host_frames=0
        self.donor_frames=0

    def advance(self):
        self.host_frames+=1
        target=(self.host_frames*self.ratio.numerator)//self.ratio.denominator
        count=target-self.donor_frames
        self.donor_frames=target
        return count


@dataclass(frozen=True)
class Object:
    index:int
    x:int
    y:int
    width:int
    height:int
    tile:int
    palette:int
    priority:int
    flip_x:bool
    flip_y:bool


# OBJSEL modes 6/7 use rectangular objects; retain dimensions separately.
SIZES=(((8,8),(16,16)),((8,8),(32,32)),((8,8),(64,64)),
       ((16,16),(32,32)),((16,16),(64,64)),((32,32),(64,64)),
       ((16,32),(32,64)),((16,32),(32,32)))


def objects(oam, mode):
    if len(oam)!=544: raise ValueError('SNES OAM must contain 544 bytes')
    if not 0<=mode<8: raise ValueError('Invalid OBJSEL mode')
    for i in range(128):
        x,y,tile,attr=oam[i*4:i*4+4]
        ext=(oam[512+i//4]>>((i%4)*2))&3
        x|=(ext&1)<<8
        if x>=256:x-=512
        width,height=SIZES[mode][ext>>1]
        yield Object(i,x,y,width,height,tile|((attr&1)<<8),(attr>>1)&7,
                     (attr>>4)&3,bool(attr&0x40),bool(attr&0x80))


def palette_rgba(cgram,index):
    value=struct.unpack_from('<H',cgram,index*2)[0]
    return tuple(((value>>shift)&31)*255//31 for shift in (0,5,10))+(255,)


def object_image(obj,vram,cgram,base,name_offset):
    """Decode real 4bpp object tiles. Color zero stays transparent."""
    from PIL import Image
    image=Image.new('RGBA',(obj.width,obj.height))
    bank=(obj.tile>>8)&1
    start=(base+bank*name_offset)&0xffff
    origin=obj.tile&255
    for y in range(obj.height):
        sy=obj.height-1-y if obj.flip_y else y
        for x in range(obj.width):
            sx=obj.width-1-x if obj.flip_x else x
            tile=((origin&0xf0)+(sy//8)*16)&0xf0 | ((origin+(sx//8))&0xf)
            address=(start+tile*32+(sy%8)*2)&0xffff
            bit=7-sx%8
            index=sum(((vram[(address+offset)&0xffff]>>bit)&1)<<plane
                      for plane,offset in enumerate((0,1,16,17)))
            if index:image.putpixel((x,y),palette_rgba(cgram,128+obj.palette*16+index))
    return image


def render_objects(snapshot,predicate=lambda obj:True):
    from PIL import Image
    canvas=Image.new('RGBA',(256,256))
    mode=int(snapshot.state['ppu.oamMode'])
    base=int(snapshot.state['ppu.oamBaseAddress'])
    offset=int(snapshot.state['ppu.oamAddressOffset'])
    # Low OAM index wins overlaps within an object layer.
    for obj in reversed(list(objects(snapshot.oam,mode))):
        if not predicate(obj):continue
        sprite=object_image(obj,snapshot.vram,snapshot.cgram,base,offset)
        canvas.alpha_composite(sprite,(obj.x,obj.y))
        if obj.y+obj.height>256:canvas.alpha_composite(sprite,(obj.x,obj.y-256))
    return canvas
