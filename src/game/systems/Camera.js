export class Camera {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.x = 0;
    this.y = 0;
    this.target = null;
    this.offsetX = 0;
    this.offsetY = 0;

    // Smooth follow
    this.smoothing = 0.1;
  }

  follow(entity) {
    this.target = entity;
  }

  update(deltaTime) {
    if (this.target) {
      const targetX = this.target.getCenterX() - this.width / 2;
      const targetY = this.target.getCenterY() - this.height / 2;

      this.x += (targetX - this.x) * this.smoothing;
      this.y += (targetY - this.y) * this.smoothing;
    }
  }

  getTransform() {
    return {
      x: -this.x + this.offsetX,
      y: -this.y + this.offsetY
    };
  }

  setBounds(minX, minY, maxX, maxY) {
    this.x = Math.max(minX, Math.min(maxX - this.width, this.x));
    this.y = Math.max(minY, Math.min(maxY - this.height, this.y));
  }
}