export class ScreenShake {
  constructor(camera) {
    this.camera = camera;
    this.intensity = 0;
    this.duration = 0;
    this.time = 0;
  }
  
  shake(intensity = 10, duration = 0.5) {
    this.intensity = intensity;
    this.duration = duration;
    this.time = 0;
  }
  
  update(deltaTime) {
    if (this.time < this.duration) {
      this.time += deltaTime;
      
      const progress = this.time / this.duration;
      const currentIntensity = this.intensity * (1 - progress);
      
      // Apply random shake
      this.camera.offsetX = (Math.random() - 0.5) * currentIntensity * 2;
      this.camera.offsetY = (Math.random() - 0.5) * currentIntensity * 2;
    } else {
      this.camera.offsetX = 0;
      this.camera.offsetY = 0;
    }
  }
}