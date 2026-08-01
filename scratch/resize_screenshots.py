import os
from PIL import Image

src_dir = 'C:/Users/ABC/OneDrive/Workings/MobileApp/HealthLogix/ScreenShots/iphone'
targets = {
    '6.5-inch': (1284, 2778),
    '5.5-inch': (1242, 2208)
}

def process_images():
    for t_name, t_size in targets.items():
        t_dir = os.path.join(src_dir, t_name)
        os.makedirs(t_dir, exist_ok=True)
        
        for f in os.listdir(src_dir):
            if f.endswith('.jpg') and os.path.isfile(os.path.join(src_dir, f)):
                src_path = os.path.join(src_dir, f)
                img = Image.open(src_path)
                
                img_w, img_h = img.size
                target_w, target_h = t_size
                
                # Calculate ratio for center cropping to fill the target size
                ratio_w = target_w / img_w
                ratio_h = target_h / img_h
                ratio = max(ratio_w, ratio_h)
                
                new_w = int(img_w * ratio)
                new_h = int(img_h * ratio)
                
                # Resize
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                
                # Center crop
                left = (new_w - target_w) / 2
                top = (new_h - target_h) / 2
                right = (new_w + target_w) / 2
                bottom = (new_h + target_h) / 2
                
                img = img.crop((left, top, right, bottom))
                
                # Convert to RGB just in case
                img = img.convert('RGB')
                
                # Save
                img.save(os.path.join(t_dir, f), quality=100)
                print(f"Saved {f} to {t_name} with dimensions {t_size}")

if __name__ == '__main__':
    process_images()
