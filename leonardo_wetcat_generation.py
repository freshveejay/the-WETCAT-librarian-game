#!/usr/bin/env python3
"""
Leonardo AI Asset Generator for WETCAT Survivors Game
Requires: LEONARDO_API_KEY environment variable
"""

import requests
import json
import time
import os
from datetime import datetime

# Leonardo AI API configuration
API_KEY = os.environ.get('LEONARDO_API_KEY', '')
BASE_URL = "https://cloud.leonardo.ai/api/rest/v1"

headers = {
    "accept": "application/json",
    "authorization": f"Bearer {API_KEY}",
    "content-type": "application/json"
}

def check_api_key():
    """Check if API key is set"""
    if not API_KEY:
        print("\n❌ ERROR: LEONARDO_API_KEY environment variable not set!")
        print("\nTo set it:")
        print("  Mac/Linux: export LEONARDO_API_KEY='your-key-here'")
        print("  Windows: set LEONARDO_API_KEY=your-key-here")
        print("\nGet your API key from: https://app.leonardo.ai/api-access")
        return False
    return True

def generate_image(prompt, width=512, height=512, num_images=1, model_id=None, preset_style="LEONARDO"):
    """Generate an image using Leonardo AI"""
    
    generation_url = f"{BASE_URL}/generations"
    
    # Use Leonardo Diffusion XL for high quality
    if not model_id:
        model_id = "1e60896f-3c26-4296-8ecc-53e2afecc132"  # Leonardo Diffusion XL
    
    payload = {
        "prompt": prompt,
        "negative_prompt": "blurry, low quality, text, watermark, signature",
        "modelId": model_id,
        "width": width,
        "height": height,
        "num_images": num_images,
        "presetStyle": preset_style,
        "public": False,
        "tiling": False,
        "guidance_scale": 7,
        "num_inference_steps": 30,
        "promptMagic": True,
        "controlNet": False,
        "highResolution": True
    }
    
    print(f"🎨 Generating: {prompt[:60]}...")
    response = requests.post(generation_url, json=payload, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Error creating generation: {response.status_code} - {response.text}")
        return None
        
    generation_data = response.json()
    generation_id = generation_data['sdGenerationJob']['generationId']
    
    print(f"⏳ Generation ID: {generation_id}")
    
    # Poll for completion
    while True:
        check_url = f"{BASE_URL}/generations/{generation_id}"
        response = requests.get(check_url, headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Error checking generation: {response.text}")
            return None
            
        data = response.json()
        status = data['generations_by_pk']['status']
        
        if status == 'COMPLETE':
            images = data['generations_by_pk']['generated_images']
            print(f"✅ Generation complete!")
            return images[0]['url'] if images else None
        elif status == 'FAILED':
            print("❌ Generation failed")
            return None
            
        print(f"⏳ Status: {status}...")
        time.sleep(2)

def download_image(url, filename):
    """Download image from URL"""
    try:
        response = requests.get(url)
        if response.status_code == 200:
            os.makedirs(os.path.dirname(filename), exist_ok=True)
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f"✅ Downloaded: {filename}")
            return True
    except Exception as e:
        print(f"❌ Download failed: {e}")
    return False

# Main execution
if __name__ == "__main__":
    if not check_api_key():
        exit(1)
    
    print("\n🚀 WETCAT SURVIVORS - Leonardo AI Asset Generator")
    print("=" * 50)
    
    # Define assets to generate
    assets = [
        # WETCAT Character Sprites
        {
            "name": "wetcat_stand",
            "path": "src/assets/sprites/wetcat_stand.png",
            "prompt": "pixel art sprite of a cute wet cat mascot character, anthropomorphic, wearing a purple hoodie with dollar sign, standing pose, facing left, transparent background, 16-bit retro game style, clean pixel art, no anti-aliasing",
            "width": 512,
            "height": 512,
            "style": "PIXEL_ART"
        },
        {
            "name": "wetcat_walk1",
            "path": "src/assets/sprites/wetcat_walk1.png",
            "prompt": "pixel art sprite of a cute wet cat mascot character, anthropomorphic, wearing a purple hoodie with dollar sign, walking pose with left foot forward, facing left, transparent background, 16-bit retro game style, clean pixel art, no anti-aliasing",
            "width": 512,
            "height": 512,
            "style": "PIXEL_ART"
        },
        {
            "name": "wetcat_walk2",
            "path": "src/assets/sprites/wetcat_walk2.png",
            "prompt": "pixel art sprite of a cute wet cat mascot character, anthropomorphic, wearing a purple hoodie with dollar sign, walking pose with right foot forward, facing left, transparent background, 16-bit retro game style, clean pixel art, no anti-aliasing",
            "width": 512,
            "height": 512,
            "style": "PIXEL_ART"
        },
        
        # Menu Background
        {
            "name": "menu_background",
            "path": "assets/menu_background.jpg",
            "prompt": "epic crypto trading floor with anthropomorphic wet cats as traders, multiple monitors showing crypto charts and meme coins, purple and gold neon lighting, rain effect with dollar bills falling, cyberpunk aesthetic, dramatic wide angle shot, highly detailed digital art",
            "width": 1280,
            "height": 720,
            "style": "DYNAMIC"
        },
        
        # Crypto Coin Sprite
        {
            "name": "crypto_coin",
            "path": "src/assets/sprites/coin.png",
            "prompt": "pixel art golden coin with dollar sign, spinning animation frame, glowing effect, transparent background, 16-bit retro game style, clean pixel art",
            "width": 512,
            "height": 512,
            "style": "PIXEL_ART"
        },
        
        # Crypto Wallet Sprite
        {
            "name": "crypto_wallet",
            "path": "src/assets/sprites/wallet.png",
            "prompt": "pixel art crypto wallet terminal, futuristic ATM design, purple and gold colors, glowing screen, 16-bit retro game style, isometric view",
            "width": 512,
            "height": 640,
            "style": "PIXEL_ART"
        },
        
        # Game Logo
        {
            "name": "game_logo",
            "path": "assets/wetcat_logo.png",
            "prompt": "$WETCAT SURVIVORS logo, wet dripping text effect, purple and gold gradient, dollar signs, epic game logo style, transparent background, highly detailed",
            "width": 1024,
            "height": 512,
            "style": "DYNAMIC"
        }
    ]
    
    print(f"\n📋 Generating {len(assets)} assets...")
    
    successful = 0
    failed = 0
    
    for i, asset in enumerate(assets, 1):
        print(f"\n[{i}/{len(assets)}] {asset['name']}")
        print("-" * 40)
        
        # Generate image
        image_url = generate_image(
            prompt=asset['prompt'],
            width=asset['width'],
            height=asset['height'],
            preset_style=asset.get('style', 'LEONARDO')
        )
        
        if image_url:
            # Download image
            if download_image(image_url, asset['path']):
                successful += 1
            else:
                failed += 1
        else:
            failed += 1
        
        # Rate limiting
        if i < len(assets):
            print("\n⏳ Waiting 3 seconds before next generation...")
            time.sleep(3)
    
    # Summary
    print("\n" + "=" * 50)
    print("🎉 GENERATION COMPLETE!")
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    
    if successful > 0:
        print("\n📁 Assets have been saved to their respective directories.")
        print("\n🎮 The game should now display the new WETCAT graphics!")
        print("\n💡 TIP: Clear your browser cache if you don't see the new assets.")
    
    print("\n🚀 To the moon with $WETCAT!")