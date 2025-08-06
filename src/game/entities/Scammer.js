import { Entity } from './Entity.js';

export class Scammer extends Entity {
  constructor(game, x, y, config) {
    super(x, y, 36, 48); // Same size as original kids
    this.game = game;

    // Configuration
    this.config = config;
    this.aggression = config.aggression || 1;
    this.variant = config.variant || 1; // Visual variant (1-3)

    // Movement
    this.baseSpeed = 40 + (this.aggression * 20); // 40-100 pixels/second
    this.currentSpeed = this.baseSpeed;
    this.wanderTimer = 0;
    this.wanderDuration = 2 + Math.random() * 2;
    this.wanderDirection = { x: 0, y: 0 };

    // Behavior states
    this.state = 'wander'; // wander, seeking, stealing, fleeing
    this.stateTimer = 0;
    this.target = null; // Target wallet or coin

    // Stealing
    this.stealCooldown = 0;
    this.carriedCoins = [];
    this.maxCarry = 2 + this.aggression; // 3-5 coins based on aggression

    // Player interaction
    this.isRepelled = false;
    this.repelVelocity = { x: 0, y: 0 };

    // Animation
    this.facing = 'down';
    this.animationTimer = 0;
    this.animationFrame = 0;
    this.isMoving = false;

    // Collision box
    this.collisionBox = {
      offsetX: 8,
      offsetY: 16,
      width: 20,
      height: 28
    };

    // Visual effects
    this.glowColor = null;
    this.messageTimer = 0;
    this.currentMessage = null;

    // Sound cooldown
    this.soundCooldown = 0;
  }

  update(deltaTime) {
    // Update timers
    this.stateTimer += deltaTime;
    this.stealCooldown = Math.max(0, this.stealCooldown - deltaTime);
    this.soundCooldown = Math.max(0, this.soundCooldown - deltaTime);
    this.messageTimer = Math.max(0, this.messageTimer - deltaTime);

    // Check player repelling
    const player = this.game.stateManager.currentState?.player;
    if (player) {
      const distance = this.getDistanceTo(player);
      if (distance < player.repelRadius) {
        // Get repelled by player
        const dx = this.getCenterX() - player.getCenterX();
        const dy = this.getCenterY() - player.getCenterY();
        const length = Math.sqrt(dx * dx + dy * dy) || 1;

        this.repelVelocity.x = (dx / length) * 200;
        this.repelVelocity.y = (dy / length) * 200;
        this.isRepelled = true;
        this.state = 'fleeing';
        this.stateTimer = 0;

        // Drop coins when repelled
        if (this.carriedCoins.length > 0 && this.soundCooldown <= 0) {
          this.dropAllCoins();
          this.playScammerSound();
          this.showMessage('REKT!');
        }
      }
    }

    // State machine
    switch (this.state) {
    case 'wander':
      this.updateWander(deltaTime);
      break;
    case 'seeking':
      this.updateSeeking(deltaTime);
      break;
    case 'stealing':
      this.updateStealing(deltaTime);
      break;
    case 'fleeing':
      this.updateFleeing(deltaTime);
      break;
    }

    // Apply repel velocity if being repelled
    if (this.isRepelled) {
      this.vx = this.repelVelocity.x;
      this.vy = this.repelVelocity.y;

      // Decay repel velocity
      this.repelVelocity.x *= 0.9;
      this.repelVelocity.y *= 0.9;

      if (Math.abs(this.repelVelocity.x) < 10 && Math.abs(this.repelVelocity.y) < 10) {
        this.isRepelled = false;
      }
    }

    // Update position
    const newX = this.x + this.vx * deltaTime;
    const newY = this.y + this.vy * deltaTime;

    // Check collisions with wallets
    const state = this.game.stateManager.currentState;
    let canMoveX = true;
    let canMoveY = true;

    if (state && state.wallets) {
      for (const wallet of state.wallets) {
        if (this.checkCollision(newX, this.y, wallet)) {
          canMoveX = false;
        }
        if (this.checkCollision(this.x, newY, wallet)) {
          canMoveY = false;
        }
      }
    }

    // Apply movement
    if (canMoveX) this.x = newX;
    if (canMoveY) this.y = newY;

    // Keep within world bounds
    if (state && state.worldWidth && state.worldHeight) {
      this.x = Math.max(0, Math.min(state.worldWidth - this.width, this.x));
      this.y = Math.max(0, Math.min(state.worldHeight - this.height, this.y));
    }

    // Update animation
    this.updateAnimation(deltaTime);
  }

  updateWander(deltaTime) {
    this.wanderTimer += deltaTime;

    if (this.wanderTimer >= this.wanderDuration) {
      // Pick new wander direction
      this.wanderTimer = 0;
      this.wanderDuration = 2 + Math.random() * 3;

      const angle = Math.random() * Math.PI * 2;
      this.wanderDirection.x = Math.cos(angle);
      this.wanderDirection.y = Math.sin(angle);
    }

    // Apply wander movement
    this.vx = this.wanderDirection.x * this.currentSpeed;
    this.vy = this.wanderDirection.y * this.currentSpeed;

    // Look for targets
    if (this.stealCooldown <= 0 && this.carriedCoins.length < this.maxCarry) {
      const nearestWallet = this.findNearestWallet();
      if (nearestWallet && this.getDistanceTo(nearestWallet) < 200) {
        this.target = nearestWallet;
        this.state = 'seeking';
        this.stateTimer = 0;
        this.showMessage('YOINK!');
      }
    }
  }

  updateSeeking(deltaTime) {
    if (!this.target || this.target.isEmpty()) {
      this.state = 'wander';
      this.target = null;
      return;
    }

    // Move toward target
    const dx = this.target.getCenterX() - this.getCenterX();
    const dy = this.target.getCenterY() - this.getCenterY();
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 40) {
      // Reached target, start stealing
      this.state = 'stealing';
      this.stateTimer = 0;
    } else {
      // Continue moving toward target
      this.vx = (dx / distance) * this.currentSpeed * 1.5; // Move faster when seeking
      this.vy = (dy / distance) * this.currentSpeed * 1.5;
    }
  }

  updateStealing(deltaTime) {
    if (!this.target || this.target.isEmpty()) {
      this.state = 'wander';
      this.target = null;
      return;
    }

    // Stop moving while stealing
    this.vx = 0;
    this.vy = 0;

    if (this.stateTimer > 0.5) { // Steal after 0.5 seconds
      const coin = this.target.removeRandomCoin();
      if (coin) {
        coin.pickup(this);
        this.carriedCoins.push(coin);
        this.playScammerSound();
        this.showMessage('HODL!');

        // Start fleeing after stealing
        this.state = 'fleeing';
        this.stateTimer = 0;
        this.stealCooldown = 3; // 3 second cooldown
      } else {
        this.state = 'wander';
      }
      this.target = null;
    }
  }

  updateFleeing(deltaTime) {
    // Run away from player
    const player = this.game.stateManager.currentState?.player;
    if (player) {
      const dx = this.getCenterX() - player.getCenterX();
      const dy = this.getCenterY() - player.getCenterY();
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;

      this.vx = (dx / distance) * this.currentSpeed * 2; // Run fast
      this.vy = (dy / distance) * this.currentSpeed * 2;
    }

    // Return to wander after 2 seconds
    if (this.stateTimer > 2) {
      this.state = 'wander';
      this.stateTimer = 0;
    }
  }

  updateAnimation(deltaTime) {
    // Update facing direction
    if (Math.abs(this.vx) > Math.abs(this.vy)) {
      this.facing = this.vx > 0 ? 'right' : 'left';
    } else if (this.vy !== 0) {
      this.facing = this.vy > 0 ? 'down' : 'up';
    }

    // Update animation
    this.isMoving = Math.abs(this.vx) > 5 || Math.abs(this.vy) > 5;
    if (this.isMoving) {
      this.animationTimer += deltaTime;
      if (this.animationTimer >= 0.2) {
        this.animationFrame = (this.animationFrame + 1) % 2;
        this.animationTimer = 0;
      }
    } else {
      this.animationFrame = 0;
      this.animationTimer = 0;
    }
  }

  render(ctx, interpolation) {
    // Draw glow effect based on state
    if (this.state === 'stealing' || this.state === 'seeking') {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = this.state === 'stealing' ? '#ff0000' : '#ff8800';
      ctx.beginPath();
      ctx.arc(this.getCenterX(), this.getCenterY(), 30, 0, Math.PI * 2);
      ctx.filter = 'blur(10px)';
      ctx.fill();
      ctx.restore();
    }

    // Get sprite based on variant and animation
    const spritePrefix = `kid${this.variant}`;
    const spriteSuffix = this.isMoving ? 'Walk' : 'Stand';
    const sprite = this.game.assetLoader.getImage(spritePrefix + spriteSuffix);

    if (sprite) {
      this.game.renderer.drawSprite(
        sprite,
        this.x,
        this.y,
        this.width,
        this.height,
        {
          flipX: this.facing === 'right'
        }
      );
    } else {
      // Fallback rendering
      ctx.save();
      ctx.fillStyle = this.aggression > 2 ? '#ff4444' : '#ff8844';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.restore();
    }

    // Draw carried coins indicator
    if (this.carriedCoins.length > 0) {
      ctx.save();
      ctx.fillStyle = '#FFD93D';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `$${this.carriedCoins.length}`,
        this.getCenterX(),
        this.y - 5
      );
      ctx.restore();
    }

    // Draw message
    if (this.messageTimer > 0 && this.currentMessage) {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText(this.currentMessage, this.getCenterX(), this.y - 20);
      ctx.fillText(this.currentMessage, this.getCenterX(), this.y - 20);
      ctx.restore();
    }
  }

  findNearestWallet() {
    const state = this.game.stateManager.currentState;
    if (!state || !state.wallets) return null;

    let nearest = null;
    let nearestDistance = Infinity;

    for (const wallet of state.wallets) {
      if (!wallet.isEmpty()) {
        const distance = this.getDistanceTo(wallet);
        if (distance < nearestDistance) {
          nearest = wallet;
          nearestDistance = distance;
        }
      }
    }

    return nearest;
  }

  dropAllCoins() {
    const state = this.game.stateManager.currentState;

    for (const coin of this.carriedCoins) {
      coin.drop(
        this.getCenterX() + (Math.random() - 0.5) * 40,
        this.getCenterY() + (Math.random() - 0.5) * 40,
        {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100
        }
      );

      // Coins are already tracked in state.coins, just drop them
    }

    this.carriedCoins = [];
  }

  checkCollision(x, y, entity) {
    if (!entity.collisionBox) return false;

    const myLeft = x + this.collisionBox.offsetX;
    const myRight = myLeft + this.collisionBox.width;
    const myTop = y + this.collisionBox.offsetY;
    const myBottom = myTop + this.collisionBox.height;

    const entityLeft = entity.x + entity.collisionBox.offsetX;
    const entityRight = entityLeft + entity.collisionBox.width;
    const entityTop = entity.y + entity.collisionBox.offsetY;
    const entityBottom = entityTop + entity.collisionBox.height;

    return !(myLeft >= entityRight ||
             myRight <= entityLeft ||
             myTop >= entityBottom ||
             myBottom <= entityTop);
  }

  playScammerSound() {
    if (this.soundCooldown <= 0) {
      const sounds = ['kid_laughing', 'boy_laughing_1', 'boy_laughing_2'];
      const soundName = sounds[Math.floor(Math.random() * sounds.length)];
      const audio = this.game.assetLoader.getAudio(soundName);

      if (audio) {
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Scammer sound failed:', e));
      }

      this.soundCooldown = 2; // 2 second cooldown
    }
  }

  showMessage(text) {
    this.currentMessage = text;
    this.messageTimer = 1.5;
  }
}