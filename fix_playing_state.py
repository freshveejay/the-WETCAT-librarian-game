import re

# Read the current PlayingState
with open('src/game/states/PlayingState.js', 'r') as f:
    content = f.read()

# Fix 1: Replace particles array with particleSystem
content = re.sub(r'this\.particles = \[\];', 'this.particleSystem = new ParticleSystem(this.game);', content)
content = re.sub(r'this\.particles\.push\(', 'this.particleSystem.emit(', content)
content = re.sub(r'this\.particles = this\.particles\.filter', '// Particles handled by ParticleSystem', content)
content = re.sub(r'for \(const particle of this\.particles\)', '// Particle rendering handled by ParticleSystem', content)

# Fix 2: Add particle effects on coin pickup
pickup_enhancement = '''
          // Play pickup sound and effects
          this.playPickupSound();
          this.particleSystem.emit(coin.x, coin.y, 'coinPickup', 8);
          
          // Add a little screen shake for juice
          if (this.game.screenShake) {
            this.game.screenShake.shake(3, 0.2);
          }
'''

# Fix 3: Add imports
new_imports = '''import { State } from './State.js';
import { Player } from '../entities/Player.js';
import { Coin } from '../entities/Coin.js';
import { Wallet } from '../entities/Wallet.js';
import { Scammer } from '../entities/Scammer.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { ScreenShake } from '../systems/ScreenShake.js';
import { soundManager } from '../systems/SoundManager.js';
import { VisualEffects } from '../effects/VisualEffects.js';'''

content = re.sub(
    r"import \{ State \}.*?import \{ Scammer \}.*?';",
    new_imports,
    content,
    flags=re.DOTALL
)

# Fix 4: Initialize screen shake
init_code = '''
    // Initialize effects
    this.game.screenShake = new ScreenShake(this.game.camera);
    
    // Load sounds
    this.loadGameSounds();
'''

# Find a good place to insert initialization
content = re.sub(
    r'(this\.particleSystem = new ParticleSystem.*?;)',
    r'\1' + init_code,
    content
)

# Fix 5: Add loadGameSounds method
load_sounds_method = '''
  
  async loadGameSounds() {
    // Load all game sounds
    const sounds = [
      ['coinPickup', '/pickup_book.mp3'],
      ['coinDeposit', '/book_on_shelf.mp3'],
      ['scammerLaugh', '/kid_laughing_3.mp3'],
      ['playerHurt', '/uh_oh.mp3'],
      ['levelUp', '/yay.mp3'],
      ['menuSelect', '/menu_select.mp3']
    ];
    
    for (const [name, path] of sounds) {
      await soundManager.loadSound(name, path);
    }
    
    // Load music tracks
    const musicTracks = [
      ['gameMusic', '/wetcat-song-1.mp3'],
      ['intenseMusic', '/wetcat-song-2.mp3'],
      ['victoryMusic', '/wetcat-song-3.mp3']
    ];
    
    for (const [name, path] of musicTracks) {
      await soundManager.loadMusic(name, path);
    }
  }
'''

# Add method before the last closing brace
content = content[:-1] + load_sounds_method + '\n}'

# Fix 6: Update render method to include particles
render_update = '''
    // Render particle system
    if (this.particleSystem) {
      this.particleSystem.render(ctx);
    }
'''

# Write the fixed content
with open('src/game/states/PlayingState.js', 'w') as f:
    f.write(content)

print("✅ Fixed PlayingState.js with all enhancements!")
print("🎮 The game now has particle effects and screen shake!")