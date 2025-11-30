import { State } from './State.js';
import { PlayingState } from './PlayingState.js';
import { wetcatWeb3 } from '../../web3/WETCATWeb3.js';
import { worldID } from '../../web3/WorldIDIntegration.js';
import { worldApp } from '../../web3/WorldAppIntegration.js';

export class MenuState extends State {
  constructor(game) {
    super(game);
    this.menuItems = [
      { text: 'Start Game', action: () => this.startGame() },
      { text: 'Instructions', action: () => this.showInstructions() }
    ];
    this.selectedIndex = 0;
    this.showingInstructions = false;

    // Background image
    this.backgroundImage = null;
    this.imageLoaded = false;

    // Background music
    this.bgMusic = null;
    this.musicLoaded = false;

    // Menu selection sound
    this.selectSound = null;

    // Web3 connection state
    this.isConnecting = false;
    this.connectionError = null;
    this.walletBalance = '0';

    // World App detection
    this.isWorldApp = worldApp.isWorldApp;

    // Setup Web3 listeners
    this.setupWeb3Listeners();
  }

  setupWeb3Listeners() {
    wetcatWeb3.on('connected', (data) => {
      this.isConnecting = false;
      this.connectionError = null;
      this.updateBalance();
    });

    wetcatWeb3.on('disconnected', () => {
      this.walletBalance = '0';
    });

    wetcatWeb3.on('balanceUpdated', (data) => {
      this.walletBalance = parseFloat(data.balance).toFixed(2);
    });

    wetcatWeb3.on('error', (error) => {
      this.isConnecting = false;
      this.connectionError = error.message || 'Connection failed';
    });
  }

  async updateBalance() {
    const balance = await wetcatWeb3.updateBalance();
    if (balance) {
      this.walletBalance = parseFloat(balance).toFixed(2);
    }
  }

  async connectWallet() {
    if (this.isConnecting) return;

    this.isConnecting = true;
    this.connectionError = null;

    try {
      await wetcatWeb3.connect();
    } catch (error) {
      this.connectionError = error.message;
      this.isConnecting = false;
    }
  }

  async verifyWithWorldID() {
    try {
      await worldID.verifyWithOrb();
      // Haptic feedback in World App
      if (this.isWorldApp) {
        worldApp.triggerHaptic('medium');
      }
    } catch (error) {
      console.error('World ID verification failed:', error);
    }
  }

  enter() {
    this.selectedIndex = 0;
    this.showingInstructions = false;

    // DEBUG: Auto-start game after 3 seconds - DISABLED
    // setTimeout(() => {
    //   console.log('🚀 AUTO-STARTING GAME FOR DEBUG...');
    //   this.startGame();
    // }, 3000);

    // Create and setup background image if not already created
    if (!this.backgroundImage) {
      this.backgroundImage = new Image();
      this.backgroundImage.src = 'menu_background.jpg';

      this.backgroundImage.onload = () => {
        this.imageLoaded = true;
      };

      this.backgroundImage.onerror = (e) => {
        console.error('Background image loading error:', e);
        this.imageLoaded = false;
      };
    }

    // Create and setup background music if not already created
    if (!this.bgMusic) {
      this.bgMusic = new Audio('wetcat-song-1.mp3');
      this.bgMusic.loop = true;
      this.bgMusic.volume = 0.5; // Set to 50% volume

      // Start playing when loaded
      this.bgMusic.addEventListener('loadeddata', () => {
        this.musicLoaded = true;
        this.bgMusic.play().catch(e => console.log('Music play failed:', e));
      });

      // Load the music
      this.bgMusic.load();
    } else {
      // Resume playing if returning to menu
      this.bgMusic.play().catch(e => console.log('Music play failed:', e));
    }

    // Create menu selection sound if not already created
    if (!this.selectSound) {
      this.selectSound = new Audio('menu_select.mp3');
      this.selectSound.volume = 0.7; // Slightly louder than music
    }
  }

  exit() {
    // Pause music when leaving menu
    if (this.bgMusic) {
      this.bgMusic.pause();
    }
  }

  update(deltaTime) {
    const input = this.game.inputManager;

    if (this.showingInstructions) {
      if (input.isKeyPressed('Escape') || input.isKeyPressed('Enter')) {
        this.showingInstructions = false;
      }
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
    if (mousePos && !this.showingInstructions) {
      const { width, height } = this.game;

      // Check for Web3 panel clicks first
      if (input.isMouseButtonPressed(0)) {
        if (this.handleWeb3Click(mousePos.x, mousePos.y)) {
          return; // Click was handled by Web3 panel
        }
      }

      const menuStartY = height * 0.7; // Menu starts at 70% down

      // Check each menu item
      for (let i = 0; i < this.menuItems.length; i++) {
        const y = menuStartY + i * 60;
        const itemTop = y - 25;
        const itemBottom = y + 25;
        const itemLeft = width / 2 - 200;
        const itemRight = width / 2 + 200;

        if (mousePos.x >= itemLeft && mousePos.x <= itemRight &&
            mousePos.y >= itemTop && mousePos.y <= itemBottom) {
          // Mouse is over this item
          if (this.selectedIndex !== i) {
            this.selectedIndex = i;
            this.playSelectSound();
          }

          // Check for click
          if (input.isMouseButtonPressed(0)) { // 0 = left mouse button
            console.log('Mouse clicked on menu item:', this.menuItems[this.selectedIndex].text);
            this.playSelectSound();
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

    // Draw background image if loaded
    if (this.backgroundImage && this.imageLoaded) {
      // Scale image to cover the entire canvas
      const imgAspect = this.backgroundImage.width / this.backgroundImage.height;
      const canvasAspect = width / height;

      let drawWidth, drawHeight, drawX, drawY;

      if (imgAspect > canvasAspect) {
        // Image is wider - fit height, crop width
        drawHeight = height;
        drawWidth = height * imgAspect;
        drawX = (width - drawWidth) / 2;
        drawY = 0;
      } else {
        // Image is taller - fit width, crop height
        drawWidth = width;
        drawHeight = width / imgAspect;
        drawX = 0;
        drawY = (height - drawHeight) / 2;
      }

      ctx.drawImage(this.backgroundImage, drawX, drawY, drawWidth, drawHeight);
    } else {
      // Fallback background with gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(0.5, '#2d2d4e');
      gradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Add some crypto-themed decorations
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#FFD93D';
      ctx.font = '48px Arial';
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.fillText('$', x, y);
      }
      ctx.restore();
    }

    if (this.showingInstructions) {
      this.renderInstructions(ctx);
      return;
    }

    ctx.save();

    // Draw game title
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText('$WETCAT', width / 2 + 4, height * 0.25 + 4);
    ctx.fillStyle = '#FFD93D';
    ctx.fillText('$WETCAT', width / 2, height * 0.25);

    // Subtitle
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText('SURVIVORS', width / 2, height * 0.35);

    ctx.font = '24px Arial';
    ctx.fillStyle = '#4FC3F7';
    ctx.fillText('Get Soaked!', width / 2, height * 0.45);

    // Render Web3 connect panel in top-right
    this.renderWeb3Panel(ctx, width, height);

    // Menu items - positioned in bottom third
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const menuStartY = height * 0.6; // Start at 60% down the screen

    this.menuItems.forEach((item, index) => {
      const y = menuStartY + index * 60;

      if (index === this.selectedIndex) {
        // Highlight selected item with semi-transparent background
        ctx.fillStyle = 'rgba(255, 217, 61, 0.8)';
        ctx.fillRect(width / 2 - 200, y - 25, 400, 50);

        // Selected text
        ctx.fillStyle = '#1a1a2e';
        ctx.fillText(item.text, width / 2, y);
      } else {
        // Non-selected items with shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillText(item.text, width / 2 + 2, y + 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(item.text, width / 2, y);
      }
    });

    ctx.restore();
  }

  renderInstructions(ctx) {
    const { width, height } = this.game;

    ctx.save();

    // Draw light brown background box with rounded corners
    const boxWidth = 700;
    const boxHeight = 580; // Increased height to fit all text
    const boxX = (width - boxWidth) / 2;
    const boxY = height * 0.08;
    const borderRadius = 20;

    // Helper function to draw rounded rectangle
    const drawRoundedRect = (x, y, width, height, radius) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    // Box shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    drawRoundedRect(boxX + 5, boxY + 5, boxWidth, boxHeight, borderRadius);
    ctx.fill();

    // Main box with transparency
    ctx.fillStyle = 'rgba(26, 26, 46, 0.95)'; // Dark blue with 95% opacity
    drawRoundedRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
    ctx.fill();

    // Box border
    ctx.strokeStyle = '#FFD93D';
    ctx.lineWidth = 3;
    drawRoundedRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HOW TO GET SOAKED', width / 2, boxY + 50);

    ctx.font = '20px Arial'; // Reduced from 24px
    const instructions = [
      'Survive 30 minutes of crypto chaos!',
      '',
      'CONTROLS:',
      'WASD/Arrow Keys - Move',
      'Shift - Sprint (uses stamina)',
      'P/Escape - Pause',
      '',
      'GAMEPLAY:',
      '• Collect $WETCAT coins automatically when near them',
      '• Deliver coins to crypto wallets',
      '• Scammers will steal coins - splash them away!',
      '• Keep FUD below 100% or you get rekt',
      '• Level up to choose upgrades',
      '',
      'Press Enter or Escape to return'
    ];

    const lineHeight = 28; // Spacing between lines
    const startY = boxY + 100; // Start text below title

    instructions.forEach((line, index) => {
      ctx.fillText(line, width / 2, startY + index * lineHeight);
    });

    ctx.restore();
  }

  startGame() {
    console.log('Starting game...');
    try {
      // Create a fresh PlayingState instance to ensure clean state
      const freshPlayingState = new PlayingState(this.game);
      this.game.stateManager.registerState('playing', freshPlayingState);

      console.log('Changing to playing state...');
      this.game.stateManager.changeState('playing');
    } catch (error) {
      console.error('Error starting game:', error);
    }
  }

  showInstructions() {
    this.showingInstructions = true;
  }

  playSelectSound() {
    if (this.selectSound) {
      // Reset the sound to play from beginning
      this.selectSound.currentTime = 0;
      this.selectSound.play().catch(e => console.log('Select sound play failed:', e));
    }
  }

  renderWeb3Panel(ctx, width, height) {
    const panelWidth = 280;
    const panelHeight = wetcatWeb3.connectionStatus === 'connected' ? 140 : 90;
    const panelX = width - panelWidth - 20;
    const panelY = 20;

    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Panel border
    ctx.strokeStyle = '#FFD93D';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // World App badge if detected
    if (this.isWorldApp) {
      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('WORLD APP', panelX + 10, panelY + 15);
    }

    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('$WETCAT Wallet', panelX + 10, panelY + 32);

    if (wetcatWeb3.connectionStatus === 'disconnected') {
      // Connect wallet button
      const buttonX = panelX + 10;
      const buttonY = panelY + 45;
      const buttonWidth = panelWidth - 20;
      const buttonHeight = 32;

      ctx.fillStyle = this.isConnecting ? '#888' : '#FFD93D';
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        this.isConnecting ? 'Connecting...' : (this.isWorldApp ? 'Connect World App' : 'Connect Wallet'),
        buttonX + buttonWidth / 2,
        buttonY + 21
      );

      // Store button bounds for click detection
      this.connectButtonBounds = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

      // Show error if any
      if (this.connectionError) {
        ctx.fillStyle = '#ff4444';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.connectionError, panelX + panelWidth / 2, panelY + panelHeight - 8);
      }

    } else if (wetcatWeb3.connectionStatus === 'connected') {
      // Connected state
      ctx.fillStyle = '#fff';
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';

      const formattedAccount = wetcatWeb3.formatAddress(wetcatWeb3.account);
      ctx.fillText(`Wallet: ${formattedAccount}`, panelX + 10, panelY + 52);

      // Balance
      ctx.fillStyle = '#FFD93D';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(`${this.walletBalance} $WETCAT`, panelX + 10, panelY + 78);

      // World ID verification status
      if (worldID.isVerified()) {
        ctx.fillStyle = '#4CAF50';
        ctx.font = '12px Arial';
        const level = worldID.getVerificationLevel();
        const multiplier = worldID.getRewardMultiplier();
        ctx.fillText(`Verified (${level}) - ${multiplier}x rewards`, panelX + 10, panelY + 100);
      } else {
        // Verify button
        const verifyButtonX = panelX + 10;
        const verifyButtonY = panelY + 95;
        const verifyButtonWidth = panelWidth - 20;
        const verifyButtonHeight = 28;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(verifyButtonX, verifyButtonY, verifyButtonWidth, verifyButtonHeight);
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 1;
        ctx.strokeRect(verifyButtonX, verifyButtonY, verifyButtonWidth, verifyButtonHeight);

        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Verify with World ID (2x rewards)', verifyButtonX + verifyButtonWidth / 2, verifyButtonY + 18);

        // Store button bounds
        this.verifyButtonBounds = { x: verifyButtonX, y: verifyButtonY, width: verifyButtonWidth, height: verifyButtonHeight };
      }

      // On World Chain indicator
      ctx.fillStyle = '#888';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('World Chain', panelX + panelWidth - 10, panelY + panelHeight - 8);
    }
  }

  // Check if point is in button bounds
  isPointInButton(x, y, bounds) {
    if (!bounds) return false;
    return x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height;
  }

  // Handle Web3 panel clicks
  handleWeb3Click(x, y) {
    if (wetcatWeb3.connectionStatus === 'disconnected') {
      if (this.isPointInButton(x, y, this.connectButtonBounds)) {
        this.connectWallet();
        return true;
      }
    } else if (wetcatWeb3.connectionStatus === 'connected' && !worldID.isVerified()) {
      if (this.isPointInButton(x, y, this.verifyButtonBounds)) {
        this.verifyWithWorldID();
        return true;
      }
    }
    return false;
  }
}