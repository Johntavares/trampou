from PIL import Image
import os

img_path = r'C:\Users\silva\.gemini\antigravity-ide\brain\929c4a4a-63d1-4b67-ad6a-80809b7d2dde\.user_uploaded\media_1792866002455.jpg'
im = Image.open(img_path)
w, h = im.size
print("Original image size:", w, h)

web_dir = r'C:\Users\silva\Documents\John Tavares\Projetos\go-parauapebas\web'

# 1. Full Horizontal Logo (Top half: from y=0 to y=int(h * 0.52))
# Let's crop tightly around the logo
top_logo = im.crop((int(w * 0.05), int(h * 0.12), int(w * 0.95), int(h * 0.48)))
top_logo.save(os.path.join(web_dir, 'trampou_logo_horizontal.png'), 'PNG')
print("Saved trampou_logo_horizontal.png:", top_logo.size)

# 2. App Icon Squircle (Bottom left corner)
# Look at coordinates: x from 0.08 to 0.33, y from 0.58 to 0.86
app_icon = im.crop((int(w * 0.085), int(h * 0.59), int(w * 0.33), int(h * 0.845)))
app_icon.save(os.path.join(web_dir, 'trampou_app_icon.png'), 'PNG')
# Also save as favicon
favicon = app_icon.resize((64, 64), Image.Resampling.LANCZOS)
favicon.save(os.path.join(web_dir, 'favicon.png'), 'PNG')
print("Saved trampou_app_icon.png and favicon.png:", app_icon.size)

# 3. Pin Emblem with Yellow Helmet (Bottom right)
pin_colored = im.crop((int(w * 0.74), int(h * 0.63), int(w * 0.93), int(h * 0.86)))
pin_colored.save(os.path.join(web_dir, 'trampou_pin_colored.png'), 'PNG')
print("Saved trampou_pin_colored.png:", pin_colored.size)

# 4. White Pin on Purple Background (Bottom center)
pin_white = im.crop((int(w * 0.46), int(h * 0.63), int(w * 0.64), int(h * 0.86)))
pin_white.save(os.path.join(web_dir, 'trampou_pin_white.png'), 'PNG')
print("Saved trampou_pin_white.png:", pin_white.size)

# 5. Master Logo Board
im.save(os.path.join(web_dir, 'trampou_brand_guide.jpg'), 'JPEG', quality=95)
print("Saved trampou_brand_guide.jpg")
