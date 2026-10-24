from PIL import Image

im = Image.open(r'C:\Users\silva\Documents\John Tavares\Projetos\go-parauapebas\web\bottom_left_preview.png')
w, h = im.size
print("Preview size:", w, h)

# In bottom_left_preview, the squircle icon is centered horizontally and in the upper part (above the word 'Trampou')
# Let's crop the squircle icon precisely
# Looking at the proportions, the squircle is roughly from y=30 to y=185, x=55 to x=210
icon_crop = im.crop((50, 30, 205, 185))
icon_crop.save(r'C:\Users\silva\Documents\John Tavares\Projetos\go-parauapebas\web\trampou_app_icon_exact.png')
print("Cropped icon saved with size:", icon_crop.size)
