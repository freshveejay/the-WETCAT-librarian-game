import { Entity } from './Entity.js';

export class Wallet extends Entity {
  constructor(game, x, y, color) {
    super(x, y, 80, 100); // Slightly larger than shelves
    this.game = game;
    
    // Wallet properties
    this.color = color; // Determines which coins can be deposited
    this.capacity = 6; // Max coins it can hold
    this.coins = []; // Coins currently deposited
    
    // Visual properties
    this.pulseTimer = 0;
    this.glowIntensity = 0;
    
    // Collision box for the wallet
    this.collisionBox = {
      offsetX: 10,
      offsetY: 20,
      width: 60,
      height: 60
    };
  }
  
  update(deltaTime) {
    // Update visual effects
    this.pulseTimer += deltaTime;
    
    // Glow more when nearly full
    const fillPercent = this.coins.length / this.capacity;
    this.glowIntensity = fillPercent * 0.5 + Math.sin(this.pulseTimer * 3) * 0.2;
  }
  
  render(ctx, interpolation) {
    // Draw glow effect
    if (this.glowIntensity > 0) {
      ctx.save();
      ctx.globalAlpha = this.glowIntensity;
      ctx.fillStyle = this.getColorHex();
      ctx.beginPath();
      ctx.arc(
        this.getCenterX(),
        this.getCenterY(),
        50,
        0,
        Math.PI * 2
      );
      ctx.filter = 'blur(15px)';
      ctx.fill();
      ctx.restore();
    }
    
    // Draw wallet base
    ctx.save();
    
    // Main wallet body
    ctx.fillStyle = this.getDarkerColor();
    ctx.fillRect(this.x + 5, this.y + 15, this.width - 10, this.height - 20);
    
    // Wallet flap
    ctx.fillStyle = this.getColorHex();
    ctx.beginPath();
    ctx.moveTo(this.x + 5, this.y + 15);
    ctx.lineTo(this.x + this.width - 5, this.y + 15);
    ctx.lineTo(this.x + this.width - 15, this.y);
    ctx.lineTo(this.x + 15, this.y);
    ctx.closePath();
    ctx.fill();
    
    // Wallet outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x + 5, this.y + 15, this.width - 10, this.height - 20);
    
    // Draw wallet chain/address label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`0x${this.color.substring(0, 4).toUpperCase()}`, this.getCenterX(), this.y + 35);
    
    // Draw capacity indicator
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.coins.length}/${this.capacity}`, this.getCenterX(), this.y + this.height - 10);
    
    // Draw coin slots
    const slotSize = 12;
    const startX = this.x + 10;
    const startY = this.y + 45;
    
    for (let i = 0; i < this.capacity; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const slotX = startX + col * 20;
      const slotY = startY + row * 20;
      
      // Draw slot
      ctx.strokeStyle = i < this.coins.length ? '#FFD93D' : '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(slotX + slotSize/2, slotY + slotSize/2, slotSize/2, 0, Math.PI * 2);
      ctx.stroke();
      
      // Fill if occupied
      if (i < this.coins.length) {
        ctx.fillStyle = '#FFD93D';
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    
    ctx.restore();
    
    // Draw collision box in debug mode
    if (this.game.debug.showCollisionBoxes) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        this.x + this.collisionBox.offsetX,
        this.y + this.collisionBox.offsetY,
        this.collisionBox.width,
        this.collisionBox.height
      );
      ctx.restore();
    }
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
  
  canAcceptCoin(coin) {
    return coin.color === this.color && this.coins.length < this.capacity;
  }
  
  addCoin(coin) {
    if (this.canAcceptCoin(coin)) {
      this.coins.push(coin);
      coin.deposit(this);
      
      // Position coin in wallet (hidden)
      coin.visible = false;
      
      return true;
    }
    return false;
  }
  
  removeCoin() {
    if (this.coins.length > 0) {
      const coin = this.coins.pop();
      coin.withdraw();
      coin.visible = true;
      return coin;
    }
    return null;
  }
  
  removeRandomCoin() {
    if (this.coins.length > 0) {
      const index = Math.floor(Math.random() * this.coins.length);
      const coin = this.coins.splice(index, 1)[0];
      coin.withdraw();
      coin.visible = true;
      return coin;
    }
    return null;
  }
  
  isFull() {
    return this.coins.length >= this.capacity;
  }
  
  isEmpty() {
    return this.coins.length === 0;
  }
}