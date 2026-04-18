import sys
from rembg import remove
from PIL import Image
import os

input_path = r'e:\eduf\eduf\backend\uploads\faces\1775019549_profile1.jpg'
output_path = r'e:\eduf\eduf\backend\uploads\faces\1775019549_profile1_transparent.png'

print(f"Processing {input_path}...")
try:
    with open(input_path, 'rb') as i:
        input_data = i.read()
        output_data = remove(input_data)
        with open(output_path, 'wb') as o:
            o.write(output_data)
    print(f"Success! Output saved to {output_path}")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
