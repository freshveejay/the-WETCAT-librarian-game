import { State } from './State.js';
import { PlayingState } from './PlayingState.js';

export class PausedState extends State {
  constructor(game) {
    super(game);
    this.menuItems = [
      { text: 'Resume', action: () => this.resume() },
      { text: 'Restart', action: () => this.restart() },
      { text: 'Main Menu', action: () => this.mainMenu() }
    ];
    this.selectedIndex = 0;
    this.selectSound = null;
  }

  enter() {
    this.selectedIndex = 0;
    this.game.gameData.isPaused = true;

    // Initialize select sound if not already created
    if (!this.selectSound) {
      this.selectSound = new Audio('/menu_select.mp3');
      this.selectSound.volume = 0.7;
    }
  }

  exit() {
    this.game.gameData.isPaused = false;
  }

  update(deltaTime) {
    const input = this.game.inputManager;

    // Quick resume with same key
    if (input.isKeyPressed('p') || input.isKeyPressed('Escape')) {
      this.resume();
      return;
    }

    // Menu navigation
    if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('w')) {
      this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
      this.playSelectSound();
    }

    if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('s')) {
      this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
      this.playSelectSound();
    }

    if (input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
      this.menuItems[this.selectedIndex].action();
    }

    // Mouse support
    const mousePos = input.getMousePosition();
    if (mousePos) {
      const { width, height } = this.game;
      const boxWidth = 400;
      const boxHeight = 300;
      const boxX = (width - boxWidth) / 2;
      const boxY = (height - boxHeight) / 2;

      // Check each menu item
      for (let i = 0; i < this.menuItems.length; i++) {
        const y = boxY + 140 + i * 50;
        const itemTop = y - 20;
        const itemBottom = y + 20;
        const itemLeft = boxX + 50;
        const itemRight = boxX + boxWidth - 50;

        if (mousePos.x >= itemLeft && mousePos.x <= itemRight &&
            mousePos.y >= itemTop && mousePos.y <= itemBottom) {
          // Mouse is over this item
          if (this.selectedIndex !== i) {
            this.selectedIndex = i;
            this.playSelectSound();
          }

          // Check for click
          if (input.isMouseButtonPressed(0)) { // 0 = left mouse button
            this.menuItems[this.selectedIndex].action();
          }
          break;
        }
      }
    }
  }

  render(renderer, interpolation) {
    const ctx = renderer.ctx;
    const { width, height } = this.game;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    // Pause menu box
    const boxWidth = 400;
    const boxHeight = 300;
    const boxX = (width - boxWidth) / 2;
    const boxY = (height - boxHeight) / 2;

    ctx.fillStyle = '#f5e6d3';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    ctx.strokeStyle = '#3d2914';
    ctx.lineWidth = 4;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Title
    ctx.save();
    ctx.fillStyle = '#3d2914';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', width / 2, boxY + 60);

    // Menu items
    ctx.font = '32px Arial';
    this.menuItems.forEach((item, index) => {
      const y = boxY + 140 + index * 50;

      if (index === this.selectedIndex) {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(boxX + 50, y - 20, boxWidth - 100, 40);
        ctx.fillStyle = '#f5e6d3';
      } else {
        ctx.fillStyle = '#3d2914';
      }

      ctx.fillText(item.text, width / 2, y);
    });

    ctx.restore();
  }

  resume() {
    // Resume game music
    const playingState = this.game.stateManager.getState('playing');
    if (playingState && playingState.bgMusic) {
      playingState.bgMusic.play().catch(e => console.log('Game music resume failed:', e));
    }

    this.game.stateManager.popState();
  }

  restart() {
    // Clear the state stack to ensure clean restart
    this.game.stateManager.stateStack = [];

    // Also clear the current state to ensure we're starting fresh
    this.game.stateManager.currentState = null;

    // Force a fresh PlayingState instance to ensure clean state
    const freshPlayingState = new PlayingState(this.game);
    this.game.stateManager.registerState('playing', freshPlayingState);

    // Change to the fresh playing state
    this.game.stateManager.changeState('playing');
  }

  mainMenu() {
    this.game.stateManager.changeState('menu');
  }

  playSelectSound() {
    if (this.selectSound) {
      this.selectSound.currentTime = 0;
      this.selectSound.play().catch(e => console.log('Select sound play failed:', e));
    }
  }
}