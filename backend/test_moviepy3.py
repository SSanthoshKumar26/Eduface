from moviepy.editor import ColorClip

c = ColorClip((100, 100), color=(255, 0, 0), duration=1)

# we can unwrap write_videofile
original_write = c.write_videofile
while hasattr(original_write, "__wrapped__"):
    original_write = original_write.__wrapped__

print(original_write)

import traceback
try:
    original_write(c, 'test.mp4',
                fps=24.0,
                codec='libx264',
                audio=False,
                logger=None)
    print("SUCCESS")
except Exception as e:
    traceback.print_exc()
