import requests
import json
import time
import os
from datetime import datetime

# Leonardo AI API configuration
API_KEY = os.environ.get('LEONARDO_API_KEY', '')
if not API_KEY:
    print("Please set LEONARDO_API_KEY environment variable")
    exit(1)

BASE_URL = "https://cloud.leonardo.ai/api/rest/v1"

headers = {
    "accept": "application/json",
    "authorization": f"Bearer {API_KEY}",
    "content-type": "application/json"
}

def generate_image(prompt, preset_style="ANIME", width=512, height=512, num_images=1):
    """Generate an image using Leonardo AI"""
    
    # Create generation
    generation_url = f"{BASE_URL}/generations"
    
    payload = {
        "prompt": prompt,
        "modelId": "6bef9f1b-29cb-40c7-b9df-32b51c1f67d3",  # Leonardo Anime XL
        "width": width,
        "height": height,
        "num_images": num_images,
        "presetStyle": preset_style,
        "promptMagic": True,
        "public": False
    }
    
    response = requests.post(generation_url, json=payload, headers=headers)
    
    if response.status_code != 200:
        print(f"Error creating generation: {response.text}")
        return None
        
    generation_data = response.json()
    generation_id = generation_data['sdGenerationJob']['generationId']
    
    print(f"Generation started with ID: {generation_id}")
    
    # Poll for completion
    while True:
        check_url = f"{BASE_URL}/generations/{generation_id}"
        response = requests.get(check_url, headers=headers)
        
        if response.status_code != 200:
            print(f"Error checking generation: {response.text}")
            return None
            
        data = response.json()
        status = data['generations_by_pk']['status']
        
        if status == 'COMPLETE':
            images = data['generations_by_pk']['generated_images']
            return images[0]['url'] if images else None
        elif status == 'FAILED':
            print("Generation failed")
            return None
            
        print(f"Status: {status}... waiting")
        time.sleep(2)

def download_image(url, filename):
    """Download image from URL"""
    response = requests.get(url)
    if response.status_code == 200:
        with open(filename, 'wb') as f:
            f.write(response.content)
        print(f"Downloaded: {filename}")
        return True
    return False

# Generate WETCAT-themed assets
print("Generating WETCAT-themed game assets...")

assets_to_generate = [
    {
        "name": "wetcat_hero_stand",
        "prompt": "cute anthropomorphic wet cat character, crypto themed, wearing a cool hoodie with dollar signs, pixelated 16-bit retro game sprite, side view, standing pose, transparent background, chibi style",
        "width": 256,
        "height": 256
    },
    {
        "name": "wetcat_hero_walk1", 
        "prompt": "cute anthropomorphic wet cat character, crypto themed, wearing a cool hoodie with dollar signs, pixelated 16-bit retro game sprite, side view, walking pose left foot forward, transparent background, chibi style",
        "width": 256,
        "height": 256
    },
    {
        "name": "wetcat_hero_walk2",
        "prompt": "cute anthropomorphic wet cat character, crypto themed, wearing a cool hoodie with dollar signs, pixelated 16-bit retro game sprite, side view, walking pose right foot forward, transparent background, chibi style", 
        "width": 256,
        "height": 256
    },
    {
        "name": "wetcat_menu_background",
        "prompt": "epic crypto trading floor scene with wet cats trading memecoins, digital rain of dollar signs and crypto symbols, neon purple and gold color scheme, cyberpunk aesthetic, dramatic lighting, wide shot",
        "width": 1024,
        "height": 768,
        "preset_style": "DYNAMIC"
    },
    {
        "name": "wetcat_game_logo",
        "prompt": "$WETCAT SURVIVORS text logo, dripping wet effect, neon glow, crypto themed with dollar signs, epic game logo style, transparent background",
        "width": 512,
        "height": 256,
        "preset_style": "DYNAMIC"
    }
]

# Create output directory
output_dir = "generated_assets"
os.makedirs(output_dir, exist_ok=True)

for asset in assets_to_generate:
    print(f"\nGenerating: {asset['name']}...")
    
    image_url = generate_image(
        prompt=asset['prompt'],
        preset_style=asset.get('preset_style', 'ANIME'),
        width=asset['width'],
        height=asset['height']
    )
    
    if image_url:
        filename = os.path.join(output_dir, f"{asset['name']}.png")
        if download_image(image_url, filename):
            print(f"Successfully generated {asset['name']}")
        else:
            print(f"Failed to download {asset['name']}")
    else:
        print(f"Failed to generate {asset['name']}")
    
    # Be nice to the API
    time.sleep(3)

print("\nAsset generation complete! Check the 'generated_assets' folder.")
print("\nTo use these assets:")
print("1. Review the generated images")
print("2. Copy the wetcat_hero sprites to src/assets/sprites/")
print("3. Update the menu background video/image")
print("4. Update the game code to use the new sprites")