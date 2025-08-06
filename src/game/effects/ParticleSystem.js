export class Particle {
  constructor(x, y, config) {
    this.x = x;
    this.y = y;
    this.vx = config.vx || (Math.random() - 0.5) * 100;
    this.vy = config.vy || (Math.random() - 0.5) * 100;
    this.life = config.life || 1;
    this.maxLife = this.life;
    this.size = config.size || 4;
    this.color = config.color || '#FFD93D';
    this.type = config.type || 'default';
    this.gravity = config.gravity || 0;
    this.fade = config.fade !== undefined ? config.fade : true;
    this.rotation = 0;
    this.rotationSpeed = config.rotationSpeed || 0;
  }

  update(deltaTime) {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.vy += this.gravity * deltaTime;
    this.life -= deltaTime;
    this.rotation += this.rotationSpeed * deltaTime;

    // Slow down
    this.vx *= 0.98;
    this.vy *= 0.98;

    return this.life > 0;
  }

  render(ctx) {
    const alpha = this.fade ? (this.life / this.maxLife) : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    switch (this.type) {
    case 'dollar':
      // Draw dollar sign
      ctx.fillStyle = this.color;
      ctx.font = `${this.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillText('$', 0, 0);
      ctx.restore();
      break;

    case 'splash':
      // Draw water droplet
      ctx.fillStyle = '#4FC3F7';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'sparkle':
      // Draw sparkle
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      const sparkleSize = this.size * (0.5 + Math.sin(this.rotation * 10) * 0.5);
      ctx.beginPath();
      ctx.moveTo(this.x - sparkleSize, this.y);
      ctx.lineTo(this.x + sparkleSize, this.y);
      ctx.moveTo(this.x, this.y - sparkleSize);
      ctx.lineTo(this.x, this.y + sparkleSize);
      ctx.stroke();
      break;

    default:
      // Default circle
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class ParticleSystem {
  constructor(game) {
    this.game = game;
    this.particles = [];
  }

  emit(x, y, type, count = 10) {
    const configs = {
      coinPickup: {
        type: 'dollar',
        size: 16,
        color: '#FFD93D',
        life: 1,
        gravity: 200,
        rotationSpeed: 5
      },
      splash: {
        type: 'splash',
        size: 3,
        life: 0.5,
        gravity: 300
      },
      sparkle: {
        type: 'sparkle',
        size: 8,
        color: '#FFEB3B',
        life: 0.8,
        fade: true
      },
      repel: {
        type: 'default',
        size: 2,
        color: '#9C27B0',
        life: 0.6,
        gravity: 0
      }
    };

    const config = configs[type] || {};

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const speed = 50 + Math.random() * 100;

      this.particles.push(new Particle(x, y, {
        ...config,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
      }));
    }
  }

  update(deltaTime) {
    this.particles = this.particles.filter(particle => particle.update(deltaTime));
  }

  render(ctx) {
    this.particles.forEach(particle => particle.render(ctx));
  }

  clear() {
    this.particles = [];
  }
}