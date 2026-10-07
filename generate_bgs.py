import ascii_magic
from pillow_heif import register_heif_opener
register_heif_opener()

imgs = ['assets/bg1.jpg', 'assets/bg2.jpg', 'assets/bg3.heic', 'assets/bg4.jpg']
out_names = ['assets/bg_ascii_1.png', 'assets/bg_ascii_2.png', 'assets/bg_ascii_3.png', 'assets/bg_ascii_4.png']

for img_path, out_path in zip(imgs, out_names):
    try:
        art = ascii_magic.from_image(img_path)
        # Omit width_ratio so it uses default, and use very high columns
        art.to_image_file(out_path, columns=600, full_color=True, back='#0B0C10', enhance_image=True)
        print(f'Done {out_path}')
    except Exception as e:
        print(f'Error {img_path}: {e}')
