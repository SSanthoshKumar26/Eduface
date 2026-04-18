from moviepy.editor import ColorClip
import moviepy.decorators

original = moviepy.decorators.use_clip_fps_by_default

def my_decorator(f, clip, *a, **k):
    print("DEBUG: entering my_decorator")
    print(f"DEBUG: f={f}, clip={clip}")
    print(f"DEBUG: args={a}")
    print(f"DEBUG: kwargs={k}")
    
    if hasattr(f, "func_code"):
        func_code = f.func_code # Python 2
    else:
        func_code = f.__code__ # Python 3
        
    names = func_code.co_varnames[1:]
    print(f"DEBUG: names={names}")
    
    def fun(fps):
        if fps is not None:
            return fps
        elif getattr(clip, 'fps', None):
            return clip.fps
        return None

    new_a = [fun(arg) if (name=='fps') else arg for (arg, name) in zip(a, names)]
    new_kw = {kk: fun(v) if kk=='fps' else v for (kk,v) in k.items()}
    print(f"DEBUG: new_a={new_a}")
    print(f"DEBUG: new_kw={new_kw}")
    
    # Try calling f with explicit fps, to see if that fixes it
    # But wait, original code is `return f(clip, *new_a, **new_kw)`
    import inspect
    print(f"DEBUG inspecting f signature: {inspect.signature(f)}")
    return f(clip, *new_a, **new_kw)

moviepy.decorators.use_clip_fps_by_default = my_decorator
# WAIT: we need to re-import or redefine the decorated methods!
# Because ColorClip.write_videofile is ALREADY decorated!
# 
# A simpler way is to patch write_videofile locally!

c = ColorClip((100, 100), color=(255, 0, 0), duration=1)
c.fps = 24.0

import traceback
try:
    c.write_videofile('test.mp4',
                fps=24.0,
                codec='libx264',
                audio=False,
                logger=None)
except Exception as e:
    traceback.print_exc()
