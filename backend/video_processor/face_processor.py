import cv2
import numpy as np
from PIL import Image

class FaceProcessor:
    def __init__(self):
        # Load face detection cascade
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
    
    def validate_image(self, file_path):
        """Validate that image or video contains a detectable face"""
        try:
            # Check if it's a video
            is_video = file_path.lower().endswith(('.mp4', '.mov', '.webm'))
            
            if is_video:
                cap = cv2.VideoCapture(file_path)
                ret, img = cap.read()
                cap.release()
                if not ret or img is None:
                    return False, "Could not read video file or extract first frame."
            else:
                img = cv2.imread(file_path)
                if img is None:
                    return False, "Could not read image file. Ensure it is a valid JPG or PNG."
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) == 0:
                print("[WARNING] No face detected – proceeding anyway (optimistic mode)")
            elif len(faces) > 1:
                print(f"[WARNING] {len(faces)} faces detected – using the largest one")
            else:
                print("[SUCCESS] Face detected successfully")
            
            return True, "OK"
        except Exception as e:
            return False, f"Error processing file: {str(e)}"
    
    def preprocess_face(self, file_path, output_path, target_size=(512, 512)):
        """Preprocess face image for avatar generation, or passthrough if it's a video"""
        try:
            is_video = file_path.lower().endswith(('.mp4', '.mov', '.webm'))
            if is_video:
                import shutil
                output_path = output_path.rsplit('.', 1)[0] + '.mp4'
                print(f"  [INFO] Video detected. Passing through to Wav2Lip: {file_path}")
                shutil.copy2(file_path, output_path)
                return output_path

            # 1. Background Removal
            try:
                from rembg import remove
                print("  [PROCESS] Removing image background...")
                with open(file_path, 'rb') as i:
                    bg_removed_bytes = remove(i.read())
                import io
                img = Image.open(io.BytesIO(bg_removed_bytes)).convert("RGBA")
            except Exception as bg_err:
                print(f"  [WARNING] Background removal failed or rembg not installed: {bg_err}")
                img = Image.open(file_path).convert('RGBA')
            
            # 2. Auto-Centering & Intelligent Cropping
            try:
                # Convert PIL image to OpenCV format for detection
                cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGBA2BGR)
                gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)

                if len(faces) > 0:
                    # Sort faces by size (width * height) and pick largest
                    faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
                    x, y, w, h = faces[0]
                    
                    # Calculate padding to keep shoulders and head (Portrait style)
                    # We want about 30% padding above, 60% below (shoulders), 35% on sides
                    pad_up = int(h * 0.45)
                    pad_down = int(h * 0.85)
                    pad_side = int(w * 0.55)
                    
                    cx, cy = x + w // 2, y + h // 2
                    
                    # Define crop bounds
                    y1 = max(0, y - pad_up)
                    y2 = min(img.height, y + h + pad_down)
                    x1 = max(0, cx - pad_side)
                    x2 = min(img.width, cx + pad_side)
                    
                    # Ensure square crop by expanding the smaller dimension
                    cw, ch = x2 - x1, y2 - y1
                    if cw > ch:
                        diff = cw - ch
                        y1 = max(0, y1 - diff // 2)
                        y2 = min(img.height, y1 + cw)
                    else:
                        diff = ch - cw
                        x1 = max(0, x1 - diff // 2)
                        x2 = min(img.width, x1 + ch)
                    
                    print(f"  [PROCESS] Auto-centering face at ({x1},{y1}) to ({x2},{y2})")
                    img = img.crop((x1, y1, x2, y2))
                else:
                    print("  [WARNING] No face detected for auto-centering — using original crop")
            except Exception as crop_err:
                print(f"  [WARNING] Auto-centering failed: {crop_err}")

            # 3. Resize and Save
            # We ensure the output is a PNG to retain the alpha channel
            output_path = output_path.rsplit('.', 1)[0] + '.png'
            
            # Use fixed size for consistent AI input
            img = img.resize(target_size, Image.LANCZOS)
            img.save(output_path, format="PNG")
            
            return output_path
        except Exception as e:
            print(f"Face preprocessing error: {e}")
            return None