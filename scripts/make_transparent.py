from PIL import Image
import os

web_dir = r'C:\Users\silva\Documents\John Tavares\Projetos\go-parauapebas\web'
logo_path = os.path.join(web_dir, 'trampou_logo_horizontal.png')
im = Image.open(logo_path).convert('RGBA')

datas = list(im.getdata())
new_data = []
for item in datas:
    if item[0] > 238 and item[1] > 238 and item[2] > 230:
        new_data.append((255, 255, 255, 0))
    else:
        new_data.append(item)

im.putdata(new_data)
im.save(os.path.join(web_dir, 'trampou_logo_transparent.png'), 'PNG')
print("Saved trampou_logo_transparent.png")

pin_path = os.path.join(web_dir, 'trampou_pin_colored.png')
pin_im = Image.open(pin_path).convert('RGBA')
pin_datas = list(pin_im.getdata())
pin_new = []
for item in pin_datas:
    if item[0] > 235 and item[1] > 235 and item[2] > 225:
        pin_new.append((255, 255, 255, 0))
    else:
        pin_new.append(item)
pin_im.putdata(pin_new)
pin_im.save(os.path.join(web_dir, 'trampou_pin_transparent.png'), 'PNG')
print("Saved trampou_pin_transparent.png")
