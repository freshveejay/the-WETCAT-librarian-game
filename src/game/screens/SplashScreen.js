export class SplashScreen {
  constructor(game) {
    this.game = game;
    this.duration = 3;
    this.timer = 0;
    this.logoLoaded = false;
    this.logo = new Image();
    this.logo.src = '/wetcat-logo.png';
    this.logo.onload = () => this.logoLoaded = true;
  }
  
  update(deltaTime) {
    this.timer += deltaTime;
    return this.timer < this.duration;
  }
  
  render(ctx) {
    const { width, height } = this.game;
    
    // Background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a0033');
    gradient.addColorStop(0.5, '#330066');
    gradient.addColorStop(1, '#1a0033');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Logo
    if (this.logoLoaded) {
      const alpha = Math.min(1, this.timer * 2);
      ctx.save();
      ctx.globalAlpha = alpha;
      
      const logoWidth = 400;
      const logoHeight = 200;
      ctx.drawImage(
        this.logo,
        (width - logoWidth) / 2,
        (height - logoHeight) / 2 - 50,
        logoWidth,
        logoHeight
      );
      
      ctx.restore();
    }
    
    // Text
    if (this.timer > 1) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (this.timer - 1) * 2);
      ctx.fillStyle = '#FFD93D';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GET READY TO GET SOAKED!', width / 2, height / 2 + 100);
      ctx.restore();
    }
    
    // Loading bar
    const barWidth = 300;
    const barHeight = 10;
    const barX = (width - barWidth) / 2;
    const barY = height - 100;
    
    ctx.strokeStyle = '#FFD93D';
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    ctx.fillStyle = '#FFD93D';
    ctx.fillRect(barX, barY, barWidth * (this.timer / this.duration), barHeight);
  }
}