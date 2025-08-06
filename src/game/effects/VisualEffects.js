export class VisualEffects {
  static createCoinTrail(ctx, x, y, facing, intensity = 1) {
    ctx.save();
    ctx.globalAlpha = 0.3 * intensity;
    ctx.strokeStyle = '#FFD93D';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    const trailLength = 30 * intensity;
    const dx = facing === 'left' ? trailLength : -trailLength;
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y);
    ctx.stroke();
    
    ctx.restore();
  }
  
  static createGlowEffect(ctx, x, y, radius, color, intensity = 1) {
    ctx.save();
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color + Math.floor(255 * intensity).toString(16));
    gradient.addColorStop(0.5, color + Math.floor(128 * intensity).toString(16));
    gradient.addColorStop(1, color + '00');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  static drawPixelText(ctx, text, x, y, size = 16, color = '#FFFFFF') {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.font = `${size}px monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);
    
    // Draw text
    ctx.fillText(text, x, y);
    ctx.restore();
  }
}