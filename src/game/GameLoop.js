export class GameLoop {
  constructor(updateCallback, renderCallback) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
    this.isRunning = false;
    this.lastTime = 0;
    this.accumulator = 0;
    this.timestep = 1000 / 60; // 60 FPS
    this.maxUpdateSteps = 240; // Prevent spiral of death
    this.frameId = null;

    // Performance monitoring
    this.fps = 0;
    this.frameCount = 0;
    this.fpsUpdateInterval = 1000;
    this.lastFpsUpdate = 0;
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  loop = (currentTime) => {
    if (!this.isRunning) return;

    this.frameId = requestAnimationFrame(this.loop);

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Update FPS counter
    this.frameCount++;
    if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }

    // Prevent huge delta times (e.g., when tab loses focus)
    const clampedDeltaTime = Math.min(deltaTime, this.maxUpdateSteps);
    this.accumulator += clampedDeltaTime;

    // Fixed timestep updates
    let updateSteps = 0;
    while (this.accumulator >= this.timestep && updateSteps < this.maxUpdateSteps) {
      this.updateCallback(this.timestep / 1000); // Convert to seconds
      this.accumulator -= this.timestep;
      updateSteps++;
    }

    // Interpolation value for smooth rendering
    const interpolation = this.accumulator / this.timestep;

    // Render
    this.renderCallback(interpolation);
  };

  getFPS() {
    return this.fps;
  }
}