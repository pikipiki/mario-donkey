"""Opt-in integration tests: real ROMs + MesenCE, no mocked game state."""
import os
import unittest
from pathlib import Path
from bridge.game import Game,composite
from bridge.snes import objects,render_objects


@unittest.skipUnless(os.getenv('KONG_RUNTIME_TESTS')=='1','Set KONG_RUNTIME_TESTS=1 to run the real ROMs')
class RuntimeTests(unittest.TestCase):
    def test_stage1_movement_jump_and_landing_with_dk(self):
        root=Path(os.environ.get('KONG_PROJECT_ROOT',Path(__file__).resolve().parents[1]))
        executable=os.environ.get('MESEN_EXECUTABLE')
        with Game(root,executable=executable) as game:
            self.assertEqual(game.h.wram[0x118],0x13)
            self.assertEqual(game.h.wram[0x21a],0)
            start_x=game.h.word(0x70008c)
            start_y=game.h.word(0x700090)
            heights=[]
            for i in range(100):
                buttons={'right'}
                if 10<=i<25:buttons.add('b')
                image=game.advance(buttons)
                heights.append(game.h.word(0x700090))
            self.assertGreater(game.h.word(0x70008c),start_x+100)
            self.assertLess(min(heights),start_y-30)
            self.assertEqual(heights[-1],1904) # Known ground at this point in 1-1.
            self.assertEqual(game.h.word(0x7000aa),0) # Landed, vertical velocity zero.
            # End-of-frame OAM may already contain the game's next DMA upload;
            # verify the mask executed at the rendering boundary, not that next-frame data is empty.
            self.assertGreater(int(game.h.state['bridge.hiddenObjects']),0)
            self.assertGreater(game.clock.donor_frames,game.clock.host_frames)
            out=root/'runtime/evidence';out.mkdir(exist_ok=True)
            image.save(out/'dk-stage1.png')

    def test_diddy_uses_his_own_graphics(self):
        root=Path(os.environ.get('KONG_PROJECT_ROOT',Path(__file__).resolve().parents[1]))
        with Game(root,'diddy',executable=os.environ.get('MESEN_EXECUTABLE')) as game:
            self.assertEqual(game.d.word(0x7e056f),2)
            self.assertEqual(game.d.word(0x7e0d49),2)
            sprite=render_objects(game.d,lambda o:64<=o.tile<96)
            self.assertIsNotNone(sprite.getbbox())
            self.assertGreater(sprite.getchannel('A').histogram()[255],100)
            out=root/'runtime/evidence';out.mkdir(exist_ok=True)
            game.image().save(out/'diddy-stage1.png')

if __name__=='__main__':unittest.main()
