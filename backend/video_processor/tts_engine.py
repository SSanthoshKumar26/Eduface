import os
import time
import shutil
import re
import requests
import uuid
from gtts import gTTS
from pydub import AudioSegment
from pydub.effects import normalize


class TTSEngine:
    def __init__(self):
        self.supported_engines = ['edge', 'elevenlabs', 'gtts', 'pyttsx3']

        # ── FFmpeg detection (checks PATH, common install dirs, and local Wav2Lip copy) ──
        self.ffmpeg_path = shutil.which("ffmpeg") or shutil.which("ffmpeg.exe")

        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        candidates = [
            os.path.join(backend_dir, 'Wav2Lip', 'ffmpeg.exe'),
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        ]
        if not self.ffmpeg_path:
            for c in candidates:
                if os.path.exists(c):
                    self.ffmpeg_path = c
                    break

        if self.ffmpeg_path:
            # Tell pydub exactly where ffmpeg lives
            AudioSegment.converter = self.ffmpeg_path
            AudioSegment.ffmpeg   = self.ffmpeg_path
            AudioSegment.ffprobe  = self.ffmpeg_path.replace("ffmpeg", "ffprobe")
            # Also inject the directory into PATH so subprocess calls find it
            ffmpeg_dir = os.path.dirname(self.ffmpeg_path)
            if ffmpeg_dir not in os.environ["PATH"]:
                os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ["PATH"]
            print(f"  [SUCCESS] FFmpeg detected at: {self.ffmpeg_path}")
        else:
            print("  [WARNING] FFmpeg NOT FOUND. Edge/gTTS MP3→WAV conversion will fail.")
            print("            Download from https://ffmpeg.org/download.html and add to PATH.")
            print("            Download from https://ffmpeg.org/download.html and add to PATH.")

    def clone_voice(self, audio_file_path, name="Custom Presenter Voice"):
        """Clones a voice using ElevenLabs Instant Voice Cloning."""
        elevenlabs_key = os.getenv('ELEVENLABS_API_KEY')
        if not elevenlabs_key:
            print("[TTSEngine] ⚠️ No ElevenLabs API Key set — skipping voice cloning.")
            return None
            
        print(f"[TTSEngine] 🎙️ Cloning explicit identity from {os.path.basename(audio_file_path)}...")
        url = "https://api.elevenlabs.io/v1/voices/add"
        headers = {
            "xi-api-key": elevenlabs_key,
            "Accept": "application/json"
        }
        
        # Ensure a unique namespace for the cloned identity cache
        unique_name = f"{name}_{str(uuid.uuid4())[:8]}"
        data = {
            "name": unique_name,
            "description": "Auto-cloned custom voice identity via Eduface AI"
        }
        
        try:
            with open(audio_file_path, 'rb') as f:
                # API expects a tuple of (filename, bytes_stream, mimetype)
                files = [("files", (os.path.basename(audio_file_path), f, "audio/mpeg"))]
                response = requests.post(url, headers=headers, data=data, files=files)
                
            if response.status_code == 200:
                voice_id = response.json().get('voice_id')
                print(f"[TTSEngine] ✅ Voice identity successfully locked. Synth ID: {voice_id}")
                return f"elevenlabs_{voice_id}"
            else:
                print(f"[TTSEngine] ❌ Voice clone API rejected parameters: {response.text}")
                return None
        except Exception as e:
            print(f"[TTSEngine] ❌ Failed to invoke clone API over network: {str(e)}")
            return None

    # ─────────────────────────────────────────────────────────────────
    # PUBLIC: VOICE ROUTING & FALLBACK CHAIN
    # ─────────────────────────────────────────────────────────────────

    def generate_audio_with_fallback(self, text, output_path,
                                     preferred_engine='edge', voice_id='edge_aria'):
        spoken_text = self._extract_text_from_script(text)
        if not spoken_text or len(spoken_text.strip()) < 2:
            print("  ❌ Invalid text: too short or empty.")
            return None

        # Determine the "native" engine for the chosen voice
        target_engine = None
        if voice_id.startswith('edge_'):         target_engine = 'edge'
        elif voice_id.startswith('elevenlabs_') or voice_id.startswith('eleven_'):
            target_engine = 'elevenlabs'
        elif voice_id.startswith('pyttsx3_'):    target_engine = 'pyttsx3'

        # Build ordered fallback list
        engines_to_try = []
        if target_engine:
            engines_to_try.append(target_engine)
        for eng in ['edge', 'elevenlabs', 'gtts', 'pyttsx3']:
            if eng not in engines_to_try:
                engines_to_try.append(eng)

        print(f"\n🔊 Generating audio with fallback system...")
        print(f"   Voice ID: {voice_id}")
        print(f"   Preferred engine: {target_engine or preferred_engine}")

        for engine in engines_to_try:
            print(f"\n  Trying {engine.upper()}...")
            try:
                # Detect gender for appropriate fallback
                is_male = any(x in voice_id.lower() for x in ['guy', 'steffan', 'drew', 'clyde', 'david', 'male', 'man', 'boy', 'roger', 'ryan', 'william', 'christopher', 'eric', 'jacob', 'antoni', 'josh', 'adam', 'arnold'])
                is_female = not is_male # Default to female or existing logic
                
                # If we are falling back (engine != target_engine), pick a gender-matching default
                current_voice = voice_id if (target_engine == engine) else None
                fallback_voice = None
                
                if not current_voice:
                    if engine == 'edge':
                        fallback_voice = 'edge_guy' if is_male else 'edge_aria'
                    elif engine == 'elevenlabs':
                        fallback_voice = 'elevenlabs_josh' if is_male else 'elevenlabs_rachel'
                    elif engine == 'pyttsx3':
                        fallback_voice = 'pyttsx3_0' if is_male else 'pyttsx3_1'
                
                voice_to_use = current_voice or fallback_voice
                result = None

                if engine == 'edge':
                    if not self.ffmpeg_path:
                        print("  ⚠️  Skipping Edge TTS: FFmpeg not available for MP3→WAV")
                        continue
                    result = self.generate_audio_edge(spoken_text, output_path, voice_to_use or 'edge_aria')

                elif engine == 'elevenlabs':
                    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
                    if not api_key:
                        print("    [SKIP] ElevenLabs API key missing")
                        continue
                    result = self.generate_audio_elevenlabs(spoken_text, output_path, voice_to_use or 'elevenlabs_rachel')

                elif engine == 'gtts':
                    if not self.ffmpeg_path:
                        print("  ⚠️  Skipping gTTS: FFmpeg not available for MP3→WAV")
                        continue
                    result = self.generate_audio_gtts(spoken_text, output_path)

                elif engine == 'pyttsx3':
                    v_idx = 0 if is_male else 1
                    if voice_to_use and 'pyttsx3_' in voice_to_use:
                        try: v_idx = int(voice_to_use.split('_')[1])
                        except: v_idx = (0 if is_male else 1)
                    result = self.generate_audio_pyttsx3(spoken_text, output_path, v_idx)

                if result and os.path.exists(result):
                    print(f"  ✅ {engine.upper()} succeeded!")
                    return result

            except Exception as e:
                print(f"    [FAIL] {engine.upper()} error: {e}")

        print("\n❌ ALL TTS engines failed!")
        return None

    # ─────────────────────────────────────────────────────────────────
    # PRIVATE HELPERS
    # ─────────────────────────────────────────────────────────────────

    def _extract_text_from_script(self, text):
        if "TEXT:" not in text.upper():
            return text.strip()

        match = re.search(r'TEXT:\s*["\u201c]([^"\u201d]*?)["\u201d]',
                          text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()

        match = re.search(r'TEXT:\s*(.*?)(?=\n[A-Z]+:|\Z)',
                          text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip().strip('"').strip('\u201c').strip('\u201d').strip()

        return text.strip()

    def _mp3_to_wav(self, mp3_path, wav_path):
        """Convert mp3 → wav using pydub (requires ffmpeg)."""
        seg = AudioSegment.from_mp3(mp3_path)
        seg.export(wav_path, format='wav')
        if os.path.exists(mp3_path):
            os.remove(mp3_path)

    # ─────────────────────────────────────────────────────────────────
    # ENGINE IMPLEMENTATIONS
    # ─────────────────────────────────────────────────────────────────

    def generate_audio_edge(self, text, output_path, voice_id='edge_aria'):
        try:
            import asyncio
            import edge_tts
            voice_map = {
                'edge_aria':        'en-US-AriaNeural',
                'edge_jenny':       'en-US-JennyNeural',
                'edge_emma':        'en-US-EmmaNeural',
                'edge_guy':         'en-US-GuyNeural',
                'edge_steffan':     'en-US-SteffanNeural',
                'edge_christopher': 'en-US-ChristopherNeural',
                'edge_eric':        'en-US-EricNeural',
                'edge_roger':       'en-US-RogerNeural',
                'edge_william':     'en-AU-WilliamNeural',
                'edge_ryan':        'en-GB-RyanNeural',
            }
            edge_v = voice_map.get(voice_id, 'en-US-AriaNeural')
            print(f"  🎤 Using voice: {edge_v}")

            async def _gen():
                comm = edge_tts.Communicate(text, edge_v)
                tmp = output_path.replace('.wav', '_edge.mp3')
                await comm.save(tmp)
                self._mp3_to_wav(tmp, output_path)

            asyncio.run(_gen())
            return output_path if os.path.exists(output_path) else None
        except Exception as e:
            print(f"  ❌ Edge TTS failed: {e}")
            return None

    def generate_audio_gtts(self, text, output_path):
        """gTTS with retry logic."""
        max_retries = 3
        tmp = output_path.replace('.wav', '_gtts.mp3')
        print(f"  📝 Converting {len(text)} characters to speech...")
        print(f"     Preview: {text[:60]}...")

        for attempt in range(1, max_retries + 1):
            try:
                tts = gTTS(text=text, lang='en')
                tts.save(tmp)
                print("  🔄 Converting to WAV format...")
                self._mp3_to_wav(tmp, output_path)
                return output_path if os.path.exists(output_path) else None
            except Exception as e:
                print(f"  ⚠️  gTTS attempt {attempt} failed: {e}")
                if attempt < max_retries:
                    print(f"  🔄 Retry attempt {attempt + 1}/{max_retries}...")
                    time.sleep(1)
                else:
                    print("  ❌ All gTTS attempts failed")
                    # clean up partial mp3
                    if os.path.exists(tmp):
                        try: os.remove(tmp)
                        except: pass
        return None

    def generate_audio_pyttsx3(self, text, output_path, voice_idx=0):
        try:
            import pyttsx3
            print(f"  📝 Converting {len(text)} characters with pyttsx3...")
            engine = pyttsx3.init()
            voices = engine.getProperty('voices')
            if voice_idx < len(voices):
                engine.setProperty('voice', voices[voice_idx].id)
            engine.setProperty('rate', 150)
            tmp = output_path.replace('.wav', '_py.wav')
            engine.save_to_file(text, tmp)
            engine.runAndWait()
            try:   engine.stop()
            except: pass
            del engine
            time.sleep(0.5)
            if os.path.exists(tmp):
                shutil.move(tmp, output_path)
            print("  ✅ pyttsx3 succeeded!")
            return output_path if os.path.exists(output_path) else None
        except Exception as e:
            print(f"  ❌ pyttsx3 failed: {e}")
            return None

    def generate_audio_elevenlabs(self, text, output_path,
                                  voice_id='elevenlabs_rachel'):
        try:
            from elevenlabs.client import ElevenLabs
            api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
            if not api_key:
                print("    [SKIP] ElevenLabs API key missing")
                return None

            client = ElevenLabs(api_key=api_key)
            voice_map = {
                'elevenlabs_rachel': '21m00Tcm4TlvDq8ikWAM',
                'elevenlabs_drew':   '29vD33N1CtxCmqQRPOHJ',
                'elevenlabs_clyde':  '2EiwWnXFnvU5JabPnv8n',
                'elevenlabs_mim':    'EXAVITQu4vr4xnSDxMaL',
                'elevenlabs_josh':   'TxGEqn989ZiL49vS6f37',
                'elevenlabs_adam':   'pNInz6obpgDQGcFmaJgB',
                'elevenlabs_antoni': 'ErXw9S1qBy8WxqM7vByf',
                'elevenlabs_bella':  'aEO01A4mbXgrpjqS3S6F',
                'elevenlabs_arnold': 'VR6Aewyiyvcy65v81lV1',
            }
            vid = voice_map.get(voice_id, voice_id)
            print(f"  🎙️  Connecting to ElevenLabs API...")
            print(f"  📝 Synthesizing with voice: {vid}")

            audio_generator = client.text_to_speech.convert(
                text=text,
                voice_id=vid,
                model_id="eleven_multilingual_v2"
            )
            print("  💾 Saving audio stream...")
            with open(output_path, "wb") as f:
                for chunk in audio_generator:
                    if chunk:
                        f.write(chunk)
            return output_path if os.path.exists(output_path) else None

        except Exception as e:
            err_str = str(e)
            # 402 = paid plan required — log clearly and return None to fall through
            if '402' in err_str or 'payment_required' in err_str or 'paid_plan' in err_str:
                print("  ⚠️  ElevenLabs: Free plan cannot use library voices via API. "
                      "Falling back to next engine.")
            else:
                print(f"  ❌ ElevenLabs failed: {e}")
            return None

    # ─────────────────────────────────────────────────────────────────
    # AUDIO NORMALISATION
    # ─────────────────────────────────────────────────────────────────

    def normalize_audio(self, audio_path):
        try:
            print("  🔊 Normalizing audio...")
            audio = AudioSegment.from_wav(audio_path)
            normalized = normalize(audio)
            tmp = audio_path.replace('.wav', '_norm.wav')
            normalized.export(tmp, format='wav')
            os.remove(audio_path)
            os.rename(tmp, audio_path)
            print("  ✅ Audio normalized!")
            return audio_path
        except Exception as e:
            print(f"    [NORM ERROR] {e}")
            return audio_path

    # ─────────────────────────────────────────────────────────────────
    # VOICE LIST
    # ─────────────────────────────────────────────────────────────────

    def list_voices(self):
        voices = [
            # --- EDGE (Free, High Quality) ---
            {'id': 'edge_aria',        'name': 'Aria (Female, Soft)',       'engine': 'edge', 'gender': 'Female'},
            {'id': 'edge_jenny',       'name': 'Jenny (Female, Friendly)',   'engine': 'edge', 'gender': 'Female'},
            {'id': 'edge_emma',        'name': 'Emma (Female, Professional)', 'engine': 'edge', 'gender': 'Female'},
            {'id': 'edge_guy',         'name': 'Guy (Male, Corporate)',     'engine': 'edge', 'gender': 'Male'},
            {'id': 'edge_steffan',     'name': 'Steffan (Male, Narrator)',  'engine': 'edge', 'gender': 'Male'},
            {'id': 'edge_christopher', 'name': 'Christopher (Male, Formal)', 'engine': 'edge', 'gender': 'Male'},
            {'id': 'edge_eric',        'name': 'Eric (Male, Bright)',       'engine': 'edge', 'gender': 'Male'},
            {'id': 'edge_roger',       'name': 'Roger (Male, Deep)',        'engine': 'edge', 'gender': 'Male'},
            {'id': 'edge_ryan',        'name': 'Ryan (Male, British)',      'engine': 'edge', 'gender': 'Male'},
            {'id': 'edge_william',     'name': 'William (Male, Aussie)',    'engine': 'edge', 'gender': 'Male'},

            # --- ELEVENLABS (Premium, Hyper-Realistic) ---
            {'id': 'elevenlabs_rachel', 'name': 'Rachel (Female, Elegant)',   'engine': 'elevenlabs', 'gender': 'Female'},
            {'id': 'elevenlabs_bella',  'name': 'Bella (Female, Soft)',      'engine': 'elevenlabs', 'gender': 'Female'},
            {'id': 'elevenlabs_mim',    'name': 'Mim (Female, Sharp)',       'engine': 'elevenlabs', 'gender': 'Female'},
            {'id': 'elevenlabs_josh',   'name': 'Josh (Male, Deep/Bass)',    'engine': 'elevenlabs', 'gender': 'Male'},
            {'id': 'elevenlabs_adam',   'name': 'Adam (Male, Trustworthy)',  'engine': 'elevenlabs', 'gender': 'Male'},
            {'id': 'elevenlabs_antoni', 'name': 'Antoni (Male, Friendly)',   'engine': 'elevenlabs', 'gender': 'Male'},
            {'id': 'elevenlabs_arnold', 'name': 'Arnold (Male, Powerful)',   'engine': 'elevenlabs', 'gender': 'Male'},
            {'id': 'elevenlabs_drew',   'name': 'Drew (Male, Energetic)',    'engine': 'elevenlabs', 'gender': 'Male'},

            # --- SYSTEM (Offline) ---
            {'id': 'pyttsx3_1',    'name': 'Zira (Female, System)',     'engine': 'pyttsx3', 'gender': 'Female'},
            {'id': 'pyttsx3_0',    'name': 'David (Male, System)',      'engine': 'pyttsx3', 'gender': 'Male'},
            {'id': 'gtts_en',      'name': 'Google (Neutral/AI)',       'engine': 'gtts', 'gender': 'Female'},
        ]
        return voices