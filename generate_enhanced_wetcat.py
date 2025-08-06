#!/usr/bin/env python3
"""
Enhanced WETCAT Asset Generator - Alpha Mode
Creates perfect pixel art sprites with proper transparency
"""

import requests
import json
import time
import os
from PIL import Image, ImageDraw
from datetime import datetime

API_KEY = os.environ.get('LEONARDO_API_KEY', 'ac943cf8-5b69-4d04-a444-fba513063c4c')
BASE_URL = "https://cloud.leonardo.ai/api/rest/v1"

headers = {
    "accept": "application/json",
    "authorization": f"Bearer {API_KEY}",
    "content-type": "application/json"
}

def generate_leonardo_image(prompt, width=512, height=512):
    """Generate image with Leonardo AI"""
    generation_url = f"{BASE_URL}/generations"
    
    # Use pixel art model
    model_id = "d69c8273-6b17-4a30-a13e-d6637ae1c644"  # 8-bit Diffusion model
    
    payload = {
        "prompt": prompt + ", transparent background, clean edges, no background",
        "negative_prompt": "blurry, anti-aliasing, gradient, realistic, photograph, complex background, gray background",
        "modelId": model_id,
        "width": width,
        "height": height,
        "num_images": 1,
        "num_inference_steps": 30,
        "guidance_scale": 7,
        "scheduler": "LEONARDO",
        "public": False,
        "tiling": False,
        "controlNet": False,
        "transparentBackground": True  # Request transparent background
    }
    
    print(f"🎨 Generating: {prompt[:50]}...")
    response = requests.post(generation_url, json=payload, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Error: {response.status_code}")
        return None
        
    generation_data = response.json()
    generation_id = generation_data['sdGenerationJob']['generationId']
    
    # Poll for completion
    while True:
        check_url = f"{BASE_URL}/generations/{generation_id}"
        response = requests.get(check_url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            status = data['generations_by_pk']['status']
            
            if status == 'COMPLETE':
                images = data['generations_by_pk']['generated_images']
                return images[0]['url'] if images else None
            elif status == 'FAILED':
                return None
                
        time.sleep(2)

def process_sprite(url, output_path, target_size):
    """Download and process sprite with transparency"""
    response = requests.get(url)
    if response.status_code != 200:
        return False
    
    # Save original
    temp_path = output_path + '.temp.png'
    with open(temp_path, 'wb') as f:
        f.write(response.content)
    
    # Open and process
    img = Image.open(temp_path)
    img = img.convert("RGBA")
    
    # Enhanced background removal
    data = img.getdata()
    new_data = []
    
    # Sample background colors from corners
    bg_samples = [
        img.getpixel((0, 0)),
        img.getpixel((img.width-1, 0)),
        img.getpixel((0, img.height-1)),
        img.getpixel((img.width-1, img.height-1))
    ]
    
    for item in data:
        # Check if pixel matches any background sample
        is_bg = any(all(abs(item[i] - bg[i]) < 30 for i in range(3)) for bg in bg_samples)
        
        if is_bg or item[3] < 50:  # Also remove semi-transparent pixels
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    
    # Resize with nearest neighbor for pixel art
    img = img.resize(target_size, Image.NEAREST)
    
    # Save final sprite
    img.save(output_path)
    os.remove(temp_path)
    
    print(f"✅ Processed: {output_path}")
    return True

# Enhanced WETCAT sprites
print("\n🚀 WETCAT ALPHA MODE - Enhanced Sprite Generation")
print("=" * 50)

sprites = [
    {
        "name": "wetcat_stand",
        "prompt": "pixel art cute wet cat character, purple hoodie with dollar sign, standing idle pose, facing left, full body, 16-bit style sprite, clear outline",
        "size": (64, 80)
    },
    {
        "name": "wetcat_walk1", 
        "prompt": "pixel art cute wet cat character, purple hoodie with dollar sign, walking left foot forward, facing left, full body, 16-bit style sprite, clear outline",
        "size": (64, 80)
    },
    {
        "name": "wetcat_walk2",
        "prompt": "pixel art cute wet cat character, purple hoodie with dollar sign, walking right foot forward, facing left, full body, 16-bit style sprite, clear outline", 
        "size": (64, 80)
    },
    {
        "name": "wetcat_sprint",
        "prompt": "pixel art cute wet cat character, purple hoodie with dollar sign, running fast pose with motion lines, facing left, full body, 16-bit style sprite",
        "size": (64, 80)
    }
]

for sprite in sprites:
    url = generate_leonardo_image(sprite["prompt"])
    if url:
        # Save to both locations
        for path in [f"public/sprites/{sprite['name']}.png", f"src/assets/sprites/{sprite['name']}.png"]:
            process_sprite(url, path, sprite["size"])
    time.sleep(3)

# Also generate particle effects
print("\n🎨 Generating particle effects...")

particles = [
    {
        "name": "dollar_particle",
        "prompt": "pixel art golden dollar sign, glowing, small sprite for particle effect, 16-bit style",
        "size": (16, 16)
    },
    {
        "name": "splash_particle",
        "prompt": "pixel art water droplet splash, blue, small sprite for particle effect, 16-bit style",
        "size": (16, 16)
    }
]

for particle in particles:
    url = generate_leonardo_image(particle["prompt"], 512, 512)
    if url:
        for path in [f"public/sprites/{particle['name']}.png", f"src/assets/sprites/{particle['name']}.png"]:
            process_sprite(url, path, particle["size"])
    time.sleep(3)

print("\n✨ WETCAT ALPHA MODE COMPLETE!")
print("🎮 Enhanced sprites generated with proper transparency!")
print("🚀 Game should now have perfect pixel art!")