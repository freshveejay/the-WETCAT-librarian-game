import { Entity } from '../Entity.js';

export class Boss extends Entity {
  constructor(game, x, y, width, height) {
    super(x, y, width, height);
    this.game = game;
    
    // Boss stats
    this.maxHealth = 1000;
    this.health = this.maxHealth;
    this.damage = 20;
    this.speed = 1;
    this.xpReward = 500;
    this.fudReduction = 20;
    
    // States
    this.state = 'spawning';
    this.stateTimer = 0;
    this.attackCooldown = 0;
    this.currentAttack = null;
    this.phase = 1;
    
    // Visual
    this.color = '#ff0000';
    this.glowIntensity = 0;
    this.shakeAmount = 0;
    
    // Movement
    this.targetX = x;
    this.targetY = y;
    this.moveSpeed = 50;
    
    // Collision
    this.collisionBox = {
      offsetX: width * 0.1,
      offsetY: height * 0.1,
      width: width * 0.8,
      height: height * 0.8
    };
    
    // Invulnerability
    this.invulnerable = false;
    this.invulnerableTimer = 0;
  }
  
  update(deltaTime) {
    // Update timers
    if (this.stateTimer > 0) {
      this.stateTimer -= deltaTime;
    }
    
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }
    
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= deltaTime;
      if (this.invulnerableTimer <= 0) {
        this.invulnerable = false;
      }
    }
    
    // State machine
    switch (this.state) {
      case 'spawning':
        this.updateSpawning(deltaTime);
        break;
      case 'idle':
        this.updateIdle(deltaTime);
        break;
      case 'attacking':
        this.updateAttacking(deltaTime);
        break;
      case 'moving':
        this.updateMoving(deltaTime);
        break;
      case 'dying':
        this.updateDying(deltaTime);
        break;
    }
    
    // Update phase based on health
    const healthPercent = this.health / this.maxHealth;
    if (healthPercent <= 0.33 && this.phase < 3) {
      this.phase = 3;
      this.onPhaseChange(3);
    } else if (healthPercent <= 0.66 && this.phase < 2) {
      this.phase = 2;
      this.onPhaseChange(2);
    }
    
    // Visual effects
    this.glowIntensity = Math.sin(Date.now() * 0.003) * 0.5 + 0.5;
    if (this.shakeAmount > 0) {
      this.shakeAmount = Math.max(0, this.shakeAmount - deltaTime * 10);
    }
  }
  
  updateSpawning(deltaTime) {
    if (this.stateTimer <= 0) {
      this.state = 'idle';
      this.onSpawnComplete();
    }
  }
  
  updateIdle(deltaTime) {
    // Override in subclasses
  }
  
  updateAttacking(deltaTime) {
    // Override in subclasses
  }
  
  updateMoving(deltaTime) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      const moveX = (dx / distance) * this.moveSpeed * deltaTime;
      const moveY = (dy / distance) * this.moveSpeed * deltaTime;
      
      this.x += moveX;
      this.y += moveY;
    } else {
      this.state = 'idle';
      this.onMoveComplete();
    }
  }
  
  updateDying(deltaTime) {
    if (this.stateTimer <= 0) {
      this.isDead = true;
      this.onDeath();
    }
  }
  
  takeDamage(amount) {
    if (this.invulnerable || this.state === 'dying') return;
    
    this.health -= amount;
    this.shakeAmount = 10;
    
    // Flash effect
    this.invulnerable = true;
    this.invulnerableTimer = 0.1;
    
    // Create damage particles
    if (this.game.stateManager.currentState.particleSystem) {
      this.game.stateManager.currentState.particleSystem.emit(
        this.getCenterX(),
        this.getCenterY(),
        'damage',
        10
      );
    }
    
    if (this.health <= 0) {
      this.health = 0;
      this.state = 'dying';
      this.stateTimer = 2;
      this.onDefeat();
    }
  }
  
  render(ctx) {
    ctx.save();
    
    // Shake effect
    if (this.shakeAmount > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.shakeAmount,
        (Math.random() - 0.5) * this.shakeAmount
      );
    }
    
    // Glow effect
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20 + this.glowIntensity * 10;
    
    // Draw boss
    ctx.fillStyle = this.invulnerable && Math.floor(Date.now() / 100) % 2 ? 
      'rgba(255,255,255,0.8)' : this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Draw health bar
    this.renderHealthBar(ctx);
    
    ctx.restore();
  }
  
  renderHealthBar(ctx) {
    const barWidth = this.width * 1.5;
    const barHeight = 10;
    const barX = this.x + (this.width - barWidth) / 2;
    const barY = this.y - 20;
    
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Health
    const healthPercent = this.health / this.maxHealth;
    ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : 
                    healthPercent > 0.25 ? '#ffff00' : '#ff0000';
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    
    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
  
  // Override these in subclasses
  onSpawnComplete() {}
  onMoveComplete() {}
  onPhaseChange(phase) {}
  onDefeat() {}
  onDeath() {}
  
  getDistanceTo(entity) {
    const dx = this.getCenterX() - entity.getCenterX();
    const dy = this.getCenterY() - entity.getCenterY();
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  createTelegraph(x, y, radius, duration = 1) {
    const state = this.game.stateManager.currentState;
    if (state && state.telegraphs) {
      state.telegraphs.push({
        x,
        y,
        radius,
        duration,
        maxDuration: duration,
        type: 'circle'
      });
    }
  }
  
  createRectTelegraph(x, y, width, height, duration = 1) {
    const state = this.game.stateManager.currentState;
    if (state && state.telegraphs) {
      state.telegraphs.push({
        x,
        y,
        width,
        height,
        duration,
        maxDuration: duration,
        type: 'rect'
      });
    }
  }
}