from PIL import Image
import os

def remove_background(filepath, tolerance=50):
    """Remove background color and make it transparent"""
    if not os.path.exists(filepath):
        print(f"❌ File not found: {filepath}")
        return
    
    img = Image.open(filepath)
    img = img.convert("RGBA")
    
    # Get the background color from top-left corner
    bg_color = img.getpixel((0, 0))
    
    # Create a new image with transparency
    data = img.getdata()
    new_data = []
    
    for item in data:
        # Check if pixel is similar to background color
        if all(abs(item[i] - bg_color[i]) < tolerance for i in range(3)):
            # Make it transparent
            new_data.append((255, 255, 255, 0))
        else:
            # Keep the pixel
            new_data.append(item)
    
    img.putdata(new_data)
    img.save(filepath)
    print(f"✅ Fixed transparency for {filepath}")

# Fix transparency for all WETCAT sprites
sprites = [
    "public/sprites/wetcat_stand.png",
    "public/sprites/wetcat_walk1.png", 
    "public/sprites/wetcat_walk2.png",
    "src/assets/sprites/wetcat_stand.png",
    "src/assets/sprites/wetcat_walk1.png",
    "src/assets/sprites/wetcat_walk2.png"
]

for sprite in sprites:
    remove_background(sprite)

print("\n🎨 Transparency fixed for all WETCAT sprites!")