from moviepy.editor import ColorClip

c = ColorClip((100, 100), color=(255, 0, 0), duration=2)
# Ensure fps is set
c.fps = 24.0

try:
    c.write_videofile('test.mp4',
                fps=24.0,
                codec='libx264',
                bitrate=None,
                audio=False,
                audio_fps=44100,
                preset='ultrafast',
                audio_codec='aac',
                logger=None,
                threads=4)
except Exception as e:
    import traceback
    traceback.print_exc()
