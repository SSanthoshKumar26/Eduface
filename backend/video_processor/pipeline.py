import os
import time
import shutil
import re
from typing import Dict, Any
from moviepy.editor import (
    VideoFileClip, ImageClip, CompositeVideoClip,
    concatenate_videoclips, ColorClip, concatenate_audioclips
)
import moviepy.video.fx.all as vfx

import moviepy.decorators
import decorator
import inspect

# ─────────────────────────────────────────────────────────────────
# MONKEYPATCH: Robustly handle moviepy's FPS decorator
# ─────────────────────────────────────────────────────────────────

def _robust_use_clip_fps_by_default(f, clip, *a, **k):
    """
    Robust version of moviepy's FPS decorator that uses inspect.signature.
    This avoids argument misalignment caused by multiple decorators.
    """
    try:
        sig = inspect.signature(f)
        bound = sig.bind_partial(clip, *a, **k)
        
        # If 'fps' is a known parameter and it hasn't been provided yet
        if 'fps' in sig.parameters and 'fps' not in bound.arguments:
            fps_val = getattr(clip, 'fps', None)
            if fps_val is not None:
                # Provide it as a keyword argument
                new_k = k.copy()
                new_k['fps'] = fps_val
                return f(clip, *a, **new_k)
        # Ultimate safety: if we're dealing with write methods and fps is still None,
        # fallback to a default instead of crashing with NoneType error
        if 'fps' in sig.parameters:
            current_bound = sig.bind_partial(clip, *a, **k)
            if current_bound.arguments.get('fps', None) is None:
                # We tried clip.fps, now let's just force 24.0 if it's still missing
                k = k.copy()
                k['fps'] = float(getattr(clip, 'fps', 24) or 24)
                return f(clip, *a, **k)
    except Exception:
        # Fallback to original call if anything goes wrong during inspection
        pass
        
    return f(clip, *a, **k)

# Apply the patch ONLY IF it hasn't been patched yet
if not getattr(moviepy.decorators.use_clip_fps_by_default, '_is_robust_patch', False):
    original_decorator = moviepy.decorators.use_clip_fps_by_default
    moviepy.decorators.use_clip_fps_by_default = decorator.decorator(_robust_use_clip_fps_by_default)
    moviepy.decorators.use_clip_fps_by_default._is_robust_patch = True
    
    # RE-PATCH existing methods that were already decorated
    from moviepy.video.VideoClip import VideoClip
    import moviepy.video.VideoClip as vclip_mod
    
    for method_name in ['write_videofile', 'write_images_sequence', 'write_gif']:
        if hasattr(VideoClip, method_name):
            orig_method = getattr(VideoClip, method_name)
            # Re-wrap with the robust decorator
            new_method = moviepy.decorators.use_clip_fps_by_default(orig_method)
            setattr(VideoClip, method_name, new_method)

    # ULTIMATE FIX 1: Directly override VideoClip.write_videofile to bypass broken decorators
    from moviepy.video.VideoClip import VideoClip
    import moviepy.video.io.ffmpeg_writer as fw
    from moviepy.tools import is_string, find_extension
    import os

    def write_videofile_direct(self, filename, fps=None, codec=None,
                        bitrate=None, audio=True, audio_fps=44100,
                        preset="medium",
                        audio_nbytes=4, audio_codec=None,
                        audio_bitrate=None, audio_bufsize=2000,
                        temp_audiofile=None,
                        rewrite_audio=True, remove_temp=True,
                        write_logfile=False, verbose=True,
                        threads=None, ffmpeg_params=None,
                        logger='bar'):
        
        actual_fps = fps or getattr(self, 'fps', 24.0) or 24.0
        name, ext = os.path.splitext(os.path.basename(filename))
        ext = ext[1:].lower()
        
        if codec is None:
             try:
                 from moviepy.video.VideoClip import extensions_dict
                 codec = extensions_dict[ext]['codec'][0]
             except:
                 codec = 'libx264'

        if audio_codec is None:
            audio_codec = 'libvorbis' if ext in ['ogv', 'webm'] else 'libmp3lame'
        
        make_audio = (audio == True) and (self.audio is not None)
        audiofile = audio if is_string(audio) else None
        
        if make_audio and not audiofile:
            audio_ext = find_extension(audio_codec)
            audiofile = (name + "_TEMP_MPY_wvf_snd.%s" % audio_ext)
            self.audio.write_audiofile(audiofile, audio_fps, audio_nbytes, 
                                     audio_bufsize, audio_codec, bitrate=audio_bitrate,
                                     logger=None)
        
        fw.ffmpeg_write_video(self, filename, actual_fps, codec,
                           bitrate=bitrate, preset=preset,
                           write_logfile=write_logfile,
                           audiofile=audiofile, threads=threads,
                           ffmpeg_params=ffmpeg_params, logger=logger)
        
        if remove_temp and make_audio and audiofile and os.path.exists(audiofile):
             try: os.remove(audiofile)
             except: pass

    VideoClip.write_videofile = write_videofile_direct

    # ULTIMATE FIX 2: Patch the low-level writer as a final safety net
    original_writer_init = fw.FFMPEG_VideoWriter.__init__
    def robust_writer_init(self, filename, size, fps, *args, **kwargs):
        if fps is None or not isinstance(fps, (int, float)) or fps == 0:
            fps = 24.0
        return original_writer_init(self, filename, size, fps, *args, **kwargs)
    fw.FFMPEG_VideoWriter.__init__ = robust_writer_init


from .ppt_extractor import PPTExtractor
from .text_processor import TextProcessor
from .tts_engine import TTSEngine
from .face_processor import FaceProcessor
from .lipsync_generator import LipSyncGenerator
from .face_animator import FaceAnimator


DEFAULT_FPS = 24
VIDEO_W, VIDEO_H = 1920, 1080
AVATAR_W = 420
AVATAR_MARGIN = 30


def _force_fps(clip, fps=DEFAULT_FPS):
    """
    Guarantee a clip has a numeric fps attribute.
    Works for VideoFileClip, ImageClip, ColorClip, and CompositeVideoClip.
    """
    current = getattr(clip, 'fps', None)
    if current is None or current == 0 or not isinstance(current, (int, float)):
        clip = clip.set_fps(fps)
        clip.fps = fps          # belt-and-suspenders: set the attribute directly too
    return clip


class JobCancelledException(Exception):
    """Raised when a video job is cancelled by the user"""
    pass


class VideoPipeline:

    def __init__(self, output_dir='uploads/outputs'):
        self.output_dir = os.path.abspath(output_dir)
        os.makedirs(self.output_dir, exist_ok=True)

        self.text_processor    = TextProcessor()
        self.tts_engine        = TTSEngine()
        self.face_processor    = FaceProcessor()
        self.lipsync_generator = LipSyncGenerator()
        self.face_animator     = FaceAnimator()

    def _update_progress(self, job_dir, pct, msg):
        """Write progress to a JSON file for the status poller"""
        try:
            with open(os.path.join(job_dir, 'progress.json'), 'w') as f:
                json.dump({'progress': pct, 'step': msg, 'timestamp': time.time()}, f)
        except:
            pass
        print(f"\n{'=' * 52}")
        print(f"[{pct:3d}%] {msg}")
        print(f"{'=' * 52}")

    # ─────────────────────────────────────────────────────────────────
    # MAIN PIPELINE
    # ─────────────────────────────────────────────────────────────────

    def process(self, ppt_path, face_path, options=None, job_id=None, check_cancelled=None):
        if options is None:
            options = {}
            
        def verify_not_cancelled():
            if check_cancelled and check_cancelled():
                print(f"🛑 RECOGNIZED: Job {job_id} was cancelled. Terminating pipeline.")
                raise JobCancelledException("Job was cancelled by the user")

        voice_id    = options.get('voice_id',    'edge_aria')
        slang_level = options.get('slang_level', 'medium')
        quality     = options.get('quality',     'medium')
        tts_engine  = options.get('tts_engine',  'edge')
        audio_path  = options.get('audio_path')

        if not job_id:
            job_id = f"{int(time.time())}_{os.path.splitext(os.path.basename(ppt_path))[0]}"
        
        job_dir  = os.path.join(self.output_dir, job_id)
        slides_dir = os.path.join(job_dir, 'slides')

        os.makedirs(job_dir,    exist_ok=True)
        os.makedirs(slides_dir, exist_ok=True)

        results: Dict[str, Any] = {
            'status': 'processing',
            'steps': {
                'extraction':    'pending',
                'preprocessing': 'pending',
                'script':        'pending',
                'audio':         'pending',
                'lipsync':       'pending',
                'finalization':  'pending',
            },
            'job_dir': job_dir
        }

        try:
            verify_not_cancelled()
            # ── STEP 1: PPT Extraction ─────────────────────────────
            self._update_progress(job_dir, 10, "Extracting PPT content")
            extractor  = PPTExtractor(ppt_path)
            slides_data = extractor.extract_text()
            if not slides_data:
                raise RuntimeError("No PPT content extracted")

            slide_images = extractor.export_slides_as_images(
                slides_dir, width=VIDEO_W, height=VIDEO_H
            )
            results['steps']['extraction'] = 'completed'

            # ── STEP 2: Face Preprocessing ─────────────────────────
            verify_not_cancelled()
            self._update_progress(job_dir, 20, "Preprocessing avatar (BG Removal)")
            is_valid, msg = self.face_processor.validate_image(face_path)
            if not is_valid:
                raise RuntimeError(msg)

            processed_face = os.path.join(job_dir, 'processed_face.png')
            processed_face = self.face_processor.preprocess_face(face_path, processed_face)
            if not processed_face or not os.path.exists(processed_face):
                raise RuntimeError("Face preprocessing failed")
            results['steps']['preprocessing'] = 'completed'

            # ── STEP 2.5: Face Animation (Eye Blink + Eyebrow + Head Motion) ──
            #  If the input was a static image (PNG), we pre-animate it into a
            #  video so Wav2Lip has a *moving* face to work with — giving us
            #  realistic eye blinks, eyebrow lifts and head micro-motion on top
            #  of the lip sync that Wav2Lip already provides.
            verify_not_cancelled()
            self._update_progress(job_dir, 28, "Generating facial animations")

            if processed_face.lower().endswith('.png'):
                print("\n[FaceAnimator] 🎭 Static image detected — animating face...")
                animated_face_path = os.path.join(job_dir, 'animated_face.mp4')

                # Estimate duration: ~35 s gives Wav2Lip plenty to loop from.
                # Use a slightly longer value to avoid hard loop artefacts.
                animated = self.face_animator.animate(
                    processed_face,
                    animated_face_path,
                    duration_sec=35,
                    fps=DEFAULT_FPS,
                )

                if animated and os.path.exists(animated):
                    print(f"  [FaceAnimator] ✅ Face animation complete — using animated video")
                    # Replace the static PNG with the animated MP4 for Wav2Lip
                    face_for_lipsync = animated
                else:
                    print("  [FaceAnimator] ⚠️  Animation failed — falling back to static image")
                    face_for_lipsync = processed_face
            else:
                # User uploaded a video — it already has natural motion, skip animation
                print("  [FaceAnimator] ℹ️  Video input detected — skipping face animation")
                face_for_lipsync = processed_face

            # ── STEP 3: Script Generation ──────────────────────────
            verify_not_cancelled()
            self._update_progress(job_dir, 35, "Generating narrations")
            scripts = self.text_processor.format_for_speech_per_slide(
                slides_data, slang_level)

            summary_text = self.text_processor.generate_summary(slides_data)
            summary_path = os.path.join(job_dir, 'summary.txt')
            with open(summary_path, 'w', encoding='utf-8') as f:
                f.write(summary_text)
            results['summary_path'] = summary_path

            # Calculate total characters in final script for logging
            total_script_chars = 0
            for s in scripts:
                # Extract spoken text from [SCENE START] blocks
                spoken = self.tts_engine._extract_text_from_script(s)
                total_script_chars += len(spoken)

            print(f"\n📝 SCRIPT GENERATION COMPLETE")
            print(f"   Number of slides: {len(slides_data)}")
            print(f"   Final script character count: {total_script_chars}")
            print(f"   (Includes intros, transitions, and ending messages)")

            script_path = os.path.join(job_dir, 'script.txt')
            with open(script_path, 'w', encoding='utf-8') as f:
                f.write('\n\n--- SLIDE BREAK ---\n\n'.join(scripts))
            results['script_path']        = script_path
            results['steps']['script']    = 'completed'

            # ── STEP 4: TTS Audio ──────────────────────────────────
            verify_not_cancelled()
            self._update_progress(job_dir, 50, "Synthesizing voice")
            audio_files = []
            for i, script in enumerate(scripts):
                verify_not_cancelled()
                audio_path = os.path.join(job_dir, f'audio_{i:03d}.wav')
                af = self.tts_engine.generate_audio_with_fallback(
                    script, audio_path, tts_engine, voice_id)
                if not af or not os.path.exists(af):
                    raise RuntimeError(f"TTS failed at slide {i + 1}")
                af = self.tts_engine.normalize_audio(af)
                audio_files.append(af)
                print(f"✅ Audio generated successfully with TTS for slide {i + 1}!")
            results['steps']['audio'] = 'completed'

            # ── STEP 5: LipSync ────────────────────────────────────
            verify_not_cancelled()
            self._update_progress(job_dir, 65, "Neural lip-syncing")
            lipsync_videos = []
            for i, audio in enumerate(audio_files):
                verify_not_cancelled()
                ls_out = os.path.join(job_dir, f'lipsync_{i:03d}.mp4')
                vp, msg = self.lipsync_generator.generate_video(
                    face_for_lipsync, audio, ls_out, quality=quality)
                if not vp or not os.path.exists(vp):
                    raise RuntimeError(f"Lip-sync failed for slide {i + 1}: {msg}")
                lipsync_videos.append(vp)
            results['steps']['lipsync'] = 'completed'

            # ── STEP 6: Final Composition ──────────────────────────
            verify_not_cancelled()
            self._update_progress(job_dir, 85, "Compositing HD video")

            final_clips  = []
            current_time = 0.0
            script_ts    = []
            subtitles    = [] # Tracking for live subtitles

            # Pre-load face mask to avoid re-loading for every slide
            face_mask_obj = None
            try:
                temp_face = ImageClip(processed_face)
                if temp_face.mask:
                    face_mask_obj = temp_face.mask
                temp_face.close()
            except Exception as e:
                print(f"  [WARN] Pre-loading face mask failed: {e}")

            for i, ls_vid in enumerate(lipsync_videos):
                # ── Load avatar clip ──
                avatar = VideoFileClip(ls_vid)

                # Fix missing FPS from Wav2Lip output efficiently without re-encoding to file
                if getattr(avatar, 'fps', None) is None or avatar.fps == 0:
                    avatar.fps = DEFAULT_FPS
                    avatar = avatar.set_fps(DEFAULT_FPS)

                avatar   = _force_fps(avatar)
                duration = float(avatar.duration or 0.0)
                if duration <= 0:
                    print(f"  [WARN] Clip {i} has zero duration, skipping...")
                    avatar.close()
                    continue

                # ── Timestamp for script ──
                mins, secs = int(current_time // 60), int(current_time % 60)
                script_ts.append(f"[{mins:02d}:{secs:02d}] {scripts[i]}")

                # ── Extract text for subtitles ──
                pure_text = self.tts_engine._extract_text_from_script(scripts[i])
                subtitles.append({
                    'start': current_time,
                    'duration': duration,
                    'text': pure_text
                })

                current_time += duration

                # ── Background ──
                if i < len(slide_images) and os.path.exists(slide_images[i]):
                    slide_clip = (ImageClip(slide_images[i])
                                  .set_duration(duration))
                    # Calculate scale to fit within VIDEO_W, VIDEO_H keeping aspect ratio
                    slide_w, slide_h = slide_clip.size
                    scale = min(VIDEO_W / slide_w, VIDEO_H / slide_h)
                    new_w, new_h = int(slide_w * scale), int(slide_h * scale)
                    slide_resized = slide_clip.resize((new_w, new_h))
                    
                    # Place it properly over a dark background to letterbox
                    base_bg = (ColorClip((VIDEO_W, VIDEO_H), color=(30, 30, 45))
                               .set_duration(duration))
                    bg = CompositeVideoClip([base_bg, slide_resized.set_position("center")])
                else:
                    bg = (ColorClip((VIDEO_W, VIDEO_H), color=(30, 30, 45))
                          .set_duration(duration))
                bg = _force_fps(bg)

                # ── Resize avatar ──
                avatar = avatar.resize(width=AVATAR_W)
                if avatar.h > VIDEO_H * 0.85:
                    avatar = avatar.resize(height=int(VIDEO_H * 0.85))

                ax = VIDEO_W - avatar.w - AVATAR_MARGIN
                ay = VIDEO_H - avatar.h - AVATAR_MARGIN

                # ── Apply Transparency Mask ──
                try:
                    if face_mask_obj:
                        # Resize cached mask to match current avatar size
                        m = face_mask_obj.set_duration(duration)
                        m = m.resize(height=avatar.h, width=avatar.w)
                        avatar = avatar.set_mask(m)
                    else:
                        avatar = avatar.fx(vfx.mask_color, color=[0,0,0], thr=10, s=5)
                except Exception as me:
                    print(f"  [WARN] Mask application failed: {me}")

                # ── Compose ──
                comp = CompositeVideoClip(
                    [bg, avatar.set_position((ax, ay))],
                    size=(VIDEO_W, VIDEO_H)
                )
                comp = _force_fps(comp)
                comp.fps = DEFAULT_FPS   # set attribute directly (moviepy 1.x quirk)

                if avatar.audio is not None:
                    comp = comp.set_audio(avatar.audio)

                final_clips.append(comp)

            # ── Update script file with timestamps ──
            with open(script_path, 'w', encoding='utf-8') as f:
                f.write('\n\n'.join(script_ts))

            # ── Save subtitles.json for the frontend ──
            try:
                import json
                subtitles_path = os.path.join(job_dir, 'subtitles.json')
                with open(subtitles_path, 'w', encoding='utf-8') as f:
                    json.dump(subtitles, f)
            except Exception as se:
                print(f"  [WARN] Could not save subtitles: {se}")

            # ── Concatenate ───────────────────────────────────────
            verify_not_cancelled()
            self._update_progress(job_dir, 95, "Assembling final clips")

            print(f"  [EXPORT] Found {len(final_clips)} composite clips. Starting concatenation...")
            # 'chain' is MUCH faster than 'compose' for clips of identical size
            final_video = concatenate_videoclips(final_clips, method="chain")
            final_video = _force_fps(final_video, DEFAULT_FPS)
            
            print(f"  [EXPORT] Final video assembled. Total duration: {final_video.duration:.2f}s, FPS: {final_video.fps}")

            # ── Combined narration WAV ────────────────────────────
            final_audio_path = os.path.join(job_dir, 'narration.wav')
            audios = [c.audio for c in final_clips if c.audio is not None]
            if audios:
                try:
                    concatenate_audioclips(audios).write_audiofile(
                        final_audio_path, logger=None, codec='pcm_s16le')
                except Exception as ae:
                    print(f"  [WARN] Could not write combined narration: {ae}")

            # ── Export ──────────────────────────────────────────────────
            verify_not_cancelled()
            output_file = os.path.join(job_dir, 'final_lesson.mp4')
            
            self._update_progress(job_dir, 98, "Compiling final MP4")
            print(f"  [EXPORT] Saving high-quality lesson MP4: {output_file}")
            print(f"  [EXPORT] This may take a minute based on lesson length...")
            
            final_video.fps = float(DEFAULT_FPS)
            final_video.write_videofile(
                output_file,
                fps=float(DEFAULT_FPS),
                codec='libx264',
                audio=True,
                audio_fps=44100,
                preset='ultrafast',
                audio_codec='aac',
                logger='bar',      # RE-ENABLED: Show progress bar in console as requested
                threads=8,         
                bitrate="8000k"    
            )
            
            # --- FINAL STEP ---
            self._update_progress(job_dir, 100, "Generation complete")
            print(f"\n{'*' * 60}")
            print(f"🌟 SUCCESS: EDUFACE VIDEO LESSON GENERATED 🌟")
            print(f"📍 LOCATION: {output_file}")
            print(f"🕒 DURATION: {final_video.duration:.2f} seconds")
            print(f"{'*' * 60}\n")
            
            # ── Cleanup ──────────────────────────────────────────
            for c in final_clips:
                try: c.close()
                except: pass
            try: final_video.close()
            except: pass

            results['status']                      = 'completed'
            results['final_video']                 = output_file
            results['steps']['finalization']       = 'completed'

        except JobCancelledException as jce:
            print(f"🛑 RECOGNIZED: Pipeline exited early for job {job_id}")
            results['status'] = 'cancelled'
            results['error']  = "Job cancelled by user"
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            results['status'] = 'error'
            results['error']  = str(e)

        return results

    # ─────────────────────────────────────────────────────────────────
    # AVAILABLE VOICES
    # ─────────────────────────────────────────────────────────────────

    def get_available_voices(self):
        try:
            return self.tts_engine.list_voices()
        except Exception as e:
            print(f"Voice error: {e}")
            return [
                {
                    'id':       'gtts_en',
                    'name':     'Google TTS (English)',
                    'engine':   'gtts',
                    'language': 'en',
                    'gender':   'Female',
                }
            ]