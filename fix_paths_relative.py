#!/usr/bin/env python3
import os
import re

def fix_paths_to_relative(directory):
    """Fix all asset paths to use relative paths instead of absolute"""
    
    patterns = [
        # Audio paths
        (re.compile(r"new Audio\('/wetcat-librarian/([^']+)'\)"), r"new Audio('\1')"),
        (re.compile(r"new Audio\('/([^']+)'\)"), r"new Audio('\1')"),
        
        # Image paths
        (re.compile(r"\.src = '/wetcat-librarian/([^']+)'"), r".src = '\1'"),
        (re.compile(r"\.src = '/([^']+)'"), r".src = '\1'"),
        
        # Video paths
        (re.compile(r"\.src = '/wetcat-librarian/([^']+\.mp4)'"), r".src = '\1'"),
    ]
    
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
                    
                    original_content = content
                    
                    # Apply all patterns
                    for pattern, replacement in patterns:
                        content = pattern.sub(replacement, content)
                    
                    # Write back if changed
                    if content != original_content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(content)
                        print(f"Fixed paths in: {filepath}")
                        files_modified += 1
                        
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")
    
    print(f"\nTotal files modified: {files_modified}")

if __name__ == "__main__":
    src_dir = "src"
    fix_paths_to_relative(src_dir)