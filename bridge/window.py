"""Small native SDL2 viewer, using the SDL2 already installed for Mesen."""
import ctypes as C
import ctypes.util
import time
from concurrent.futures import ThreadPoolExecutor
from PIL import Image,ImageDraw
from .game import Game


def library_path():
    return ctypes.util.find_library('SDL2') or '/opt/homebrew/lib/libSDL2.dylib'


class Window:
    def __init__(self,title):
        self.sdl=C.CDLL(library_path())
        signatures={
            'SDL_Init':(C.c_int,[C.c_uint32]),
            'SDL_CreateWindow':(C.c_void_p,[C.c_char_p,C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint32]),
            'SDL_CreateRenderer':(C.c_void_p,[C.c_void_p,C.c_int,C.c_uint32]),
            'SDL_CreateTexture':(C.c_void_p,[C.c_void_p,C.c_uint32,C.c_int,C.c_int,C.c_int]),
            'SDL_UpdateTexture':(C.c_int,[C.c_void_p,C.c_void_p,C.c_void_p,C.c_int]),
            'SDL_RenderClear':(C.c_int,[C.c_void_p]),
            'SDL_RenderCopy':(C.c_int,[C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p]),
            'SDL_RenderPresent':(None,[C.c_void_p]),
            'SDL_RenderSetLogicalSize':(C.c_int,[C.c_void_p,C.c_int,C.c_int]),
            'SDL_SetWindowTitle':(None,[C.c_void_p,C.c_char_p]),
            'SDL_PollEvent':(C.c_int,[C.c_void_p]),
            'SDL_GetKeyboardState':(C.POINTER(C.c_uint8),[C.c_void_p]),
            'SDL_GameControllerOpen':(C.c_void_p,[C.c_int]),
            'SDL_GameControllerGetButton':(C.c_uint8,[C.c_void_p,C.c_int]),
            'SDL_GameControllerGetAxis':(C.c_int16,[C.c_void_p,C.c_int]),
            'SDL_IsGameController':(C.c_int,[C.c_int]),
            'SDL_NumJoysticks':(C.c_int,[]),
            'SDL_DestroyTexture':(None,[C.c_void_p]),
            'SDL_DestroyRenderer':(None,[C.c_void_p]),
            'SDL_DestroyWindow':(None,[C.c_void_p]),
            'SDL_GameControllerClose':(None,[C.c_void_p]),
            'SDL_Quit':(None,[]),
            'SDL_GetError':(C.c_char_p,[]),
        }
        for name,(restype,args) in signatures.items():
            f=getattr(self.sdl,name);f.restype=restype;f.argtypes=args
        if self.sdl.SDL_Init(0x20|0x2000):raise RuntimeError(self.sdl.SDL_GetError().decode())
        self.window=self.sdl.SDL_CreateWindow(title.encode(),0x1fff0000,0x1fff0000,768,717,0x24)
        self.renderer=self.sdl.SDL_CreateRenderer(self.window,-1,2)
        if not self.renderer:self.renderer=self.sdl.SDL_CreateRenderer(self.window,-1,0)
        if not self.window or not self.renderer:raise RuntimeError(self.sdl.SDL_GetError().decode())
        self.texture=None;self.size=None;self.controller=None
        for i in range(self.sdl.SDL_NumJoysticks()):
            if self.sdl.SDL_IsGameController(i):self.controller=self.sdl.SDL_GameControllerOpen(i);break

    def inputs(self):
        event=(C.c_uint8*64)();quit_requested=False
        while self.sdl.SDL_PollEvent(C.byref(event)):
            if C.cast(event,C.POINTER(C.c_uint32))[0]==0x100:quit_requested=True
        state=self.sdl.SDL_GetKeyboardState(None)
        mapping={'left':(80,4),'right':(79,7),'up':(82,26),'down':(81,22),
                 'b':(29,44),'y':(27,225,229),'start':(40,)}
        keys={button for button,codes in mapping.items() if any(state[c] for c in codes)}
        if self.controller:
            for name,code in {'b':0,'y':2,'start':6,'up':11,'down':12,'left':13,'right':14}.items():
                if self.sdl.SDL_GameControllerGetButton(self.controller,code):keys.add(name)
            axis=self.sdl.SDL_GameControllerGetAxis(self.controller,0)
            if axis<-12000:keys.add('left')
            if axis>12000:keys.add('right')
        return keys,quit_requested or bool(state[41])

    def draw(self,image):
        size=image.size
        if size!=self.size:
            if self.texture:self.sdl.SDL_DestroyTexture(self.texture)
            self.size=size
            self.texture=self.sdl.SDL_CreateTexture(self.renderer,0x16762004,1,*size)
            self.sdl.SDL_RenderSetLogicalSize(self.renderer,*size)
            if not self.texture:raise RuntimeError(self.sdl.SDL_GetError().decode())
        pixels=image.convert('RGBA').tobytes()
        self.sdl.SDL_UpdateTexture(self.texture,None,pixels,size[0]*4)
        self.sdl.SDL_RenderClear(self.renderer)
        self.sdl.SDL_RenderCopy(self.renderer,self.texture,None,None)
        self.sdl.SDL_RenderPresent(self.renderer)

    def close(self):
        if self.controller:self.sdl.SDL_GameControllerClose(self.controller)
        if self.texture:self.sdl.SDL_DestroyTexture(self.texture)
        self.sdl.SDL_DestroyRenderer(self.renderer)
        self.sdl.SDL_DestroyWindow(self.window)
        self.sdl.SDL_Quit()


def run(root,character='dk'):
    name='Diddy Kong' if character=='diddy' else 'Donkey Kong'
    window=Window(f'{name} dans Yoshi\u2019s Island | 1-1 | Fleches, Z/Espace : saut, Echap : quitter')
    game=None
    try:
        with ThreadPoolExecutor(max_workers=1) as pool:
            future=pool.submit(Game,root,character)
            loading=Image.new('RGBA',(256,239),'#142534')
            ImageDraw.Draw(loading).text((20,100),'Chargement des deux jeux...',fill='white')
            while not future.done():
                _,quit_requested=window.inputs();window.draw(loading)
                if quit_requested:
                    game=future.result();return
                time.sleep(.02)
            game=future.result()
        while True:
            start=time.monotonic()
            keys,quit_requested=window.inputs()
            if quit_requested:break
            image=game.advance(keys)
            window.draw(image)
            time.sleep(max(0,1/50-(time.monotonic()-start)))
    finally:
        if game:game.close()
        window.close()
