import { Boss } from './Boss.js';

export class FUDDragon extends Boss {
  constructor(game, x, y) {
    super(game, x, y, 120, 120);
    
    // FUD Dragon specific stats
    this.maxHealth = 1500;
    this.health = this.maxHealth;
    this.damage = 25;
    this.xpReward = 1000;
    this.fudReduction = 30;
    
    // Visual
    this.color = '#ff6b6b';
    this.wingFlap = 0;
    
    // Attacks
    this.attacks = ['fireBreath', 'summonMinions', 'fudWave'];
    this.fireBreathCooldown = 0;
    this.minionCooldown = 0;
    
    // Start spawning
    this.state = 'spawning';
    this.stateTimer = 2;
    
    // Flying movement
    this.baseY = y;
    this.floatOffset = 0;
  }
  
  update(deltaTime) {
    super.update(deltaTime);
    
    // Wing animation
    this.wingFlap += deltaTime * 5;
    
    // Floating effect
    this.floatOffset = Math.sin(Date.now() * 0.002) * 20;
    this.y = this.baseY + this.floatOffset;
    
    // Update attack cooldowns
    if (this.fireBreathCooldown > 0) {
      this.fireBreathCooldown -= deltaTime;
    }
    if (this.minionCooldown > 0) {
      this.minionCooldown -= deltaTime;
    }
  }
  
  updateIdle(deltaTime) {
    // Choose attack based on phase
    if (this.attackCooldown <= 0) {
      const player = this.game.stateManager.currentState.player;
      if (!player) return;
      
      const distance = this.getDistanceTo(player);
      
      if (distance < 200 && this.fireBreathCooldown <= 0) {
        this.startFireBreath();
      } else if (this.phase >= 2 && this.minionCooldown <= 0) {
        this.summonMinions();
      } else {
        this.startFudWave();
      }
      
      this.attackCooldown = 2;
    }
  }
  
  startFireBreath() {
    this.state = 'attacking';
    this.currentAttack = 'fireBreath';
    this.stateTimer = 2;
    this.fireBreathCooldown = 5;
    
    // Telegraph
    const player = this.game.stateManager.currentState.player;
    if (player) {
      const angle = Math.atan2(
        player.getCenterY() - this.getCenterY(),
        player.getCenterX() - this.getCenterX()
      );
      
      // Create cone telegraph
      for (let i = 0; i < 5; i++) {
        const dist = 50 + i * 40;
        const spread = (i + 1) * 30;
        this.createTelegraph(
          this.getCenterX() + Math.cos(angle) * dist,
          this.getCenterY() + Math.sin(angle) * dist,
          spread,
          1
        );
      }
    }
  }
  
  updateAttacking(deltaTime) {
    if (this.currentAttack === 'fireBreath' && this.stateTimer <= 1) {
      // Execute fire breath
      this.executeFireBreath();
      this.currentAttack = null;
    }
    
    if (this.stateTimer <= 0) {
      this.state = 'idle';
    }
  }
  
  executeFireBreath() {
    const state = this.game.stateManager.currentState;
    const player = state.player;
    if (!player) return;
    
    const angle = Math.atan2(
      player.getCenterY() - this.getCenterY(),
      player.getCenterX() - this.getCenterX()
    );
    
    // Create fire particles
    for (let i = 0; i < 20; i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const speed = 200 + Math.random() * 100;
      
      state.particleSystem.particles.push({
        x: this.getCenterX(),
        y: this.getCenterY(),
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        life: 1.5,
        maxLife: 1.5,
        size: 15,
        color: '#ff6b6b',
        type: 'fire',
        damage: true,
        damageAmount: 15
      });
    }
    
    // Screen shake
    if (this.game.camera) {
      this.game.camera.shake(10, 0.5);
    }
  }
  
  summonMinions() {
    this.state = 'attacking';
    this.currentAttack = 'summon';
    this.stateTimer = 1.5;
    this.minionCooldown = 10;
    
    // Visual effect
    this.glowIntensity = 2;
    
    // Spawn scammers after delay
    setTimeout(() => {
      const state = this.game.stateManager.currentState;
      if (state && state.scammers && state.spawnScammer) {
        // Spawn 3 scammers around the boss
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI * 2 / 3) * i;
          const spawnX = this.getCenterX() + Math.cos(angle) * 100;
          const spawnY = this.getCenterY() + Math.sin(angle) * 100;
          
          state.spawnScammer(spawnX, spawnY);
        }
      }
    }, 1000);
  }
  
  startFudWave() {
    this.state = 'attacking';
    this.currentAttack = 'fudWave';
    this.stateTimer = 3;
    
    // Create expanding wave telegraph
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.createTelegraph(
          this.getCenterX(),
          this.getCenterY(),
          50 + i * 60,
          0.5
        );
      }, i * 200);
    }
    
    // Execute wave after delay
    setTimeout(() => {
      this.executeFudWave();
    }, 1500);
  }
  
  executeFudWave() {
    const state = this.game.stateManager.currentState;
    
    // Create expanding wave of FUD
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
      state.particleSystem.particles.push({
        x: this.getCenterX(),
        y: this.getCenterY(),
        vx: Math.cos(angle) * 150,
        vy: Math.sin(angle) * 150,
        life: 2,
        maxLife: 2,
        size: 20,
        color: '#ff00ff',
        type: 'fud',
        damage: true,
        damageAmount: 10,
        fudIncrease: 5
      });
    }
    
    // Increase global FUD
    if (this.game.gameData) {
      this.game.gameData.fudLevel = Math.min(
        this.game.gameData.maxFud,
        this.game.gameData.fudLevel + 10
      );
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
    
    // Draw wings
    ctx.fillStyle = this.invulnerable && Math.floor(Date.now() / 100) % 2 ? 
      'rgba(255,255,255,0.8)' : '#8b0000';
    
    const wingOffset = Math.sin(this.wingFlap) * 10;
    
    // Left wing
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + 30);
    ctx.quadraticCurveTo(
      this.x - 40, this.y + wingOffset,
      this.x - 30, this.y + 60
    );
    ctx.fill();
    
    // Right wing
    ctx.beginPath();
    ctx.moveTo(this.x + this.width, this.y + 30);
    ctx.quadraticCurveTo(
      this.x + this.width + 40, this.y + wingOffset,
      this.x + this.width + 30, this.y + 60
    );
    ctx.fill();
    
    // Draw body
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20 + this.glowIntensity * 10;
    ctx.fillStyle = this.invulnerable && Math.floor(Date.now() / 100) % 2 ? 
      'rgba(255,255,255,0.8)' : this.color;
    ctx.fillRect(this.x + 10, this.y, this.width - 20, this.height);
    
    // Draw head
    ctx.fillRect(this.x + 20, this.y - 20, this.width - 40, 30);
    
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x + 30, this.y - 10, 10, 10);
    ctx.fillRect(this.x + this.width - 40, this.y - 10, 10, 10);
    
    // Pupils (look at player)
    const player = this.game.stateManager.currentState.player;
    if (player) {
      const angle = Math.atan2(
        player.getCenterY() - this.getCenterY(),
        player.getCenterX() - this.getCenterX()
      );
      
      ctx.fillStyle = '#f00';
      ctx.fillRect(
        this.x + 32 + Math.cos(angle) * 3,
        this.y - 8 + Math.sin(angle) * 3,
        6, 6
      );
      ctx.fillRect(
        this.x + this.width - 38 + Math.cos(angle) * 3,
        this.y - 8 + Math.sin(angle) * 3,
        6, 6
      );
    }
    
    // Health bar
    this.renderHealthBar(ctx);
    
    ctx.restore();
  }
  
  onPhaseChange(phase) {
    // Enrage effects for different phases
    if (phase === 2) {
      this.moveSpeed *= 1.2;
      this.color = '#ff4444';
    } else if (phase === 3) {
      this.moveSpeed *= 1.5;
      this.color = '#ff0000';
      this.damage *= 1.5;
    }
    
    // Full heal minions
    this.summonMinions();
  }
  
  onDefeat() {
    const state = this.game.stateManager.currentState;
    
    // Big explosion
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 / 50) * i;
      const speed = 100 + Math.random() * 200;
      
      state.particleSystem.particles.push({
        x: this.getCenterX(),
        y: this.getCenterY(),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 2,
        maxLife: 2,
        size: 10 + Math.random() * 10,
        color: ['#ff6b6b', '#ff0000', '#ffff00'][Math.floor(Math.random() * 3)],
        type: 'explosion'
      });
    }
    
    // Drop rewards
    state.awardXP(this.xpReward);
    this.game.gameData.fudLevel = Math.max(0, this.game.gameData.fudLevel - this.fudReduction);
    
    // Victory message
    state.showNotification('FUD DRAGON DEFEATED!', 3);
  }
}