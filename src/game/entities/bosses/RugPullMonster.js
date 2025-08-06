import { Boss } from './Boss.js';

export class RugPullMonster extends Boss {
  constructor(game, x, y) {
    super(game, x, y, 140, 100);
    
    // Rug Pull Monster stats
    this.maxHealth = 2000;
    this.health = this.maxHealth;
    this.damage = 30;
    this.xpReward = 1500;
    this.fudReduction = 25;
    
    // Visual
    this.color = '#9b59b6';
    this.rugWidth = this.width * 1.5;
    this.rugHeight = 20;
    this.tentacles = [];
    
    // Initialize tentacles
    for (let i = 0; i < 4; i++) {
      this.tentacles.push({
        angle: (Math.PI * 2 / 4) * i,
        length: 0,
        targetLength: 80,
        wiggle: 0
      });
    }
    
    // Attacks
    this.vacuumPower = 0;
    this.isVacuuming = false;
    this.stolenCoins = [];
    
    // Start spawning
    this.state = 'spawning';
    this.stateTimer = 2;
  }
  
  update(deltaTime) {
    super.update(deltaTime);
    
    // Update tentacles
    this.tentacles.forEach(tentacle => {
      tentacle.wiggle += deltaTime * 3;
      tentacle.length += (tentacle.targetLength - tentacle.length) * deltaTime * 2;
      
      // Wiggle effect
      tentacle.angle += Math.sin(tentacle.wiggle) * deltaTime * 0.5;
    });
    
    // Update vacuum
    if (this.isVacuuming) {
      this.vacuumPower = Math.min(300, this.vacuumPower + deltaTime * 200);
      this.pullEntities(deltaTime);
    } else {
      this.vacuumPower *= 0.9;
    }
  }
  
  updateIdle(deltaTime) {
    if (this.attackCooldown <= 0) {
      const rand = Math.random();
      
      if (rand < 0.4) {
        this.startVacuum();
      } else if (rand < 0.7) {
        this.startTentacleSlam();
      } else {
        this.startRugPull();
      }
      
      this.attackCooldown = 3;
    }
  }
  
  startVacuum() {
    this.state = 'attacking';
    this.currentAttack = 'vacuum';
    this.stateTimer = 3;
    this.isVacuuming = true;
    
    // Visual warning
    this.glowIntensity = 2;
    this.createTelegraph(this.getCenterX(), this.getCenterY(), 300, 1);
  }
  
  pullEntities(deltaTime) {
    const state = this.game.stateManager.currentState;
    const centerX = this.getCenterX();
    const centerY = this.getCenterY();
    
    // Pull player
    if (state.player) {
      const dx = centerX - state.player.getCenterX();
      const dy = centerY - state.player.getCenterY();
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 300 && distance > 50) {
        const pullForce = (this.vacuumPower / distance) * deltaTime;
        state.player.x += dx * pullForce * 0.5;
        state.player.y += dy * pullForce * 0.5;
      }
    }
    
    // Pull and steal coins
    state.coins.forEach(coin => {
      if (coin.isHeld || coin.isDeposited) return;
      
      const dx = centerX - coin.getCenterX();
      const dy = centerY - coin.getCenterY();
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 300) {
        const pullForce = (this.vacuumPower / distance) * deltaTime * 2;
        coin.x += dx * pullForce;
        coin.y += dy * pullForce;
        
        // Steal coin if close enough
        if (distance < 50) {
          coin.isHeld = true;
          this.stolenCoins.push(coin);
        }
      }
    });
    
    // Create vacuum particles
    if (Math.random() < 0.3) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 250 + Math.random() * 50;
      
      state.particleSystem.particles.push({
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 100,
        vy: -Math.sin(angle) * 100,
        life: 1,
        maxLife: 1,
        size: 5,
        color: '#9b59b6',
        type: 'vacuum'
      });
    }
  }
  
  startTentacleSlam() {
    this.state = 'attacking';
    this.currentAttack = 'tentacleSlam';
    this.stateTimer = 2;
    
    // Extend tentacles
    this.tentacles.forEach((tentacle, i) => {
      tentacle.targetLength = 150;
      
      // Telegraph slam area
      setTimeout(() => {
        const slamX = this.getCenterX() + Math.cos(tentacle.angle) * 120;
        const slamY = this.getCenterY() + Math.sin(tentacle.angle) * 120;
        this.createTelegraph(slamX, slamY, 60, 0.5);
      }, i * 200);
    });
    
    // Execute slam
    setTimeout(() => {
      this.executeTentacleSlam();
    }, 1000);
  }
  
  executeTentacleSlam() {
    const state = this.game.stateManager.currentState;
    
    this.tentacles.forEach(tentacle => {
      const slamX = this.getCenterX() + Math.cos(tentacle.angle) * 120;
      const slamY = this.getCenterY() + Math.sin(tentacle.angle) * 120;
      
      // Check hit on player
      if (state.player) {
        const dx = state.player.getCenterX() - slamX;
        const dy = state.player.getCenterY() - slamY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 60) {
          // Damage and knockback
          if (this.game.gameData) {
            this.game.gameData.fudLevel = Math.min(
              this.game.gameData.maxFud,
              this.game.gameData.fudLevel + this.damage
            );
          }
          
          // Drop coins
          state.player.dropAllCoins();
        }
      }
      
      // Impact particles
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 / 10) * i;
        state.particleSystem.particles.push({
          x: slamX,
          y: slamY,
          vx: Math.cos(angle) * 100,
          vy: Math.sin(angle) * 100,
          life: 0.5,
          maxLife: 0.5,
          size: 8,
          color: '#9b59b6',
          type: 'impact'
        });
      }
      
      // Retract tentacle
      tentacle.targetLength = 80;
    });
    
    // Screen shake
    if (this.game.camera) {
      this.game.camera.shake(15, 0.5);
    }
  }
  
  startRugPull() {
    this.state = 'attacking';
    this.currentAttack = 'rugPull';
    this.stateTimer = 3;
    
    // Warning effect
    this.glowIntensity = 3;
    
    // Create expanding rug telegraph
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.createRectTelegraph(
          this.game.camera.x,
          this.game.camera.y + this.game.camera.height - 100,
          this.game.camera.width,
          100,
          0.5
        );
      }, i * 300);
    }
    
    // Execute rug pull
    setTimeout(() => {
      this.executeRugPull();
    }, 1500);
  }
  
  executeRugPull() {
    const state = this.game.stateManager.currentState;
    
    // Pull the rug!
    if (state.player && state.player.y > this.game.camera.y + this.game.camera.height - 150) {
      // Make player fall
      state.player.dropAllCoins();
      if (this.game.gameData) {
        this.game.gameData.fudLevel = Math.min(
          this.game.gameData.maxFud,
          this.game.gameData.fudLevel + 20
        );
      }
    }
    
    // Drop all stolen coins
    this.stolenCoins.forEach(coin => {
      coin.isHeld = false;
      coin.x = this.getCenterX() + (Math.random() - 0.5) * 100;
      coin.y = this.getCenterY() + (Math.random() - 0.5) * 100;
      coin.vx = (Math.random() - 0.5) * 200;
      coin.vy = -Math.random() * 200;
    });
    this.stolenCoins = [];
    
    // Rug wave effect
    for (let x = 0; x < this.game.camera.width; x += 20) {
      state.particleSystem.particles.push({
        x: this.game.camera.x + x,
        y: this.game.camera.y + this.game.camera.height - 50,
        vx: 0,
        vy: -200,
        life: 1,
        maxLife: 1,
        size: 15,
        color: '#9b59b6',
        type: 'rug'
      });
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
    
    // Draw rug
    ctx.fillStyle = '#4a2c4a';
    ctx.fillRect(
      this.x - (this.rugWidth - this.width) / 2,
      this.y + this.height - this.rugHeight,
      this.rugWidth,
      this.rugHeight
    );
    
    // Draw tentacles
    ctx.strokeStyle = this.invulnerable && Math.floor(Date.now() / 100) % 2 ? 
      'rgba(255,255,255,0.8)' : '#7a3d7a';
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    
    this.tentacles.forEach(tentacle => {
      ctx.beginPath();
      ctx.moveTo(this.getCenterX(), this.getCenterY());
      
      const endX = this.getCenterX() + Math.cos(tentacle.angle) * tentacle.length;
      const endY = this.getCenterY() + Math.sin(tentacle.angle) * tentacle.length;
      
      const wiggleOffset = Math.sin(tentacle.wiggle) * 20;
      const midX = (this.getCenterX() + endX) / 2 + Math.cos(tentacle.angle + Math.PI/2) * wiggleOffset;
      const midY = (this.getCenterY() + endY) / 2 + Math.sin(tentacle.angle + Math.PI/2) * wiggleOffset;
      
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();
    });
    
    // Draw body
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20 + this.glowIntensity * 10;
    ctx.fillStyle = this.invulnerable && Math.floor(Date.now() / 100) % 2 ? 
      'rgba(255,255,255,0.8)' : this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height - this.rugHeight);
    
    // Draw eyes
    ctx.fillStyle = '#fff';
    const eyeY = this.y + 20;
    ctx.beginPath();
    ctx.arc(this.x + 40, eyeY, 15, 0, Math.PI * 2);
    ctx.arc(this.x + this.width - 40, eyeY, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Evil pupils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.x + 40, eyeY + 5, 8, 0, Math.PI * 2);
    ctx.arc(this.x + this.width - 40, eyeY + 5, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw stolen coins indicator
    if (this.stolenCoins.length > 0) {
      ctx.fillStyle = '#FFD93D';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `💰 ${this.stolenCoins.length}`,
        this.getCenterX(),
        this.y - 30
      );
    }
    
    // Health bar
    this.renderHealthBar(ctx);
    
    ctx.restore();
  }
  
  onPhaseChange(phase) {
    if (phase === 2) {
      this.vacuumPower *= 1.5;
      this.tentacles.forEach(t => t.targetLength = 100);
    } else if (phase === 3) {
      this.vacuumPower *= 2;
      this.tentacles.forEach(t => t.targetLength = 120);
      // Add more tentacles
      for (let i = 0; i < 2; i++) {
        this.tentacles.push({
          angle: Math.random() * Math.PI * 2,
          length: 0,
          targetLength: 120,
          wiggle: 0
        });
      }
    }
  }
  
  onDefeat() {
    const state = this.game.stateManager.currentState;
    
    // Drop all stolen coins
    this.stolenCoins.forEach(coin => {
      coin.isHeld = false;
      coin.x = this.getCenterX() + (Math.random() - 0.5) * 200;
      coin.y = this.getCenterY() + (Math.random() - 0.5) * 200;
      coin.vx = (Math.random() - 0.5) * 300;
      coin.vy = -Math.random() * 300;
    });
    
    // Big explosion
    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 / 60) * i;
      const speed = 100 + Math.random() * 300;
      
      state.particleSystem.particles.push({
        x: this.getCenterX(),
        y: this.getCenterY(),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 2.5,
        maxLife: 2.5,
        size: 15 + Math.random() * 10,
        color: ['#9b59b6', '#4a2c4a', '#FFD93D'][Math.floor(Math.random() * 3)],
        type: 'explosion'
      });
    }
    
    // Rewards
    state.awardXP(this.xpReward);
    this.game.gameData.fudLevel = Math.max(0, this.game.gameData.fudLevel - this.fudReduction);
    
    // Victory message
    state.showNotification('RUG PULL MONSTER DEFEATED!', 3);
  }
  
  updateAttacking(deltaTime) {
    super.updateAttacking(deltaTime);
    
    if (this.currentAttack === 'vacuum' && this.stateTimer <= 0) {
      this.isVacuuming = false;
    }
  }
}