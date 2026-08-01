import os
from PIL import Image

src_dir = 'C:/Users/ABC/OneDrive/Workings/MobileApp/HealthLogix/ScreenShots/iphone'
t_name = '13-inch-ipad'
t_size = (2064, 2752)
t_dir = os.path.join(src_dir, t_name)

os.makedirs(t_dir, exist_ok=True)

for f in os.listdir(src_dir):
    if f.endswith('.jpg') and os.path.isfile(os.path.join(src_dir, f)):
        src_path = os.path.join(src_dir, f)
        img = Image.open(src_path)
        
        img_w, img_h = img.size
        target_w, target_h = t_size
        
        # Calculate ratio to fit the entire image inside the iPad screen (padding with white/black)
        ratio = min(target_w / img_w, target_h / img_h)
        
        new_w = int(img_w * ratio)
        new_h = int(img_h * ratio)
        
        # Resize
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Create a new background image (let's use white padding for health app)
        new_img = Image.new('RGB', t_size, (255, 255, 255))
        
        # Center the resized image
        offset_w = (target_w - new_w) // 2
        offset_h = (target_h - new_h) // 2
        
        new_img.paste(img, (offset_w, offset_h))
        
        # Save
        new_img.save(os.path.join(t_dir, f), quality=100)
        print(f"Saved {f} to {t_name}")
