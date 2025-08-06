import { Boss } from './Boss.js';

export class WhaleManipulator extends Boss {
  constructor(game, x, y) {
    super(game, x, y, 160, 120);
    
    // Whale Manipulator stats
    this.maxHealth = 2500;
    this.health = this.maxHealth;
    this.damage = 35;
    this.xpReward = 2000;
    this.fudReduction = 40;
    
    // Visual
    this.color = '#1abc9c';
    this.tailAngle = 0;
    this.waterLevel = 0;
    
    // Market manipulation
    this.marketState = 'neutral'; // 'pump', 'dump', 'neutral'
    this.priceChart = [];
    this.chartLength = 20;
    
    // Initialize price chart
    for (let i = 0; i < this.chartLength; i++) {
      this.priceChart.push(0.5);
    }
    
    // Attacks
    this.tsunamiCharge = 0;
    this.coinTornadoes = [];
    
    // Start spawning
    this.state = 'spawning';
    this.stateTimer = 2;
  }
  
  update(deltaTime) {
    super.update(deltaTime);
    
    // Tail animation
    this.tailAngle = Math.sin(Date.now() * 0.003) * 0.3;
    
    // Water level effect
    this.waterLevel = Math.sin(Date.now() * 0.002) * 10;
    
    // Update market chart
    this.priceChart.shift();
    if (this.marketState === 'pump') {
      this.priceChart.push(Math.min(1, this.priceChart[this.priceChart.length - 1] + 0.1));
    } else if (this.marketState === 'dump') {
      this.priceChart.push(Math.max(0, this.priceChart[this.priceChart.length - 1] - 0.1));
    } else {
      this.priceChart.push(0.5 + Math.sin(Date.now() * 0.001) * 0.1);
    }
    
    // Update coin tornadoes
    this.coinTornadoes = this.coinTornadoes.filter(tornado => {
      tornado.life -= deltaTime;
      tornado.angle += deltaTime * 5;
      tornado.x += tornado.vx * deltaTime;
      tornado.y += tornado.vy * deltaTime;
      
      // Pull nearby coins
      this.pullCoinsToTornado(tornado);
      
      return tornado.life > 0;
    });
  }
  
  updateIdle(deltaTime) {
    if (this.attackCooldown <= 0) {
      const rand = Math.random();
      
      if (rand < 0.3) {
        this.startPumpAndDump();
      } else if (rand < 0.6) {
        this.startCoinTornado();
      } else {
        this.startTsunami();
      }
      
      this.attackCooldown = 4;
    }
  }
  
  startPumpAndDump() {
    this.state = 'attacking';
    this.currentAttack = 'pumpDump';
    this.stateTimer = 4;
    
    // Pump phase
    this.marketState = 'pump';
    this.glowIntensity = 3;
    
    // Create rising particles
    const state = this.game.stateManager.currentState;
    for (let i = 0; i < 20; i++) {
      state.particleSystem.particles.push({
        x: this.getCenterX() + (Math.random() - 0.5) * this.width,
        y: this.getCenterY(),
        vx: (Math.random() - 0.5) * 50,
        vy: -100 - Math.random() * 100,
        life: 2,
        maxLife: 2,
        size: 10,
        color: '#00ff00',
        type: 'pump'
      });
    }
    
    // Schedule dump
    setTimeout(() => {
      this.executeDump();
    }, 2000);
  }
  
  executeDump() {
    this.marketState = 'dump';
    
    const state = this.game.stateManager.currentState;
    
    // Create dump shockwave
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      state.particleSystem.particles.push({
        x: this.getCenterX(),
        y: this.getCenterY(),
        vx: Math.cos(angle) * 200,
        vy: Math.sin(angle) * 200,
        life: 1.5,
        maxLife: 1.5,
        size: 20,
        color: '#ff0000',
        type: 'dump',
        damage: true,
        damageAmount: 20
      });
    }
    
    // Drop all coins from player if hit by center
    if (state.player) {
      const distance = this.getDistanceTo(state.player);
      if (distance < 150) {
        state.player.dropAllCoins();
        if (this.game.gameData) {
          this.game.gameData.fudLevel = Math.min(
            this.game.gameData.maxFud,
            this.game.gameData.fudLevel + 30
          );
        }
      }
    }
    
    // Screen shake
    if (this.game.camera) {
      this.game.camera.shake(20, 0.7);
    }
    
    setTimeout(() => {
      this.marketState = 'neutral';
    }, 1000);
  }
  
  startCoinTornado() {
    this.state = 'attacking';
    this.currentAttack = 'tornado';
    this.stateTimer = 2;
    
    // Create tornado at player position
    const state = this.game.stateManager.currentState;
    if (state.player) {
      const targetX = state.player.getCenterX();
      const targetY = state.player.getCenterY();
      
      // Telegraph
      this.createTelegraph(targetX, targetY, 100, 1);
      
      // Create tornado after delay
      setTimeout(() => {
        this.coinTornadoes.push({
          x: targetX,
          y: targetY,
          vx: (Math.random() - 0.5) * 50,
          vy: (Math.random() - 0.5) * 50,
          life: 5,
          angle: 0,
          radius: 80,
          coins: []
        });
      }, 1000);
    }
  }
  
  pullCoinsToTornado(tornado) {
    const state = this.game.stateManager.currentState;
    
    state.coins.forEach(coin => {
      if (coin.isHeld || coin.isDeposited) return;
      
      const dx = tornado.x - coin.getCenterX();
      const dy = tornado.y - coin.getCenterY();
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < tornado.radius) {
        // Spiral motion
        const angle = Math.atan2(dy, dx) + Math.PI / 2;
        const force = (tornado.radius - distance) / tornado.radius;
        
        coin.vx += Math.cos(angle) * force * 200;
        coin.vy += Math.sin(angle) * force * 200;
        
        // Lift coin
        coin.vy -= force * 100;
      }
    });
    
    // Create tornado particles
    for (let i = 0; i < 3; i++) {
      const angle = tornado.angle + (Math.PI * 2 / 3) * i;
      const radius = tornado.radius * (0.5 + Math.random() * 0.5);
      
      state.particleSystem.particles.push({
        x: tornado.x + Math.cos(angle) * radius,
        y: tornado.y + Math.sin(angle) * radius,
        vx: Math.cos(angle + Math.PI/2) * 100,
        vy: Math.sin(angle + Math.PI/2) * 100 - 50,
        life: 0.5,
        maxLife: 0.5,
        size: 10,
        color: '#1abc9c',
        type: 'tornado'
      });
    }
  }
  
  startTsunami() {
    this.state = 'attacking';
    this.currentAttack = 'tsunami';
    this.stateTimer = 3;
    this.tsunamiCharge = 0;
    
    // Move to side of screen
    this.targetX = this.game.camera.x - this.width;
    this.state = 'moving';
    
    // Schedule tsunami
    setTimeout(() => {
      this.executeTsunami();
    }, 2000);
  }
  
  executeTsunami() {
    const state = this.game.stateManager.currentState;
    
    // Create massive wave
    const waveHeight = this.game.camera.height;
    const waveWidth = 100;
    
    // Telegraph
    this.createRectTelegraph(
      this.game.camera.x,
      this.game.camera.y,
      this.game.camera.width,
      waveHeight,
      1
    );
    
    // Create wave object
    const wave = {
      x: this.game.camera.x - waveWidth,
      y: this.game.camera.y,
      width: waveWidth,
      height: waveHeight,
      speed: 300,
      life: 3
    };
    
    // Add to state for rendering and collision
    if (!state.tsunamiWaves) state.tsunamiWaves = [];
    state.tsunamiWaves.push(wave);
    
    // Move whale with wave
    this.targetX = this.game.camera.x + this.game.camera.width + this.width;
    this.moveSpeed = 300;
    this.state = 'moving';
  }
  
  render(ctx) {
    ctx.save();
    
    // Water effect under whale
    const gradient = ctx.createLinearGradient(
      this.x, this.y + this.height - 20,
      this.x, this.y + this.height
    );
    gradient.addColorStop(0, 'rgba(26, 188, 156, 0)');
    gradient.addColorStop(1, 'rgba(26, 188, 156, 0.5)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(
      this.x - 20,
      this.y + this.height - 20 + this.waterLevel,
      this.width + 40,
      20
    );
    
    // Draw tail
    ctx.save();
    ctx.translate(this.x + this.width, this.getCenterY());
    ctx.rotate(this.tailAngle);
    
    ctx.fillStyle = this.invulnerable && Math.floor(Date.now() / 100) % 2 ? 
      'rgba(255,255,255,0.8)' : '#16a085';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(30, -20, 50, -30);
    ctx.quadraticCurveTo(40, 0, 50, 30);
    ctx.quadraticCurveTo(30, 20, 0, 0);
    ctx.fill();
    
    ctx.restore();
    
    // Draw body
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20 + this.glowIntensity * 10;
    ctx.fillStyle = this.invulnerable && Math.floor(Date.now() / 100) % 2 ? 
      'rgba(255,255,255,0.8)' : this.color;
    
    // Whale body shape
    ctx.beginPath();
    ctx.ellipse(
      this.getCenterX(),
      this.getCenterY(),
      this.width / 2,
      this.height / 2,
      0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x + 30, this.y + 30, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.x + 32, this.y + 32, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw market chart on whale
    this.renderMarketChart(ctx);
    
    // Health bar
    this.renderHealthBar(ctx);
    
    ctx.restore();
  }
  
  renderMarketChart(ctx) {
    const chartX = this.x + 20;
    const chartY = this.y + 50;
    const chartWidth = this.width - 40;
    const chartHeight = 40;
    
    // Chart background
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(chartX, chartY, chartWidth, chartHeight);
    
    // Draw price line
    ctx.strokeStyle = this.marketState === 'pump' ? '#00ff00' : 
                     this.marketState === 'dump' ? '#ff0000' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    this.priceChart.forEach((price, i) => {
      const x = chartX + (i / (this.chartLength - 1)) * chartWidth;
      const y = chartY + chartHeight - (price * chartHeight);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
  }
  
  onPhaseChange(phase) {
    if (phase === 2) {
      this.attackCooldown = 2;
      this.moveSpeed *= 1.3;
    } else if (phase === 3) {
      this.attackCooldown = 1;
      this.moveSpeed *= 1.5;
      // Permanent pump mode
      this.glowIntensity = 2;
    }
  }
  
  onDefeat() {
    const state = this.game.stateManager.currentState;
    
    // Create massive coin explosion
    for (let i = 0; i < 100; i++) {
      const angle = (Math.PI * 2 / 100) * i;
      const speed = 100 + Math.random() * 400;
      
      state.particleSystem.particles.push({
        x: this.getCenterX(),
        y: this.getCenterY(),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 3,
        maxLife: 3,
        size: 20 + Math.random() * 10,
        color: ['#1abc9c', '#16a085', '#FFD93D', '#00ff00'][Math.floor(Math.random() * 4)],
        type: 'explosion'
      });
    }
    
    // Create victory coins
    for (let i = 0; i < 10; i++) {
      const coin = state.spawnCoin(
        this.getCenterX() + (Math.random() - 0.5) * 200,
        this.getCenterY() + (Math.random() - 0.5) * 200
      );
      if (coin) {
        coin.vx = (Math.random() - 0.5) * 300;
        coin.vy = -Math.random() * 400;
      }
    }
    
    // Rewards
    state.awardXP(this.xpReward);
    this.game.gameData.fudLevel = Math.max(0, this.game.gameData.fudLevel - this.fudReduction);
    
    // Victory message
    state.showNotification('WHALE MANIPULATOR DEFEATED! MARKET SAVED!', 4);
  }
}