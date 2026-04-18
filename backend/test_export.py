import os
from moviepy.editor import VideoFileClip, concatenate_videoclips

job_dir = r"e:\eduf\eduf\backend\uploads\outputs\1774985693_1774985692_reactjs"

try:
    clips = []
    for i in range(3):
        clips.append(VideoFileClip(os.path.join(job_dir, f"lipsync_{i:03d}.mp4")).copy())
    
    final_vi = concatenate_videoclips(clips, method='compose')
    final_vi.write_videofile(os.path.join(job_dir, "test_out_2.mp4"), fps=24, logger=None)
    print("SUCCESS")
except Exception as e:
    import traceback
    with open("err_test.txt", "w", encoding='utf-8') as f:
        f.write(traceback.format_exc())
