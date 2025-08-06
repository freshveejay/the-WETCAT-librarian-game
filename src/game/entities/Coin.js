import { Entity } from './Entity.js';

export class Coin extends Entity {
  constructor(game, x, y, color) {
    super(x, y, 24, 24); // Coins are round, 24x24
    this.game = game;
    
    // Coin properties
    this.color = color; // Matches wallet color
    this.isHeld = false;
    this.isDeposited = false;
    this.holder = null; // Entity holding this coin
    this.wallet = null; // Wallet this coin belongs to
    
    // Unique ID for tracking
    this.id = `coin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Physics
    this.friction = 0.9;
    this.bounceDecay = 0.7;
    this.gravity = 0;
    
    // Visual
    this.rotation = 0;
    this.rotationSpeed = 2; // Coins spin constantly
    this.sparkleTimer = 0;
    this.floatOffset = Math.random() * Math.PI * 2; // For floating animation
    
    // Collision box (circular for coins)
    this.collisionBox = {
      offsetX: 4,
      offsetY: 4,
      width: 16,
      height: 16
    };
    
    // Glow effect when on floor
    this.glowIntensity = 0;
    this.glowDirection = 1;
  }
  
  update(deltaTime) {
    // Skip physics for held coins
    if (this.isHeld) {
      return;
    }
    
    // Apply friction to velocity
    this.vx *= this.friction;
    this.vy *= this.friction;
    
    // Store old position
    const oldX = this.x;
    const oldY = this.y;
    
    // Update position
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    
    // Check collision with wallets if not deposited
    if (!this.isDeposited) {
      const state = this.game.stateManager.currentState;
      if (state && state.shelves) { // shelves are now wallets
        for (const wallet of state.shelves) {
          // Check if coin overlaps with wallet
          if (!(this.x + this.width < wallet.x || 
                this.x > wallet.x + wallet.width ||
                this.y + this.height < wallet.y || 
                this.y > wallet.y + wallet.height)) {
            // Coin collided with wallet, bounce it away
            this.x = oldX;
            this.y = oldY;
            
            // Reverse velocity and reduce it
            this.vx = -this.vx * 0.5;
            this.vy = -this.vy * 0.5;
            
            // Add some randomness to prevent getting stuck
            this.vx += (Math.random() - 0.5) * 20;
            this.vy += (Math.random() - 0.5) * 20;
            
            break; // Only handle first collision
          }
        }
      }
    }
    
    // Update rotation (coins always spin)
    this.rotation += this.rotationSpeed * deltaTime;
    
    // Sparkle effect
    this.sparkleTimer += deltaTime;
    
    // Glow pulsing
    this.glowIntensity += this.glowDirection * deltaTime * 2;
    if (this.glowIntensity >= 1) {
      this.glowIntensity = 1;
      this.glowDirection = -1;
    } else if (this.glowIntensity <= 0.3) {
      this.glowIntensity = 0.3;
      this.glowDirection = 1;
    }
    
    // Stop moving if velocity is very small
    if (Math.abs(this.vx) < 5 && Math.abs(this.vy) < 5) {
      this.vx = 0;
      this.vy = 0;
    }
  }
  
  render(ctx, interpolation) {
    if (!this.visible) return;
    
    // Floating animation for coins on ground
    let floatY = 0;
    if (!this.isHeld && !this.isDeposited) {
      floatY = Math.sin(Date.now() * 0.003 + this.floatOffset) * 3;
    }
    
    // Draw glow effect if on floor
    if (!this.isHeld && !this.isDeposited) {
      ctx.save();
      ctx.globalAlpha = this.glowIntensity * 0.6;
      ctx.fillStyle = this.getColorHex();
      ctx.beginPath();
      ctx.arc(
        this.getCenterX(),
        this.getCenterY() + floatY,
        25,
        0,
        Math.PI * 2
      );
      ctx.filter = 'blur(10px)';
      ctx.fill();
      ctx.restore();
    }
    
    const centerX = this.getCenterX();
    const centerY = this.getCenterY() + floatY;
    
    // Draw coin
    ctx.save();
    
    // Outer ring
    ctx.fillStyle = this.getColorHex();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner circle
    ctx.fillStyle = this.getDarkerColor();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Dollar sign
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.rotation);
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 0);
    ctx.restore();
    
    // Sparkle effect
    if (!this.isHeld && Math.sin(this.sparkleTimer * 8) > 0.7) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.9;
      const sparkleAngle = this.sparkleTimer * 2;
      const sparkleX = centerX + Math.cos(sparkleAngle) * 12;
      const sparkleY = centerY + Math.sin(sparkleAngle) * 12;
      
      // Draw star sparkle
      ctx.beginPath();
      ctx.moveTo(sparkleX, sparkleY - 3);
      ctx.lineTo(sparkleX + 1, sparkleY);
      ctx.lineTo(sparkleX + 3, sparkleY);
      ctx.lineTo(sparkleX + 1, sparkleY + 1);
      ctx.lineTo(sparkleX + 2, sparkleY + 3);
      ctx.lineTo(sparkleX, sparkleY + 1);
      ctx.lineTo(sparkleX - 2, sparkleY + 3);
      ctx.lineTo(sparkleX - 1, sparkleY + 1);
      ctx.lineTo(sparkleX - 3, sparkleY);
      ctx.lineTo(sparkleX - 1, sparkleY);
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  getColorHex() {
    const colors = {
      red: '#ff6666',
      blue: '#6666ff',
      green: '#66ff66',
      yellow: '#ffff66',
      purple: '#ff66ff',
      orange: '#ff9966'
    };
    return colors[this.color] || '#888888';
  }
  
  getDarkerColor() {
    const colors = {
      red: '#cc4444',
      blue: '#4444cc',
      green: '#44cc44',
      yellow: '#cccc44',
      purple: '#cc44cc',
      orange: '#cc7744'
    };
    return colors[this.color] || '#666666';
  }
  
  pickup(holder) {
    this.isHeld = true;
    this.holder = holder;
    this.vx = 0;
    this.vy = 0;
  }
  
  drop(x, y, throwVelocity = null) {
    this.isHeld = false;
    this.holder = null;
    this.x = x;
    this.y = y;
    
    if (throwVelocity) {
      this.vx = throwVelocity.x;
      this.vy = throwVelocity.y;
    }
  }
  
  deposit(wallet = null) {
    this.isDeposited = true;
    this.isHeld = false;
    this.holder = null;
    this.wallet = wallet;
    this.vx = 0;
    this.vy = 0;
  }
  
  withdraw() {
    this.isDeposited = false;
    this.wallet = null;
  }
  
  getStateString() {
    if (this.isDeposited) return 'deposited';
    if (this.isHeld) return `held by ${this.holder?.constructor.name || 'unknown'}`;
    return 'on floor';
  }
}