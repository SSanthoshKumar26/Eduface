"""
FaceAnimator — Eduface AI (Hyper-Realistic Update)
Converts a static profile photo into a looping animated video featuring:
  • Organic Warp-Based Eye Blinking (Full and Partial, continuous random)
  • Eyebrow animation (Warp-based, NO overlay/drawing, existing eyebrows only)
  • Facial micro-expressions (Subtle cheek shifts, forehead tension)
  • Organic head micro-motion (breathing, nods)

All animations are mathematically calculated displacements (warps), 
preventing any duplicated features or painted elements.
"""

import cv2
import numpy as np
import os
import math
import random
import subprocess
import shutil

try:
    import mediapipe as mp
    MP_AVAILABLE = True
except Exception as e:
    print(f"⚠️ MediaPipe error: {e}")
    MP_AVAILABLE = False


class FaceAnimator:
    """
    Animate a static face image into a hyper-realistic looping face video.
    """

    L_EYE_TOP    = 159;  L_EYE_BOT   = 145
    R_EYE_TOP    = 386;  R_EYE_BOT   = 374
    L_BROW = [70, 63, 105, 66, 107]
    R_BROW = [336, 296, 334, 293, 300]
    CHEEK_L = 50; CHEEK_R = 280
    FOREHEAD_C = 10 

    def __init__(self):
        self._mp_ok = MP_AVAILABLE
        self._fmesh = mp.solutions.face_mesh if MP_AVAILABLE else None

    # ─────────────────────────────────────────────────────────────────────────
    # PUBLIC
    # ─────────────────────────────────────────────────────────────────────────

    def animate(self, image_path: str, output_path: str,
                duration_sec: float = 35, fps: int = 25) -> str | None:
        print(f"\n  [FaceAnimator] 🎬 Animating: {os.path.basename(image_path)}")

        img = self._load_bgr(image_path)
        if img is None: return None

        h, w = img.shape[:2]
        landmarks = self._detect_landmarks(img)

        if landmarks:
            print("  [FaceAnimator] 🎯 Facial landmarks detected — HD Organic Warp ON")
        else:
            print("  [FaceAnimator] ⚠️  No landmarks — head-bob fallback")

        blink_events = self._plan_blinks(duration_sec, fps)
        gaze_events  = self._plan_gaze_shifts(duration_sec, fps)
        total_frames = int(duration_sec * fps)
        print(f"  [FaceAnimator]    → {total_frames} frames | {len(blink_events)} blinks | {len(gaze_events)} gaze shifts planned")

        tmp = output_path.replace(".mp4", "_animraw.mp4")
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(tmp, fourcc, fps, (w, h))

        for fi in range(total_frames):
            frame = self._build_frame(img, fi, fps, landmarks, blink_events, gaze_events, h, w)
            writer.write(frame)

        writer.release()
        return self._reencode(tmp, output_path, fps)

    # ─────────────────────────────────────────────────────────────────────────
    # WARP ENGINE & MATH
    # ─────────────────────────────────────────────────────────────────────────

    def _add_warp_blob(self, flow_y, flow_x, cx, cy, dy, dx, radius_x, radius_y=None):
        """Creates a smooth radial displacement field (warp) at a target location."""
        if radius_y is None: radius_y = radius_x
        y1, y2 = max(0, cy - radius_y), min(flow_y.shape[0], cy + radius_y)
        x1, x2 = max(0, cx - radius_x), min(flow_y.shape[1], cx + radius_x)
        if x1 >= x2 or y1 >= y2: return
        
        gy, gx = np.mgrid[y1:y2, x1:x2]
        dist_sq = ((gx - cx)**2) / max(1, (radius_x * radius_x / 3.0)) + \
                  ((gy - cy)**2) / max(1, (radius_y * radius_y / 3.0))
        mask = np.exp(-dist_sq).astype(np.float32)
        
        if dy != 0: flow_y[y1:y2, x1:x2] += mask * dy
        if dx != 0: flow_x[y1:y2, x1:x2] += mask * dx

    def _build_frame(self, img, fi: int, fps: int, landmarks, blink_events, gaze_events, h: int, w: int):
        t = fi / fps

        # (1) Base Head Micro-Motion (Nods, breathing)
        bob_x = int(1.0 * math.sin(2 * math.pi * 0.12 * t))
        bob_y = int(0.6 * math.sin(2 * math.pi * 0.10 * t + 0.65))
        angle = 0.15 * math.sin(2 * math.pi * 0.08 * t + 0.30)

        M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
        M[0, 2] += bob_x
        M[1, 2] += bob_y
        frame = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

        if landmarks is None: return frame

        # (2) Displacement map setup
        flow_y = np.zeros((h, w), dtype=np.float32)
        flow_x = np.zeros((h, w), dtype=np.float32)

        # EYEBROWS: Micro movement (NO drawing/overlay, purely skin warping)
        brow_raise = 1.6 * math.sin(2 * math.pi * 0.05 * t + 1.2)   # Up/down emphasis
        brow_inward = 0.7 * math.sin(2 * math.pi * 0.03 * t + 0.5)  # Thinking inward tug
        for br_idxs, direction in [(self.L_BROW, 1), (self.R_BROW, -1)]:
            cx = int(np.mean([self._lm(landmarks, i, h, w)[0] for i in br_idxs]))
            cy = int(np.mean([self._lm(landmarks, i, h, w)[1] for i in br_idxs]))
            self._add_warp_blob(flow_y, flow_x, cx, cy, dy=brow_raise, dx=brow_inward * direction, 
                                radius_x=int(w * 0.12), radius_y=int(h * 0.08))

        # CHEEKS & FOREHEAD: Subtle breathing/talking tension
        cheek_move = 0.5 * math.sin(2 * math.pi * 0.15 * t)
        cl_x, cl_y = self._lm(landmarks, self.CHEEK_L, h, w)
        cr_x, cr_y = self._lm(landmarks, self.CHEEK_R, h, w)
        self._add_warp_blob(flow_y, flow_x, cl_x, cl_y, dy=cheek_move, dx=0, radius_x=w//6)
        self._add_warp_blob(flow_y, flow_x, cr_x, cr_y, dy=cheek_move, dx=0, radius_x=w//6)

        # EYE BLINKING (Continuous, smooth stretch warp)
        blink = self._blink_amount(fi, blink_events)
        if blink > 0.01:
            for top_i, bot_i in [(self.L_EYE_TOP, self.L_EYE_BOT), (self.R_EYE_TOP, self.R_EYE_BOT)]:
                tx, ty = self._lm(landmarks, top_i, h, w)
                bx, by = self._lm(landmarks, bot_i, h, w)
                eye_h = max(3, by - ty)
                
                # Eyelid drops down, stretches skin above it
                drop = eye_h * blink * 0.85
                lift = -eye_h * blink * 0.15
                
                rad_x = int(eye_h * 4.5)
                rad_y = int(eye_h * 3.0)
                
                self._add_warp_blob(flow_y, flow_x, tx, ty - int(eye_h*0.2), dy=drop, dx=0, radius_x=rad_x, radius_y=rad_y)
                self._add_warp_blob(flow_y, flow_x, bx, by + int(eye_h*0.2), dy=lift, dx=0, radius_x=rad_x, radius_y=rad_y)

        # (3) Discrete Gaze Shifts (Subtle pupil focus shifts)
        # Instead of simple oscillation, we use planned discrete movements
        gaze_x, gaze_y = self._get_gaze_shift(fi, gaze_events)
        
        for eye_indices in [[self.L_EYE_TOP, self.L_EYE_BOT], [self.R_EYE_TOP, self.R_EYE_BOT]]:
            ex = int(np.mean([self._lm(landmarks, i, h, w)[0] for i in eye_indices]))
            ey = int(np.mean([self._lm(landmarks, i, h, w)[1] for i in eye_indices]))
            
            # Warp radius for pupil area - very small and focused
            rad_pupil = int(w * 0.025) 
            self._add_warp_blob(flow_y, flow_x, ex, ey, dy=gaze_y, dx=gaze_x, radius_x=rad_pupil)

        # Apply the final mesh deformation
        grid_y, grid_x = np.mgrid[0:h, 0:w].astype(np.float32)
        # map_y = original_pixel_y - displacement to fetch skin from opposite direction of movement
        map_x = grid_x - flow_x
        map_y = grid_y - flow_y
        
        warped = cv2.remap(frame, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        return warped

    # ─────────────────────────────────────────────────────────────────────────
    # BLINK SCHEDULER & LOADERS
    # ─────────────────────────────────────────────────────────────────────────

    def _plan_blinks(self, duration_sec: float, fps: int):
        events = []
        total_f = int(duration_sec * fps)
        
        f = int(fps * random.uniform(1.0, 3.0)) # First blink 1~3 sec in
        while f < total_f - fps:
            # 80% chance of full blink, 20% partial blink/flutter
            amt = random.uniform(0.7, 1.0) if random.random() < 0.8 else random.uniform(0.3, 0.6)
            # Duration of closure: 0.08s (fast) to 0.15s (slower)
            half_f = max(2, int(fps * random.uniform(0.08, 0.15)))
            
            events.append((f - half_f, f, f + half_f, amt))
            # Next blink strictly 2 to 5 seconds later
            f += int(fps * random.uniform(2.0, 5.0))
            
        return events

    def _plan_gaze_shifts(self, duration_sec: float, fps: int):
        """
        Plans discrete gaze shifts:
        - Shift to a direction (left/right/slight up-down)
        - Hold (pause)
        - Return to center
        """
        events = []
        total_f = int(duration_sec * fps)
        
        f = int(fps * random.uniform(1.0, 4.0)) # First shift 1~4 sec in
        while f < total_f - (fps * 2):
            # Duration of the shift movement (slow and organic)
            move_dur = int(fps * random.uniform(0.6, 1.2))
            # Duration of the hold (pause)
            hold_dur = int(fps * random.uniform(0.8, 2.0))
            # Duration of return
            return_dur = int(fps * random.uniform(0.5, 1.0))
            
            # Gaze amplitude (extremely subtle)
            # 70% chance horizontal (left/right), 30% includes vertical
            amp_x = random.uniform(-1.2, 1.2)
            amp_y = random.uniform(-0.4, 0.4) if random.random() < 0.3 else 0.0
            
            events.append({
                'start': f,
                'peak': f + move_dur,
                'hold': f + move_dur + hold_dur,
                'end': f + move_dur + hold_dur + return_dur,
                'amp': (amp_x, amp_y)
            })
            
            # Delay until next shift (3 to 7 seconds)
            f = f + move_dur + hold_dur + return_dur + int(fps * random.uniform(3.0, 7.0))
            
        return events

    def _get_gaze_shift(self, fi: int, events) -> tuple[float, float]:
        """Calculates current (dx, dy) for gaze based on discrete events."""
        for ev in events:
            if ev['start'] <= fi <= ev['end']:
                # Move towards peak
                if fi < ev['peak']:
                    t = (fi - ev['start']) / (ev['peak'] - ev['start'])
                    ease = t * t * (3.0 - 2.0 * t) # smoothstep
                    return (ev['amp'][0] * ease, ev['amp'][1] * ease)
                # Hold at peak
                elif fi < ev['hold']:
                    return ev['amp']
                # Return to center
                else:
                    t = (fi - ev['hold']) / (ev['end'] - ev['hold'])
                    ease = 1.0 - (t * t * (3.0 - 2.0 * t))
                    return (ev['amp'][0] * ease, ev['amp'][1] * ease)
        return (0.0, 0.0)

    def _blink_amount(self, fi: int, events) -> float:
        amt_total = 0.0
        for (b_s, b_p, b_e, b_amt) in events:
            if b_s <= fi <= b_e:
                t = (fi - b_s) / max(1, b_p - b_s) if fi <= b_p else 1.0 - (fi - b_p) / max(1, b_e - b_p)
                ease = max(0.0, min(1.0, t * t * (3.0 - 2.0 * t))) # Smooth step curve
                amt_total += ease * b_amt
        return min(1.0, amt_total)

    def _load_bgr(self, path: str):
        img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        if img is None: return None
        if img.ndim == 3 and img.shape[2] == 4:
            alpha = img[:, :, 3:4].astype(np.float32) / 255.0
            bgr   = img[:, :, :3].astype(np.float32)
            white = np.full_like(bgr, 255, dtype=np.float32)
            img   = (bgr * alpha + white * (1.0 - alpha)).clip(0, 255).astype(np.uint8)
        elif img.ndim == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        return img

    def _detect_landmarks(self, img_bgr):
        if not self._mp_ok or self._fmesh is None: return None
        try:
            with self._fmesh.FaceMesh(static_image_mode=True, max_num_faces=1, 
                                      refine_landmarks=True, min_detection_confidence=0.35) as mesh:
                res = mesh.process(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
                if res.multi_face_landmarks: return res.multi_face_landmarks[0].landmark
        except: pass
        return None

    def _lm(self, landmarks, idx: int, h: int, w: int):
        lm = landmarks[idx]
        return (int(lm.x * w), int(lm.y * h))

    def _reencode(self, src: str, dst: str, fps: int) -> str | None:
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ffmpeg = os.path.join(backend_dir, "Wav2Lip", "ffmpeg.exe")
        if not os.path.exists(ffmpeg): ffmpeg = shutil.which("ffmpeg") or "ffmpeg"
        try:
            res = subprocess.run([ffmpeg, "-y", "-i", src, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(fps), "-movflags", "+faststart", dst],
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try: os.remove(src)
            except: pass
            if res.returncode == 0 and os.path.exists(dst): return dst
        except: pass
        if os.path.exists(src):
            os.rename(src, dst)
            return dst
        return None
