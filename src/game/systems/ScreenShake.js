export class ScreenShake {
  constructor(camera) {
    this.camera = camera;
    this.intensity = 0;
    this.duration = 0;
    this.time = 0;
  }

  shake(intensity = 10, duration = 0.8) {
    // Only override if new shake is stronger
    if (intensity > this.intensity * (1 - this.time / Math.max(this.duration, 0.001))) {
      this.intensity = intensity;
      this.duration = duration;
      this.time = 0;
    }
  }

  update(deltaTime) {
    if (this.time < this.duration) {
      this.time += deltaTime;

      const progress = this.time / this.duration;
      // Exponential decay for punchier shake
      const currentIntensity = this.intensity * Math.pow(1 - progress, 2);

      // Apply random shake
      this.camera.offsetX = (Math.random() - 0.5) * currentIntensity * 2;
      this.camera.offsetY = (Math.random() - 0.5) * currentIntensity * 2;
    } else {
      this.camera.offsetX = 0;
      this.camera.offsetY = 0;
    }
  }
}