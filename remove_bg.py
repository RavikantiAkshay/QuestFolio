import os
from PIL import Image, ImageDraw

def process_image(filepath):
    print(f"Processing {filepath}")
    try:
        img = Image.open(filepath).convert("RGBA")
        datas = img.getdata()
        
        # Get color of top-left pixel to use as background key
        bg_color = datas[0]
        
        # If it's not a white-ish background, we might not want to blindly remove it, 
        # but let's assume the user meant all have a white bg.
        # We will check if the pixel is near white (R>200, G>200, B>200)
        
        new_data = []
        for item in datas:
            # item is (R, G, B, A)
            if item[0] > 230 and item[1] > 230 and item[2] > 230:
                # White-ish pixel, make transparent
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
                
        img.putdata(new_data)
        
        # Save over the original file
        img.save(filepath, "PNG")
    except Exception as e:
        print(f"Failed to process {filepath}: {e}")

if __name__ == "__main__":
    folder = "assets/images/items"
    for filename in os.listdir(folder):
        if filename.endswith(".png"):
            process_image(os.path.join(folder, filename))
