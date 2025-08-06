from PIL import Image
import os

# Resize the character sprites to game-appropriate sizes
sprites_to_resize = [
    ("src/assets/sprites/wetcat_stand.png", 64, 80),
    ("src/assets/sprites/wetcat_walk1.png", 64, 80),
    ("src/assets/sprites/wetcat_walk2.png", 64, 80),
    ("src/assets/sprites/coin.png", 32, 32),
    ("src/assets/sprites/wallet.png", 96, 120)
]

for filepath, new_width, new_height in sprites_to_resize:
    if os.path.exists(filepath):
        img = Image.open(filepath)
        # Use high-quality resampling for pixel art
        resized = img.resize((new_width, new_height), Image.NEAREST)
        resized.save(filepath)
        print(f"✅ Resized {filepath} to {new_width}x{new_height}")
    else:
        print(f"❌ File not found: {filepath}")

print("\n🎮 Sprites resized for optimal game display!")