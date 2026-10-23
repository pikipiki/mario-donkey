import struct
import unittest
from fractions import Fraction
from types import SimpleNamespace
from bridge.snes import (FrameClock, signed16, world_to_screen, objects,
                         object_image, palette_rgba)
from bridge.emulator import Snapshot
from bridge.game import host_inputs,donor_inputs


class CoordinatesTests(unittest.TestCase):
    def test_scrolling_does_not_move_world_character(self):
        self.assertEqual(world_to_screen(1000,500,920,400),(80,100))
        self.assertEqual(world_to_screen(1000,500,940,400),(60,100))

    def test_negative_coordinates_and_wrap(self):
        self.assertEqual(world_to_screen(12,5,20,10),(-8,-5))
        self.assertEqual(signed16(0xff00),-256)
        self.assertEqual(world_to_screen(3,2,0xfffe,0xffff),(5,3))


class ClockTests(unittest.TestCase):
    def test_pal_host_ntsc_donor(self):
        c=FrameClock(50,60)
        self.assertEqual([c.advance() for _ in range(5)],[1,1,1,1,2])

    def test_two_hours_do_not_accumulate_drift(self):
        host=Fraction(21281370,312*1364)
        donor=Fraction(21477270,262*1364-2)
        c=FrameClock(host,donor)
        for _ in range(360000):c.advance()
        error=Fraction(c.host_frames)*donor/host-c.donor_frames
        self.assertGreaterEqual(error,0)
        self.assertLess(error,1)

    def test_slower_donor_can_skip_a_frame(self):
        c=FrameClock(60,50)
        self.assertEqual(sum(c.advance() for _ in range(60)),50)


class SpriteTests(unittest.TestCase):
    def fixture(self):
        oam=bytearray(544)
        oam[:4]=bytes((250,240,0,0))
        oam[512]=1
        vram=bytearray(65536)
        vram[0]=0x80 # top left pixel, plane 0, palette index 1
        vram[1]=0x40 # next pixel, plane 1, palette index 2
        cgram=bytearray(512)
        struct.pack_into('<H',cgram,129*2,0x001f)
        struct.pack_into('<H',cgram,130*2,0x03e0)
        return oam,vram,cgram

    def test_signed_oam_x_and_size_bit_are_independent(self):
        oam,_,_=self.fixture()
        obj=next(objects(oam,0))
        self.assertEqual((obj.x,obj.y,obj.width,obj.height),(-6,240,8,8))
        oam[512]=2
        obj=next(objects(oam,0))
        self.assertEqual((obj.x,obj.width),(250,16))

    def test_decodes_four_bitplanes_and_transparency(self):
        oam,vram,cgram=self.fixture()
        im=object_image(next(objects(oam,0)),vram,cgram,0,8192)
        self.assertEqual(im.getpixel((0,0)),(255,0,0,255))
        self.assertEqual(im.getpixel((1,0)),(0,255,0,255))
        self.assertEqual(im.getpixel((2,0)),(0,0,0,0))

    def test_flips_relocate_pixels_without_color_change(self):
        oam,vram,cgram=self.fixture();oam[3]=0xc0
        im=object_image(next(objects(oam,0)),vram,cgram,0,8192)
        self.assertEqual(im.getpixel((7,7)),(255,0,0,255))
        self.assertEqual(im.getpixel((6,7)),(0,255,0,255))
        self.assertEqual(im.getpixel((0,0))[3],0)

    def test_name_table_offset_is_applied_to_bank_one(self):
        oam,vram,cgram=self.fixture();oam[3]=1
        vram[8192]=vram[0];vram[0]=0
        im=object_image(next(objects(oam,0)),vram,cgram,0,8192)
        self.assertEqual(im.getpixel((0,0)),(255,0,0,255))

    def test_bad_oam_is_rejected(self):
        with self.assertRaises(ValueError):list(objects(bytes(543),0))


class ProtocolTests(unittest.TestCase):
    def test_truncated_snapshot_is_rejected(self):
        with self.assertRaises(ValueError):Snapshot(struct.pack('<III',1,256,239),{})


class InputTests(unittest.TestCase):
    def test_run_does_not_trigger_yoshi_tongue(self):
        self.assertEqual(host_inputs({'right','y'}),{'right'})
        self.assertEqual(donor_inputs({'right','y'}),{'right','y'})

    def test_jump_and_direction_reach_both_games(self):
        self.assertEqual(host_inputs({'left','b'}),{'left','b'})
        self.assertEqual(donor_inputs({'left','b'}),{'left','b'})


if __name__=='__main__':unittest.main()
