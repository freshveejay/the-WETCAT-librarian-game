import { State } from './State.js';

export class GameOverState extends State {
  constructor(game) {
    super(game);
    this.won = false;
    this.reason = '';
    this.stats = {};
    this.menuItems = [
      { text: 'Play Again', action: () => this.playAgain() },
      { text: 'Share Score', action: () => this.shareScore() },
      { text: 'Main Menu', action: () => this.mainMenu() }
    ];
    this.selectedIndex = 0;
    this.selectSound = null;

    // Video background
    this.video = null;
    this.videoLoaded = false;
  }

  enter(data) {
    this.won = data.won || false;
    this.reason = data.reason || '';
    this.selectedIndex = 0;

    // Initialize select sound if not already created
    if (!this.selectSound) {
      this.selectSound = new Audio('menu_select.mp3');
      this.selectSound.volume = 0.7;
    }

    // Play "uh oh" sound if player lost
    if (!this.won) {
      const uhOhSound = new Audio('uh_oh.mp3');
      uhOhSound.volume = 0.6;
      uhOhSound.play().catch(e => console.log('Uh oh sound play failed:', e));
    }

    // Create and setup video if not already created
    if (!this.video) {
      this.video = document.createElement('video');
      this.video.src = 'menu_background.mp4';
      this.video.loop = true;
      this.video.muted = true;
      this.video.autoplay = true;

      // Handle various video events for better reliability
      this.video.addEventListener('canplay', () => {
        this.videoLoaded = true;
        this.video.play().catch(e => console.log('Video play failed:', e));
      });

      // Also try playing on loadedmetadata
      this.video.addEventListener('loadedmetadata', () => {
        this.video.play().catch(e => console.log('Video play on metadata failed:', e));
      });

      // Handle errors
      this.video.addEventListener('error', (e) => {
        console.error('Video loading error:', e);
        this.videoLoaded = false;
      });

      // Force load the video
      this.video.load();
    } else {
      // Resume playing if returning to game over screen
      this.videoLoaded = true; // Assume it's loaded if we already created it
      this.video.play().catch(e => console.log('Video play failed:', e));
    }

    // Collect game stats
    const gameData = this.game.gameData;
    this.stats = {
      timeElapsed: Math.floor(gameData.elapsedTime),
      level: gameData.playerLevel,
      fudLevel: Math.floor(gameData.fudLevel || 0),
      coinsCollected: gameData.coinsCollected || 0,
      coinsDeposited: gameData.coinsDeposited || 0,
      scammersRepelled: gameData.scammersRepelled || 0,
      wetcatEarned: (gameData.coinsDeposited || 0) * 10 + (gameData.scammersRepelled || 0) * 5 + Math.floor((gameData.elapsedTime || 0) / 60) * 2
    };

    // Save high score
    this.highScores = this.game.saveHighScore({
      time: this.stats.timeElapsed,
      level: this.stats.level,
      coinsCollected: this.stats.coinsCollected,
      coinsDeposited: this.stats.coinsDeposited,
      won: this.won
    });

    // Check if this is a new high score
    this.isNewHighScore = this.highScores.length > 0 &&
      this.highScores[0].time === this.stats.timeElapsed &&
      this.highScores[0].level === this.stats.level;
  }

  exit() {
    // Pause video when leaving game over screen
    if (this.video) {
      this.video.pause();
    }
  }

  update(deltaTime) {
    const input = this.game.inputManager;

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
      const boxWidth = 700;
      const boxHeight = 650;
      const boxX = (width - boxWidth) / 2;
      const boxY = (height - boxHeight) / 2;

      // Check each menu item
      for (let i = 0; i < this.menuItems.length; i++) {
        const y = boxY + 480 + i * 50;
        const itemTop = y - 20;
        const itemBottom = y + 20;
        const itemLeft = boxX + 150;
        const itemRight = boxX + boxWidth - 150;

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

    // Draw video background if loaded
    if (this.video && this.videoLoaded && !this.video.paused) {
      try {
        // Scale video to cover the entire canvas
        const videoAspect = this.video.videoWidth / this.video.videoHeight;
        const canvasAspect = width / height;

        let drawWidth, drawHeight, drawX, drawY;

        if (videoAspect > canvasAspect) {
          // Video is wider - fit height, crop width
          drawHeight = height;
          drawWidth = height * videoAspect;
          drawX = (width - drawWidth) / 2;
          drawY = 0;
        } else {
          // Video is taller - fit width, crop height
          drawWidth = width;
          drawHeight = width / videoAspect;
          drawX = 0;
          drawY = (height - drawHeight) / 2;
        }

        ctx.drawImage(this.video, drawX, drawY, drawWidth, drawHeight);
      } catch (e) {
        // Fallback to solid color if video fails
        ctx.fillStyle = this.won ? '#4169E1' : '#8B0000';
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      // Fallback background color
      ctx.fillStyle = this.won ? '#4169E1' : '#8B0000';
      ctx.fillRect(0, 0, width, height);
    }

    // Result box with rounded corners
    const boxWidth = 700;
    const boxHeight = 650;
    const boxX = (width - boxWidth) / 2;
    const boxY = (height - boxHeight) / 2;
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

    // Draw box background with transparency
    drawRoundedRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)'; // Semi-transparent dark blue
    ctx.fill();

    ctx.strokeStyle = '#FFD93D';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.fillStyle = this.won ? '#4CAF50' : '#FF4444';
    ctx.font = 'bold 64px Arial';
    ctx.fillText(this.won ? 'VICTORY!' : 'GAME OVER', width / 2, boxY + 80);

    // Subtitle
    ctx.fillStyle = '#FFD93D';
    ctx.font = '24px Arial';
    if (this.won) {
      ctx.fillText(`MOON MISSION COMPLETE! You earned ${this.stats.wetcatEarned} $WETCAT!`, width / 2, boxY + 130);
    } else {
      let message = `You got REKT! Earned ${this.stats.wetcatEarned} $WETCAT before the crash.`;
      if (this.reason !== 'chaos') {
        message = `The FUD got too strong... Earned ${this.stats.wetcatEarned} $WETCAT.`;
      }
      ctx.fillText(message, width / 2, boxY + 130);
    }

    // Stats
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    const statX = boxX + 100;
    let statY = boxY + 200;

    const minutes = Math.floor(this.stats.timeElapsed / 60);
    const seconds = this.stats.timeElapsed % 60;

    const statLines = [
      `Time Survived: ${minutes}:${seconds.toString().padStart(2, '0')}`,
      `Final Level: ${this.stats.level}`,
      `Peak FUD: ${this.stats.fudLevel}%`,
      `$WETCAT Collected: ${this.stats.coinsCollected}`,
      `Coins Delivered: ${this.stats.coinsDeposited}`,
      `Scammers Splashed: ${this.stats.scammersRepelled}`,
      `$WETCAT Earned: ${this.stats.wetcatEarned}`
    ];

    statLines.forEach(line => {
      ctx.fillText(line, statX, statY);
      statY += 30;
    });

    // New high score banner
    if (this.isNewHighScore) {
      ctx.save();
      ctx.fillStyle = '#FFD93D';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('NEW HIGH SCORE!', width / 2, boxY + 410);
      ctx.restore();
    }

    // High scores section
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('TOP SCORES:', boxX + 400, boxY + 200);

    ctx.font = '14px Arial';
    ctx.fillStyle = '#fff';
    const highScores = this.game.getHighScores();
    for (let i = 0; i < Math.min(5, highScores.length); i++) {
      const score = highScores[i];
      const mins = Math.floor(score.time / 60);
      const secs = score.time % 60;
      const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
      const wonStr = score.won ? '(WIN)' : '';
      ctx.fillText(
        `${i + 1}. ${timeStr} - Lvl ${score.level} ${wonStr}`,
        boxX + 400,
        boxY + 225 + i * 22
      );
    }

    // Menu items
    ctx.textAlign = 'center';
    ctx.font = '32px Arial';
    this.menuItems.forEach((item, index) => {
      const y = boxY + 480 + index * 50;

      if (index === this.selectedIndex) {
        ctx.fillStyle = '#FFD93D';
        ctx.fillRect(boxX + 150, y - 20, boxWidth - 300, 40);
        ctx.fillStyle = '#1a1a2e';
      } else {
        ctx.fillStyle = '#FFD93D';
      }

      ctx.fillText(item.text, width / 2, y);
    });

    ctx.restore();
  }

  playAgain() {
    this.game.stateManager.changeState('playing');
  }

  shareScore() {
    const mins = Math.floor(this.stats.timeElapsed / 60);
    const secs = this.stats.timeElapsed % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    const result = this.won ? 'WON' : 'survived';

    const text = encodeURIComponent(
      `I just ${result} in WETCAT Survivors!\n\n` +
      `$WETCAT Earned: ${this.stats.wetcatEarned}\n` +
      `Level: ${this.stats.level}\n` +
      `Time: ${timeStr}\n` +
      `Scammers Splashed: ${this.stats.scammersRepelled}\n\n` +
      `Can you beat my score? Play now!\n` +
      `https://wetcat-survivors.vercel.app\n\n` +
      `#WETCAT #PlayToEarn #Web3Gaming`
    );

    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://wetcat-survivors.vercel.app')}&text=${text}`, '_blank');
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