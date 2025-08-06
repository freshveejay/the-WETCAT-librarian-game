export class GameDebugger {
  constructor(game) {
    this.game = game;
    this.debugInfo = {
      assetLoadStatus: {},
      playerPosition: { x: 0, y: 0 },
      playerVelocity: { x: 0, y: 0 },
      spriteInfo: {},
      errors: []
    };
    
    // Hook into asset loader
    this.monitorAssetLoading();
    
    // Create debug panel
    this.createDebugPanel();
  }
  
  monitorAssetLoading() {
    const originalLoadImage = this.game.assetLoader.loadImage.bind(this.game.assetLoader);
    
    this.game.assetLoader.loadImage = async (name, path) => {
      this.debugInfo.assetLoadStatus[name] = 'loading';
      
      try {
        const result = await originalLoadImage(name, path);
        this.debugInfo.assetLoadStatus[name] = result ? 'loaded' : 'failed';
        return result;
      } catch (error) {
        this.debugInfo.assetLoadStatus[name] = 'error';
        this.debugInfo.errors.push(`Failed to load ${name}: ${error.message}`);
        throw error;
      }
    };
  }
  
  createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'game-debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      max-width: 300px;
      z-index: 10000;
      border: 1px solid #0f0;
    `;
    
    document.body.appendChild(panel);
    
    // Update debug info every frame
    setInterval(() => this.updateDebugPanel(), 100);
  }
  
  updateDebugPanel() {
    const panel = document.getElementById('game-debug-panel');
    if (!panel) return;
    
    const player = this.game.stateManager.currentState?.player;
    if (player) {
      this.debugInfo.playerPosition = { x: Math.round(player.x), y: Math.round(player.y) };
      this.debugInfo.playerVelocity = { x: Math.round(player.vx), y: Math.round(player.vy) };
      this.debugInfo.spriteInfo = {
        isMoving: player.isMoving,
        animationFrame: player.animationFrame,
        facing: player.facing
      };
    }
    
    const html = `
      <h3 style="margin: 0 0 10px 0; color: #0f0;">WETCAT Debug</h3>
      
      <h4>Assets:</h4>
      ${Object.entries(this.debugInfo.assetLoadStatus).map(([name, status]) => 
        `<div style="color: ${status === 'loaded' ? '#0f0' : '#f00'}">${name}: ${status}</div>`
      ).join('')}
      
      <h4>Player:</h4>
      <div>Pos: ${this.debugInfo.playerPosition.x}, ${this.debugInfo.playerPosition.y}</div>
      <div>Vel: ${this.debugInfo.playerVelocity.x}, ${this.debugInfo.playerVelocity.y}</div>
      <div>Moving: ${this.debugInfo.spriteInfo.isMoving}</div>
      <div>Frame: ${this.debugInfo.spriteInfo.animationFrame}</div>
      <div>Facing: ${this.debugInfo.spriteInfo.facing}</div>
      
      ${this.debugInfo.errors.length > 0 ? `
        <h4 style="color: #f00;">Errors:</h4>
        ${this.debugInfo.errors.map(err => `<div style="color: #f00;">${err}</div>`).join('')}
      ` : ''}
    `;
    
    panel.innerHTML = html;
  }
  
  logError(error) {
    this.debugInfo.errors.push(error);
    console.error('[WETCAT Debug]', error);
  }
}