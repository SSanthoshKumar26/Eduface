import os
from ppt_extractor import PPTExtractor

ppt_path = "uploads/ppts/1774803378_nextjs.pptx"
output_dir = "uploads/outputs/test_slides"

print(f"Testing extraction for: {ppt_path}")
extractor = PPTExtractor(ppt_path)
images = extractor.export_slides_as_images(output_dir)

print(f"Output images: {len(images)}")
for img in images:
    print(img)
