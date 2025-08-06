export class Entity {
  constructor(x, y, width, height) {
    // Position
    this.x = x;
    this.y = y;

    // Size
    this.width = width;
    this.height = height;

    // Velocity
    this.vx = 0;
    this.vy = 0;

    // State
    this.active = true;
    this.visible = true;

    // Collision
    this.solid = true;
    this.collisionBox = {
      offsetX: 0,
      offsetY: 0,
      width: width,
      height: height
    };
  }

  update(deltaTime) {
    // Override in subclasses
  }

  render(ctx, interpolation) {
    // Override in subclasses
  }

  // Get collision bounds
  getBounds() {
    return {
      x: this.x + this.collisionBox.offsetX,
      y: this.y + this.collisionBox.offsetY,
      width: this.collisionBox.width,
      height: this.collisionBox.height
    };
  }

  // Get center position
  getCenterX() {
    return this.x + this.width / 2;
  }

  getCenterY() {
    return this.y + this.height / 2;
  }

  // Distance to another entity
  distanceTo(other) {
    const dx = this.getCenterX() - other.getCenterX();
    const dy = this.getCenterY() - other.getCenterY();
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Check collision with another entity
  collidesWith(other) {
    if (!this.solid || !other.solid) return false;

    const a = this.getBounds();
    const b = other.getBounds();

    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }

  // Check if point is inside entity
  containsPoint(x, y) {
    const bounds = this.getBounds();
    return x >= bounds.x &&
           x <= bounds.x + bounds.width &&
           y >= bounds.y &&
           y <= bounds.y + bounds.height;
  }
}