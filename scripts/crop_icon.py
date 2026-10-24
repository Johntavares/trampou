from PIL import Image
import os

img_path = r'C:\Users\silva\.gemini\antigravity-ide\brain\929c4a4a-63d1-4b67-ad6a-80809b7d2dde\.user_uploaded\media_1792865537218.png'
im = Image.open(img_path)
print("Image size:", im.size)

# Bottom half of the image contains 3 variations:
# 1. Left: squircle icon on gradient/blur background with text "Trampou" below
# 2. Middle: purple square with white emblem
# 3. Right: white square with purple/yellow/green emblem

w, h = im.size
# Let's crop the bottom left area
# In the image, the top half is the full logo, bottom half is divided in 3 columns
bottom_left = im.crop((0, int(h * 0.58), int(w * 0.35), h))
bottom_left.save(r'C:\Users\silva\Documents\John Tavares\Projetos\go-parauapebas\web\bottom_left_preview.png')
print("Saved bottom_left_preview.png with size:", bottom_left.size)
