#!/usr/bin/env python3
import os
import re

def fix_audio_paths(directory):
    """Fix all audio paths to include /wetcat-librarian/ prefix"""
    
    # Pattern to match new Audio('/...')
    audio_pattern = re.compile(r"new Audio\('(/[^']+)'\)")
    
    files_modified = 0
    
    for root, dirs, files in os.walk(directory):
        # Skip node_modules and other directories
        if 'node_modules' in root or '.git' in root:
            continue
            
        for file in files:
            if file.endswith('.js'):
                filepath = os.path.join(root, file)
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Find all audio paths
                    original_content = content
                    
                    def replace_audio(match):
                        path = match.group(1)
                        # Skip if already has wetcat-librarian prefix
                        if path.startswith('/wetcat-librarian/'):
                            return match.group(0)
                        # Add prefix
                        return f"new Audio('/wetcat-librarian{path}')"
                    
                    content = audio_pattern.sub(replace_audio, content)
                    
                    # Write back if changed
                    if content != original_content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(content)
                        print(f"Fixed audio paths in: {filepath}")
                        files_modified += 1
                        
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")
    
    print(f"\nTotal files modified: {files_modified}")

if __name__ == "__main__":
    src_dir = "src"
    fix_audio_paths(src_dir)