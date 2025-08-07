import { State } from './State.js';
import { getRandomUpgrades } from '../data/upgrades.js';

export class UpgradeSelectionState extends State {
  constructor(game) {
    super(game);
    this.name = 'upgradeSelection';
    this.upgrades = [];
    this.selectedIndex = 0;
    this.animationTimer = 0;
    this.selectSound = null;
  }

  enter() {
    console.log('Entering upgrade selection state');

    // Get player's current upgrades
    const player = this.game.stateManager.getState('playing')?.player;
    const playerUpgrades = player?.upgradeLevels || {};

    // Get 3 random upgrades
    this.upgrades = getRandomUpgrades(3, playerUpgrades);

    // If no upgrades available, skip
    if (this.upgrades.length === 0) {
      this.game.stateManager.popState();
      return;
    }

    // Pause the game
    this.game.gameData.isPaused = true;
    this.selectedIndex = 0;
    this.animationTimer = 0;

    // Clear any lingering input state
    this.game.inputManager.update();

    // Initialize select sound if not already created
    if (!this.selectSound) {
      this.selectSound = new Audio('menu_select.mp3');
      this.selectSound.volume = 0.7;
    }

    // Play level up yay sound
    const yaySound = new Audio('yay.mp3');
    yaySound.volume = 0.5; // Reduced from 0.8 to be less jarring
    yaySound.play().catch(e => console.log('Yay sound play failed:', e));
  }

  exit() {
    // Unpause the game
    this.game.gameData.isPaused = false;
    // Ensure canvas has focus when returning to gameplay
    this.game.inputManager.ensureFocus();
  }

  update(deltaTime) {
    const input = this.game.inputManager;

    // Update animation
    this.animationTimer += deltaTime;

    // Simple input handling - use isKeyPressed for single press detection
    if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('a')) {
      console.log('Left arrow pressed, changing selection');
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.playSelectSound();
    }

    if (input.isKeyPressed('ArrowRight') || input.isKeyPressed('d')) {
      console.log('Right arrow pressed, changing selection');
      this.selectedIndex = Math.min(this.upgrades.length - 1, this.selectedIndex + 1);
      this.playSelectSound();
    }

    if (input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
      console.log('Enter/Space pressed, selecting upgrade');
      this.selectUpgrade();
    }

    // Number key shortcuts (1, 2, 3)
    for (let i = 0; i < this.upgrades.length; i++) {
      if (input.isKeyPressed((i + 1).toString())) {
        this.selectedIndex = i;
        this.selectUpgrade();
        break;
      }
    }

    // Mouse support
    const mousePos = input.getMousePosition();
    if (mousePos) {
      const cardWidth = 200;
      const cardSpacing = 20;
      const totalWidth = this.upgrades.length * cardWidth + (this.upgrades.length - 1) * cardSpacing;
      const startX = (this.game.width - totalWidth) / 2;

      for (let i = 0; i < this.upgrades.length; i++) {
        const cardX = startX + i * (cardWidth + cardSpacing);
        if (mousePos.x >= cardX && mousePos.x < cardX + cardWidth &&
            mousePos.y >= 200 && mousePos.y < 450) {
          if (this.selectedIndex !== i) {
            this.selectedIndex = i;
            this.playSelectSound();
          }

          if (input.isMouseButtonPressed(0)) { // 0 = left mouse button
            this.selectUpgrade();
          }
        }
      }
    }
  }

  render(renderer, interpolation) {
    const ctx = renderer.ctx;
    const { width, height } = this.game;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL UP!', width / 2, 100);

    ctx.font = '20px Arial';
    ctx.fillText('Choose an upgrade:', width / 2, 140);

    // Render upgrade cards
    const cardWidth = 200;
    const cardHeight = 250;
    const cardSpacing = 20;
    const totalWidth = this.upgrades.length * cardWidth + (this.upgrades.length - 1) * cardSpacing;
    const startX = (width - totalWidth) / 2;
    const cardY = 200;

    this.upgrades.forEach((upgrade, index) => {
      const cardX = startX + index * (cardWidth + cardSpacing);
      const isSelected = index === this.selectedIndex;

      // Card glow effect
      if (isSelected) {
        const glowSize = 5 + Math.sin(this.animationTimer * 4) * 2;
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = glowSize;
      }

      // Card background
      ctx.fillStyle = isSelected ? '#4a4a4a' : '#2a2a2a';
      ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

      // Card border
      ctx.strokeStyle = isSelected ? '#ffff00' : '#666';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

      ctx.shadowBlur = 0;

      // Upgrade icon
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(upgrade.icon || '✨', cardX + cardWidth / 2, cardY + 60);

      // Upgrade name
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = '#fff';
      ctx.fillText(upgrade.name, cardX + cardWidth / 2, cardY + 100);

      // Current level
      const player = this.game.stateManager.getState('playing')?.player;
      const currentLevel = player?.upgradeLevels?.[upgrade.id] || 0;

      if (currentLevel > 0) {
        ctx.font = '14px Arial';
        ctx.fillStyle = '#aaa';
        ctx.fillText(`Level ${currentLevel} → ${currentLevel + 1}`, cardX + cardWidth / 2, cardY + 125);
      }

      // Description
      ctx.font = '14px Arial';
      ctx.fillStyle = '#ddd';
      const lines = this.wrapText(upgrade.description, cardWidth - 20);
      lines.forEach((line, i) => {
        ctx.fillText(line, cardX + cardWidth / 2, cardY + 155 + i * 20);
      });

      // Effect preview
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#00ff00';
      const effectText = upgrade.getDescription(currentLevel + 1);
      const effectLines = this.wrapText(effectText, cardWidth - 20, 'bold 16px Arial');
      effectLines.forEach((line, i) => {
        ctx.fillText(line, cardX + cardWidth / 2, cardY + 210 + i * 20);
      });
    });

    // Instructions
    ctx.font = '16px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('Use ← → or mouse to select, Enter/Space/Click/1-3 to confirm', width / 2, height - 50);

    ctx.restore();
  }

  selectUpgrade() {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.upgrades.length) return;

    const upgrade = this.upgrades[this.selectedIndex];
    const playingState = this.game.stateManager.getState('playing');
    const player = playingState?.player;

    if (player) {
      // Initialize upgrade levels if needed
      if (!player.upgradeLevels) {
        player.upgradeLevels = {};
      }

      // Apply upgrade
      const currentLevel = player.upgradeLevels[upgrade.id] || 0;
      player.upgradeLevels[upgrade.id] = currentLevel + 1;
      upgrade.effect(player, currentLevel + 1);

      // Visual feedback
      playingState.particles.push({
        type: 'levelup',
        x: player.getCenterX(),
        y: player.getCenterY(),
        lifetime: 2,
        age: 0
      });
    }

    // Return to game
    this.game.stateManager.popState();
  }

  wrapText(text, maxWidth, font = '14px Arial') {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    const ctx = this.game.ctx;
    const savedFont = ctx.font;
    ctx.font = font;

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    ctx.font = savedFont; // Restore original font
    return lines;
  }

  playSelectSound() {
    if (this.selectSound) {
      this.selectSound.currentTime = 0;
      this.selectSound.play().catch(e => console.log('Select sound play failed:', e));
    }
  }
}