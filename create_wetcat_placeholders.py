from PIL import Image, ImageDraw, ImageFont
import os

# Create output directory
output_dir = "wetcat_assets"
os.makedirs(output_dir, exist_ok=True)

# Create WETCAT character sprites (simple placeholder)
def create_wetcat_sprite(filename, text):
    # Create a 256x256 image with transparent background
    img = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a simple wet cat shape
    # Body (oval)
    draw.ellipse([80, 100, 176, 200], fill=(100, 100, 200, 255), outline=(50, 50, 150, 255), width=3)
    
    # Head (circle)
    draw.ellipse([96, 60, 160, 124], fill=(120, 120, 220, 255), outline=(70, 70, 170, 255), width=3)
    
    # Ears (triangles)
    draw.polygon([(100, 80), (90, 60), (110, 70)], fill=(120, 120, 220, 255), outline=(70, 70, 170, 255))
    draw.polygon([(156, 80), (166, 60), (146, 70)], fill=(120, 120, 220, 255), outline=(70, 70, 170, 255))
    
    # Eyes
    draw.ellipse([110, 85, 120, 95], fill=(255, 255, 255, 255))
    draw.ellipse([136, 85, 146, 95], fill=(255, 255, 255, 255))
    draw.ellipse([113, 88, 117, 92], fill=(0, 0, 0, 255))
    draw.ellipse([139, 88, 143, 92], fill=(0, 0, 0, 255))
    
    # $ symbol on body
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 40)
    except:
        font = ImageFont.load_default()
    draw.text((115, 130), "$", fill=(255, 215, 0, 255), font=font)
    
    # Water drops
    for i in range(5):
        x = 90 + i * 20
        y = 210 + (i % 2) * 10
        draw.ellipse([x, y, x+8, y+12], fill=(100, 150, 255, 200))
    
    # Add text label
    draw.text((128, 230), text, fill=(255, 255, 255, 255), anchor="mm")
    
    img.save(os.path.join(output_dir, filename))
    print(f"Created: {filename}")

# Create character sprites
create_wetcat_sprite("wetcat_stand.png", "STAND")
create_wetcat_sprite("wetcat_walk1.png", "WALK1")
create_wetcat_sprite("wetcat_walk2.png", "WALK2")

# Create menu background
menu_bg = Image.new('RGB', (1280, 720), (20, 20, 50))
draw = ImageDraw.Draw(menu_bg)

# Add crypto-themed elements
for i in range(20):
    x = i * 64
    for j in range(12):
        y = j * 60
        # Draw dollar signs in background
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 30)
        except:
            font = ImageFont.load_default()
        draw.text((x, y), "$", fill=(50, 50, 100, 100), font=font)

# Add title
try:
    title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 80)
except:
    title_font = ImageFont.load_default()
    
draw.text((640, 200), "$WETCAT", fill=(255, 215, 0), font=title_font, anchor="mm")
draw.text((640, 300), "SURVIVORS", fill=(255, 255, 255), font=title_font, anchor="mm")

# Add "Get Soaked!" tagline
try:
    tag_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 40)
except:
    tag_font = ImageFont.load_default()
draw.text((640, 400), "Get Soaked in the Crypto Chaos!", fill=(100, 200, 255), font=tag_font, anchor="mm")

menu_bg.save(os.path.join(output_dir, "menu_background.jpg"))
print("Created: menu_background.jpg")

print(f"\nPlaceholder assets created in '{output_dir}' folder!")
print("\nTo use these assets:")
print("1. Copy wetcat_*.png to src/assets/sprites/")
print("2. Copy menu_background.jpg to assets/")
print("3. Update the game code to use the new sprites")