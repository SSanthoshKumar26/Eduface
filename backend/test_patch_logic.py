import decorator
import inspect

def _robust_patch(f, clip, *a, **k):
    print(f"DEBUG: robust patch entering. f={f.__name__}, clip={clip}")
    sig = inspect.signature(f)
    print(f"DEBUG: signature={sig}")
    bound = sig.bind_partial(clip, *a, **k)
    print(f"DEBUG: bound arguments={bound.arguments}")
    
    fps_val = bound.arguments.get('fps', None)
    if fps_val is None:
        if getattr(clip, 'fps', None):
            fps_val = clip.fps
            print(f"DEBUG: picked fps from clip: {fps_val}")
    
    if fps_val is not None:
        new_k = k.copy()
        new_k['fps'] = fps_val
        print(f"DEBUG: calling f with fps={fps_val}")
        return f(clip, *a, **new_k)
    
    return f(clip, *a, **k)

robust_patch = decorator.decorator(_robust_patch)

@robust_patch
def my_func(clip, filename, fps=None, codec=None):
    print(f"my_func called with fps={fps}")
    return fps

class Dummy:
    def __init__(self):
        self.fps = 24.0

d = Dummy()
res = my_func(d, "out.mp4")
print(f"Result: {res}")

res2 = my_func(d, "out.mp4", fps=30.0)
print(f"Result2: {res2}")
