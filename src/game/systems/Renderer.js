export class Renderer {
  constructor(ctx, camera) {
    this.ctx = ctx;
    this.camera = camera;

    // Rendering layers
    this.layers = new Map([
      ['background', []],
      ['floor', []],
      ['entities', []],
      ['effects', []],
      ['ui', []]
    ]);

    // Rendering settings
    this.debug = {
      showCollisionBoxes: false,
      showGrid: false,
      gridSize: 32
    };
  }

  clear() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  // Add renderable to a specific layer
  addToLayer(layer, renderable) {
    if (this.layers.has(layer)) {
      this.layers.get(layer).push(renderable);
    }
  }

  // Clear a specific layer
  clearLayer(layer) {
    if (this.layers.has(layer)) {
      this.layers.set(layer, []);
    }
  }

  // Clear all layers
  clearAllLayers() {
    for (const layer of this.layers.keys()) {
      this.clearLayer(layer);
    }
  }

  // Main render method
  render(interpolation = 1) {
    // Render world-space layers
    this.camera.applyTransform(this.ctx);

    // Render each layer in order
    this.renderLayer('background', interpolation);
    this.renderLayer('floor', interpolation);
    this.renderLayer('entities', interpolation);
    this.renderLayer('effects', interpolation);

    // Debug rendering
    if (this.debug.showGrid) {
      this.renderGrid();
    }

    this.camera.resetTransform(this.ctx);

    // Render UI layer (screen-space)
    this.renderLayer('ui', interpolation);
  }

  renderLayer(layerName, interpolation) {
    const layer = this.layers.get(layerName);
    if (!layer) return;

    for (const renderable of layer) {
      if (renderable.render) {
        renderable.render(this.ctx, interpolation);
      } else if (typeof renderable === 'function') {
        renderable(this.ctx, interpolation);
      }
    }

    // Clear the layer after rendering (single-frame renderables)
    this.clearLayer(layerName);
  }

  // Sprite rendering utilities
  drawSprite(image, x, y, width, height, options = {}) {
    if (!image) return;

    const {
      rotation = 0,
      scaleX = 1,
      scaleY = 1,
      alpha = 1,
      flipX = false,
      flipY = false
    } = options;

    this.ctx.save();

    // Set alpha
    this.ctx.globalAlpha = alpha;

    // Translate to sprite center
    this.ctx.translate(x + width / 2, y + height / 2);

    // Apply rotation
    if (rotation !== 0) {
      this.ctx.rotate(rotation);
    }

    // Apply scale and flip
    this.ctx.scale(
      scaleX * (flipX ? -1 : 1),
      scaleY * (flipY ? -1 : 1)
    );

    // Draw sprite centered
    this.ctx.drawImage(
      image,
      -width / 2,
      -height / 2,
      width,
      height
    );

    this.ctx.restore();

    // Debug collision box
    if (this.debug.showCollisionBoxes) {
      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, width, height);
    }
  }

  // Draw animated sprite from sprite sheet
  drawAnimatedSprite(image, x, y, width, height, animation) {
    if (!image || !animation) return;

    const { frameX, frameY, frameWidth, frameHeight } = animation;

    this.ctx.drawImage(
      image,
      frameX, frameY, frameWidth, frameHeight,
      x, y, width, height
    );
  }

  // Text rendering
  drawText(text, x, y, options = {}) {
    const {
      font = '16px Arial',
      color = '#000000',
      align = 'left',
      baseline = 'top',
      stroke = false,
      strokeColor = '#ffffff',
      strokeWidth = 2,
      alpha = 1
    } = options;

    this.ctx.save();

    this.ctx.font = font;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;
    this.ctx.globalAlpha = alpha;

    if (stroke) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.strokeText(text, x, y);
    }

    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);

    this.ctx.restore();
  }

  // Shape rendering
  drawRect(x, y, width, height, options = {}) {
    const {
      color = '#000000',
      stroke = false,
      strokeColor = '#ffffff',
      strokeWidth = 1,
      alpha = 1
    } = options;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    if (stroke) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.strokeRect(x, y, width, height);
    } else {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, width, height);
    }

    this.ctx.restore();
  }

  drawCircle(x, y, radius, options = {}) {
    const {
      color = '#000000',
      stroke = false,
      strokeColor = '#ffffff',
      strokeWidth = 1,
      alpha = 1
    } = options;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);

    if (stroke) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.stroke();
    } else {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  // Debug rendering
  renderGrid() {
    const viewportX = this.camera.getViewportX();
    const viewportY = this.camera.getViewportY();
    const viewportWidth = this.camera.viewportWidth / this.camera.zoom;
    const viewportHeight = this.camera.viewportHeight / this.camera.zoom;

    const startX = Math.floor(viewportX / this.debug.gridSize) * this.debug.gridSize;
    const startY = Math.floor(viewportY / this.debug.gridSize) * this.debug.gridSize;
    const endX = viewportX + viewportWidth;
    const endY = viewportY + viewportHeight;

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = startX; x <= endX; x += this.debug.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += this.debug.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
      this.ctx.stroke();
    }
  }
}