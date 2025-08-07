import { State } from './State.js';
import { Player } from '../entities/Player.js';
import { Coin } from '../entities/Coin.js';
import { Wallet } from '../entities/Wallet.js';
import { Scammer } from '../entities/Scammer.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { Web3UI } from '../ui/Web3UI.js';
import { FUDDragon } from '../entities/bosses/FUDDragon.js';
import { RugPullMonster } from '../entities/bosses/RugPullMonster.js';
import { WhaleManipulator } from '../entities/bosses/WhaleManipulator.js';

export class PlayingState extends State {
  constructor(game) {
    super(game);
    console.log('🚀 PlayingState constructor called!');
    this.instanceId = Math.random().toString(36).substring(7); // Unique ID for debugging
    console.log(`[RESTART DEBUG] Creating new PlayingState instance: ${this.instanceId}`);
    this.player = null;
    this.scammers = []; // Scammers
    this.coins = []; // Coins
    this.wallets = []; // Wallets
    this.particleSystem = new ParticleSystem(game);
    this.weaponSystem = new WeaponSystem(game);
    this.web3UI = new Web3UI(game);

    // Session stats for Web3 rewards
    this.sessionStats = {
      coinsCollected: 0,
      scammersRepelled: 0,
      timeSurvived: 0,
      maxFudReached: 0,
      wetcatEarned: 0
    };

    // World bounds - minimal area just for bookshelves
    // Shelves: 8 cols, last shelf at x = 320 + 7*160 = 1440, shelf width = 64
    // So rightmost edge = 1440 + 64 = 1504
    // Shelves: 4 rows, last shelf at y = 240 + 3*200 = 840, shelf height = 96
    // So bottommost edge = 840 + 96 = 936
    // Add small buffer: 100 pixels on each side
    this.worldWidth = 1600; // Just enough for shelves + small buffer
    this.worldHeight = 1040; // Just enough for shelves + small buffer

    // Scammer spawning
    this.scammerSpawnTimer = 0;
    this.scammerSpawnInterval = 15; // Constant 15 seconds between spawns
    this.maxScammers = 3; // Starting max, will increase with waves
    this.lastMaxScammers = 3; // Track previous max to detect increases

    // Wave notification
    this.maxScammersIncreaseNotification = {
      active: false,
      increase: 0,
      timer: 0,
      duration: 3 // Show for 3 seconds
    };

    // Performance optimizations
    this.floorPattern = null; // Cache floor pattern
    this.patternCanvas = null; // Canvas for pattern

    // Background music
    this.bgMusic = null;
    this.musicLoaded = false;

    // Sound effects
    this.pickupSounds = []; // Array of audio elements for overlapping sounds
    this.shelfSound = null;

    this.spawnPoints = [
      { x: 50, y: 520 }, // Left entrance
      { x: 1550, y: 520 }, // Right entrance
      { x: 800, y: 50 }, // Top entrance
      { x: 800, y: 990 } // Bottom entrance
    ];
    
    // Boss system
    this.currentBoss = null;
    this.bossWarningTimer = 0;
    this.showBossWarning = false;
    this.currentWave = 0;
    this.bossSpawnWaves = {
      5: FUDDragon,
      10: RugPullMonster,
      15: WhaleManipulator
    };
    
    // Attack telegraphs
    this.telegraphs = [];
    
    // Tsunami waves (for WhaleManipulator)
    this.tsunamiWaves = [];
  }

  enter() {
    console.log('🎮 WETCAT PLAYING STATE ENTERED!');
    console.log(`[RESTART DEBUG] PlayingState.enter() called for instance: ${this.instanceId}`);
    console.log(`[RESTART DEBUG] scammers.length before clearing: ${this.scammers.length}`);

    // Clear any existing entities first to prevent accumulation
    this.scammers = [];
    this.coins = [];
    if (this.particleSystem) this.particleSystem.clear();
    this.wallets = [];

    // Reset game data
    this.game.gameData = {
      fudLevel: 0,
      maxFud: 100,
      playerLevel: 1,
      xp: 0,
      xpToNext: 100,
      elapsedTime: 0,
      targetTime: 30 * 60,
      isPaused: false,
      // Stats tracking
      coinsCollected: 0,
      coinsDeposited: 0,
      scammersRepelled: 0
    };

    // Ensure scammer spawning is reset to initial values
    this.maxScammers = 3;
    this.lastMaxScammers = 3;
    this.scammerSpawnTimer = 0;
    this.scammerSpawnInterval = 15;

    // Reset wave notification
    this.maxScammersIncreaseNotification = {
      active: false,
      increase: 0,
      timer: 0,
      duration: 3
    };

    console.log(`[SCAMMER SPAWNING] World dimensions: ${this.worldWidth}x${this.worldHeight}`);
    console.log('[SCAMMER SPAWNING] Spawn points:', this.spawnPoints);

    // Initialize game world
    this.initializeLevel();

    // Start background music
    if (!this.bgMusic) {
      this.bgMusic = new Audio('wetcat-song-2.mp3');
      this.bgMusic.loop = true;
      this.bgMusic.volume = 0.4; // Slightly lower volume for gameplay

      this.bgMusic.addEventListener('loadeddata', () => {
        this.musicLoaded = true;
        this.bgMusic.play().catch(e => console.log('Game music play failed:', e));
      });

      this.bgMusic.load();
    } else {
      // Resume if returning to game
      this.bgMusic.play().catch(e => console.log('Game music play failed:', e));
    }

    // Initialize sound effects
    if (this.pickupSounds.length === 0) {
      // Create 5 audio instances for overlapping pickup sounds
      for (let i = 0; i < 5; i++) {
        const audio = new Audio('pickup_coin.mp3');
        audio.volume = 0.7; // Increased from 0.5 for better audibility
        this.pickupSounds.push(audio);
      }
    }

    if (!this.shelfSound) {
      this.shelfSound = new Audio('book_on_wallet.mp3');
      this.shelfSound.volume = 0.6;
    }
  }

  exit() {
    // Clean up
    this.scammers = [];
    this.coins = [];
    if (this.particleSystem) this.particleSystem.clear();
    this.wallets = [];

    // Reset scammer spawning variables to initial state
    this.maxScammers = 3;
    this.lastMaxScammers = 3;
    this.scammerSpawnTimer = 0;
    this.scammerSpawnInterval = 15;

    // Reset wave notification
    this.maxScammersIncreaseNotification = {
      active: false,
      increase: 0,
      timer: 0,
      duration: 3
    };

    // Pause music when leaving game
    if (this.bgMusic) {
      this.bgMusic.pause();
    }

    // Stop player sounds
    if (this.player) {
      this.player.cleanup();
    }

    // Clear sound arrays to ensure re-initialization
    this.pickupSounds = [];
    this.shelfSound = null;
  }

  initializeLevel() {
    // Generate library layout first
    this.generateLibraryLayout();

    // Create player in a safe spot between shelves
    // Shelves now start at x:100, y:100 with 160x200 spacing
    // Place player in the aisle to the left of first shelf
    this.player = new Player(
      this.game,
      50,  // Left edge buffer area
      300  // Middle height of library
    );

    // Set camera bounds to world
    this.game.camera.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Center camera on player
    this.game.camera.follow(this.player);

    // Spawn initial kids
    const initialScammers = 2; // Start with 2 kids
    console.log(`[RESTART DEBUG] Before spawning: scammers.length = ${this.scammers.length}`);
    for (let i = 0; i < initialScammers; i++) {
      const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
      const scammer = new Scammer(this.game, spawnPoint.x, spawnPoint.y, { aggression: 1, variant: 1 }); // Easy scammer
      this.scammers.push(scammer);
    }
    console.log(`[RESTART DEBUG] After spawning: scammers.length = ${this.scammers.length}`);
    console.log(`[RESTART DEBUG] maxScammers = ${this.maxScammers}`);

    // Give player starting weapon
    this.weaponSystem.unlockWeapon('fud_blast');

    // Unlock additional weapons based on progression
    if (this.game.gameData.playerLevel >= 3) {
      this.weaponSystem.unlockWeapon('diamond_slap');
    }
    if (this.game.gameData.playerLevel >= 5) {
      this.weaponSystem.unlockWeapon('hodl_shield');
    }
    if (this.game.gameData.playerLevel >= 7) {
      this.weaponSystem.unlockWeapon('moon_beam');
    }

    // Initialize scammer spawning for additional kids
    this.scammerSpawnTimer = 15; // First additional scammer spawns after 15 seconds
  }

  update(deltaTime) {
    const input = this.game.inputManager;
    const gameData = this.game.gameData;

    // Recovery mechanism: Press 'r' to refocus canvas if input seems stuck
    if (input.isKeyPressed('r') || input.isKeyPressed('R')) {
      console.log('Manual focus recovery triggered');
      input.ensureFocus();
    }

    // Handle pause
    if (input.isKeyPressed('p') || input.isKeyPressed('Escape')) {
      // Pause music when pausing game
      if (this.bgMusic) {
        this.bgMusic.pause();
      }
      this.game.stateManager.pushState('paused');
      return;
    }

    // Don't update if paused
    if (gameData.isPaused) return;

    // Update game timer
    gameData.elapsedTime += deltaTime;
    // Update weapon system
    if (this.weaponSystem && this.player) {
      this.weaponSystem.update(deltaTime, this.player);

      // Handle weapon firing (keys 1-4)
      const input = this.game.inputManager;
      for (let i = 0; i < 4; i++) {
        if (input.isKeyPressed((i + 1).toString())) {
          this.weaponSystem.fireWeapon(i, this.player);
        }
      }
    }

    // Update particle system
    if (this.particleSystem) {
      this.particleSystem.update(deltaTime);
    }

    // Update Web3 UI
    if (this.web3UI) {
      this.web3UI.update(deltaTime);
    }

    // Update session stats
    this.sessionStats.timeSurvived = gameData.elapsedTime;
    this.sessionStats.maxFudReached = Math.max(this.sessionStats.maxFudReached, gameData.fudLevel);

    // Check win condition
    if (gameData.elapsedTime >= gameData.targetTime) {
      this.game.stateManager.changeState('gameover', { won: true });
      return;
    }

    // Update chaos (placeholder - will be based on books on floor)
    this.updateFUD(deltaTime);

    // Check lose conditions
    if (gameData.fudLevel >= gameData.maxFud) {
      this.game.stateManager.changeState('gameover', { won: false, reason: 'chaos' });
      return;
    }

    // Update player
    if (this.player) {
      this.player.update(deltaTime);
    }

    // Update shelves
    for (const wallet of this.wallets) {
      wallet.update(deltaTime);
    }

    // Update books
    for (const coin of this.coins) {
      coin.update(deltaTime);
    }

    // Update kids
    const kidsBeforeUpdate = this.scammers.length;
    for (const scammer of this.scammers) {
      scammer.update(deltaTime);
    }

    // Check if any kids disappeared during update
    if (this.scammers.length !== kidsBeforeUpdate) {
      console.log(`[SCAMMER SPAWNING] WARNING: Scammers count changed during update! Before: ${kidsBeforeUpdate}, After: ${this.scammers.length}`);
    }

    // Update scammer spawning
    this.updateScammerSpawning(deltaTime);

    // Check book pickup
    this.checkCoinPickup();

    // Check coin snatching from scammers
    this.checkCoinSnatching();

    // Check book shelving
    this.checkCoinDepositing();

    // Update particles
    this.updateParticles(deltaTime);

    // Update boss
    if (this.currentBoss) {
      this.updateBoss(deltaTime);
    }
    
    // Update attack telegraphs
    this.updateTelegraphs(deltaTime);
    
    // Update tsunami waves
    this.updateTsunamiWaves(deltaTime);

    // Validate book states (debug)
    if (Math.random() < 0.01) { // Check 1% of frames to avoid spam
      this.validateCoinStates();
    }

  }

  updateFUD(deltaTime) {
    const gameData = this.game.gameData;

    // Count coins causing FUD (on floor or held by kids)
    const booksOnFloor = this.coins.filter(coin => !coin.isHeld && !coin.isDeposited).length;
    const booksHeldByKids = this.coins.filter(coin => {
      return coin.isHeld && coin.holder && coin.holder.constructor.name === 'Scammer';
    }).length;
    const totalFUDCoins = booksOnFloor + booksHeldByKids;

    // Sliding chaos rate based on game progression
    let fudRate = 0;
    if (totalFUDCoins > 0) {
      // Calculate game time in minutes
      const minutes = gameData.elapsedTime / 60;

      // Determine chaos rate per book based on time
      let fudPerCoin;
      if (minutes < 3) {
        fudPerCoin = 0.05; // 0-3 minutes: 0.05% per book per second
      } else if (minutes < 5) {
        fudPerCoin = 0.03; // 3-5 minutes: 0.03% per book per second
      } else {
        fudPerCoin = 0.01; // 5+ minutes: 0.01% per book per second
      }

      fudRate = totalFUDCoins * fudPerCoin;

      // Apply chaos dampening from upgrades
      const fudDampening = this.player?.stats?.fudDampening || 0;
      const fudMultiplier = 1 - (fudDampening / 100);
      gameData.fudLevel += fudRate * deltaTime * fudMultiplier;
    }

    // Passive chaos decay when low (helps recovery)
    if (gameData.fudLevel > 0) {
      if (totalFUDCoins === 0) {
        // Slow decay when no books are out
        gameData.fudLevel -= 0.1 * deltaTime;
      }
      // Removed passive decay when under 50% - player must actively manage chaos
    }

    // Clamp chaos level
    gameData.fudLevel = Math.max(0, Math.min(gameData.maxFud, gameData.fudLevel));
  }

  render(renderer, interpolation) {
    const ctx = renderer.ctx;
    const { width, height } = this.game;
    const gameData = this.game.gameData;

    // Clear with library floor color
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(0, 0, width, height);

    // Render floor tiles
    this.renderFloor(ctx);

    // Get viewport bounds for culling
    const viewportX = this.game.camera.getViewportX();
    const viewportY = this.game.camera.getViewportY();
    const viewportWidth = this.game.camera.viewportWidth / this.game.camera.zoom;
    const viewportHeight = this.game.camera.viewportHeight / this.game.camera.zoom;
    const padding = 100; // Render entities slightly outside viewport

    // Render shelves (only visible ones)
    for (const wallet of this.wallets) {
      if (this.isInViewport(wallet, viewportX - padding, viewportY - padding,
        viewportWidth + padding * 2, viewportHeight + padding * 2)) {
        renderer.addToLayer('entities', wallet);
      }
    }

    // Render books (only visible ones that are not held or shelved)
    for (const coin of this.coins) {
      if (!coin.isHeld && !coin.isDeposited &&
          this.isInViewport(coin, viewportX - padding, viewportY - padding,
            viewportWidth + padding * 2, viewportHeight + padding * 2)) {
        renderer.addToLayer('entities', coin);
      }
    }

    // Render kids (only visible ones)
    for (const scammer of this.scammers) {
      if (this.isInViewport(scammer, viewportX - padding, viewportY - padding,
        viewportWidth + padding * 2, viewportHeight + padding * 2)) {
        renderer.addToLayer('entities', scammer);
      }
    }

    // TODO: Render particles

    // Render player
    if (this.player) {
      renderer.addToLayer('entities', this.player);
    }

    // Render boss
    if (this.currentBoss && !this.currentBoss.isDead) {
      renderer.addToLayer('entities', this.currentBoss);
    }

    // Render all layers
    renderer.render(interpolation);
    
    // Render telegraphs
    this.renderTelegraphs(ctx);
    
    // Render tsunami waves  
    this.renderTsunamiWaves(ctx);

    // Render UI
    this.renderUI(ctx);

    // Chaos vignette effect
    if (gameData.fudLevel > 80) {
      const intensity = (gameData.fudLevel - 80) / 20;
      this.renderFUDVignette(ctx, intensity);
    }
  }

  renderUI(ctx) {
    const gameData = this.game.gameData;
    const { width, height } = this.game;

    ctx.save();
    
    // Render boss UI
    this.renderBossUI(ctx);
    
    // Render boss warning
    this.renderBossWarning(ctx);

    // Top Center - Chaos meter
    const meterWidth = 300;
    const meterHeight = 30;
    const meterX = width / 2 - meterWidth / 2;
    const meterY = 20;

    // Chaos meter background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(meterX - 2, meterY - 2, meterWidth + 4, meterHeight + 4);

    // Chaos meter fill
    const chaosPercent = gameData.fudLevel / gameData.maxFud;
    const chaosColor = chaosPercent > 0.8 ? '#ff0000' :
      chaosPercent > 0.6 ? '#ff8800' :
        chaosPercent > 0.4 ? '#ffff00' : '#00ff00';

    ctx.fillStyle = chaosColor;
    ctx.fillRect(meterX, meterY, meterWidth * chaosPercent, meterHeight);

    // Chaos meter text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`FUD: ${Math.floor(gameData.fudLevel)}%`, width / 2, meterY + meterHeight / 2);

    // Wave increase notification below chaos meter
    if (this.maxScammersIncreaseNotification.active) {
      const notificationY = meterY + meterHeight + 15;
      const fadeProgress = this.maxScammersIncreaseNotification.timer / this.maxScammersIncreaseNotification.duration;
      let alpha;

      // Fade in for first 0.5 seconds, stay solid, then fade out in last 0.5 seconds
      if (fadeProgress < 0.5 / 3) {
        alpha = fadeProgress * 6; // Fade in
      } else if (fadeProgress > 2.5 / 3) {
        alpha = (1 - fadeProgress) * 6; // Fade out
      } else {
        alpha = 1; // Solid
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = '#ffff00'; // Yellow color for visibility
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;

      const notificationText = `Maximum scammers allowed grew by ${this.maxScammersIncreaseNotification.increase}`;

      // Draw text outline for better visibility
      ctx.strokeText(notificationText, width / 2, notificationY);
      ctx.fillText(notificationText, width / 2, notificationY);

      // Render particle system
      if (this.particleSystem) {
        this.particleSystem.render(ctx);
      }

      // Render weapon UI
      if (this.weaponSystem) {
        this.weaponSystem.render(ctx);
      }

      // Render Web3 UI
      if (this.web3UI) {
        this.web3UI.render(ctx);
      }

      ctx.restore();
    }

    // Top Right - Timer and Kid Counter
    const timeRemaining = Math.max(0, gameData.targetTime - gameData.elapsedTime);
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = Math.floor(timeRemaining % 60);

    // Timer background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(width - 120, 15, 110, 40);

    ctx.font = '24px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, width - 65, 40);

    // Kid counter below timer
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(width - 120, 60, 110, 35);

    ctx.font = '18px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Scammers: ${this.scammers.length}/${this.maxScammers}`, width - 65, 82);

    // Left Side Panel - Player Stats
    const panelX = 10;
    const panelY = 10;
    const panelWidth = 250;
    const panelHeight = 150; // Reduced since HP is removed

    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Level and XP
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Level ${gameData.playerLevel}`, panelX + 10, panelY + 30);

    // XP bar
    const xpBarX = panelX + 10;
    const xpBarY = panelY + 40;
    const xpBarWidth = panelWidth - 20;
    const xpBarHeight = 15;

    ctx.fillStyle = '#333';
    ctx.fillRect(xpBarX, xpBarY, xpBarWidth, xpBarHeight);

    const xpPercent = gameData.xp / gameData.xpToNext;
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(xpBarX, xpBarY, xpBarWidth * xpPercent, xpBarHeight);

    // XP text
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${gameData.xp} / ${gameData.xpToNext} XP`, xpBarX + xpBarWidth / 2, xpBarY + xpBarHeight / 2 + 1);

    if (this.player) {
      // Stamina bar
      ctx.textAlign = 'left';
      ctx.font = '16px Arial';
      ctx.fillStyle = '#fff';
      ctx.fillText('Stamina', panelX + 10, panelY + 80);

      const staminaBarX = panelX + 75;
      const staminaBarY = panelY + 65;
      const staminaBarWidth = panelWidth - 85;
      const staminaBarHeight = 20;

      ctx.fillStyle = '#333';
      ctx.fillRect(staminaBarX, staminaBarY, staminaBarWidth, staminaBarHeight);

      const staminaPercent = this.player.stats.stamina / this.player.stats.maxStamina;
      ctx.fillStyle = '#00aaff';
      ctx.fillRect(staminaBarX, staminaBarY, staminaBarWidth * staminaPercent, staminaBarHeight);

      // Stamina text
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor(this.player.stats.stamina)} / ${this.player.stats.maxStamina}`, staminaBarX + staminaBarWidth / 2, staminaBarY + staminaBarHeight / 2 + 1);

      // Books carried indicator
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.fillText(`Books: ${this.player.carriedCoins.length} / ${this.player.stats.carrySlots}`, panelX + 10, panelY + 105);

      // Speed indicator (if sprinting)
      if (this.player.isSprinting && this.player.stats.stamina > 0) {
        ctx.fillStyle = '#ffff00';
        ctx.fillText('SPRINTING', panelX + 10, panelY + 130);
      }
    }

    ctx.restore();
  }

  renderFUDVignette(ctx, intensity) {
    const { width, height } = this.game;

    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.4,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );

    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(139, 0, 0, ${intensity * 0.5})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  renderFloor(ctx) {
    const woodFloorImage = this.game.assetLoader.getImage('woodFloor');

    if (!woodFloorImage || !woodFloorImage.complete) {
      // Fallback to solid color if image hasn't loaded
      const viewportX = this.game.camera.getViewportX();
      const viewportY = this.game.camera.getViewportY();
      const viewportWidth = this.game.camera.viewportWidth / this.game.camera.zoom;
      const viewportHeight = this.game.camera.viewportHeight / this.game.camera.zoom;

      this.game.renderer.addToLayer('background', (ctx) => {
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(viewportX, viewportY, viewportWidth, viewportHeight);
      });
      return;
    }

    // Create pattern once and cache it
    if (!this.floorPattern) {
      // Create a scaled pattern canvas
      const scale = 0.5;
      this.patternCanvas = document.createElement('canvas');
      this.patternCanvas.width = woodFloorImage.width * scale;
      this.patternCanvas.height = woodFloorImage.height * scale;
      const patternCtx = this.patternCanvas.getContext('2d');
      patternCtx.drawImage(woodFloorImage, 0, 0, this.patternCanvas.width, this.patternCanvas.height);
      this.floorPattern = this.game.renderer.ctx.createPattern(this.patternCanvas, 'repeat');
    }

    // Add wood floor image rendering to background layer
    this.game.renderer.addToLayer('background', (ctx) => {
      if (this.floorPattern) {
        ctx.save();
        ctx.fillStyle = this.floorPattern;
        // Fill the entire world area, not just viewport
        ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
        ctx.restore();
      }
    });
  }

  updateScammerSpawning(deltaTime) {
    // Calculate current game time in minutes
    const minutes = this.game.gameData.elapsedTime / 60;
    
    // Calculate current wave (1 wave per 2 minutes)
    const newWave = Math.floor(minutes / 2) + 1;
    if (newWave > this.currentWave) {
      this.currentWave = newWave;
      this.onWaveChange(newWave);
    }

    // Determine max kids based on wave progression
    let newMaxScammers;
    if (minutes < 1) {
      newMaxScammers = 3; // First minute: max 3
    } else if (minutes < 3) {
      newMaxScammers = 5; // 1-3 minutes: max 5
    } else if (minutes < 5) {
      newMaxScammers = 7; // 3-5 minutes: max 7
    } else if (minutes < 10) {
      newMaxScammers = 10; // 5-10 minutes: max 10
    } else {
      // After 10 minutes: increase by 2 every minute
      const additionalMinutes = Math.floor(minutes - 10);
      newMaxScammers = 10 + (additionalMinutes * 2);
    }

    // Check if max kids increased
    if (newMaxScammers > this.maxScammers) {
      const increase = newMaxScammers - this.maxScammers;
      this.maxScammers = newMaxScammers;

      // Trigger notification
      this.maxScammersIncreaseNotification = {
        active: true,
        increase: increase,
        timer: 0,
        duration: 3
      };

      console.log(`[WAVE SYSTEM] Max kids increased to ${this.maxScammers} (+${increase})`);
    }

    // Update notification timer
    if (this.maxScammersIncreaseNotification.active) {
      this.maxScammersIncreaseNotification.timer += deltaTime;
      if (this.maxScammersIncreaseNotification.timer >= this.maxScammersIncreaseNotification.duration) {
        this.maxScammersIncreaseNotification.active = false;
      }
    }

    // Don't spawn more kids if we're at the limit
    if (this.scammers.length >= this.maxScammers) {
      return;
    }

    // Update spawn timer
    this.scammerSpawnTimer -= deltaTime;

    if (this.scammerSpawnTimer <= 0) {
      // Determine aggression level based on time
      let aggressionLevel = 1; // Easy by default
      let spawnInterval = 15; // Always 15 seconds

      if (minutes >= 15) {
        // After 15 minutes: more aggressive scammers
        aggressionLevel = 3;
      } else if (minutes >= 10) {
        // 10-15 minutes: aggressive scammers
        aggressionLevel = 3;
      } else if (minutes >= 5) {
        // 5-10 minutes: normal scammers
        aggressionLevel = 2;
      }

      // Spawn a new scammer
      const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
      const scammer = new Scammer(this.game, spawnPoint.x, spawnPoint.y, { aggression: aggressionLevel, variant: Math.floor(Math.random() * 3) + 1 });
      this.scammers.push(scammer);

      // Reset timer for next spawn
      this.scammerSpawnTimer = spawnInterval;
      this.scammerSpawnInterval = spawnInterval;

      console.log(`[SCAMMER SPAWNING] Spawned scammer #${this.scammers.length}/${this.maxScammers} (aggression: ${aggressionLevel}) - Next spawn in ${spawnInterval}s`);
    }
  }

  generateLibraryLayout() {
    // Define shelf colors
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

    // Create a grid of shelves
    const shelfSpacingX = 160;
    const shelfSpacingY = 200;
    const startX = 100; // Start closer to left edge
    const startY = 100; // Start closer to top edge
    const rows = 4;
    const cols = 8;

    // Create color distribution array to ensure equal distribution
    // 32 shelves / 6 colors = 5.33, so we need 5 of each color + 2 extra
    const colorDistribution = [];
    for (let i = 0; i < 5; i++) {
      colorDistribution.push(...colors);
    }
    // Add 2 more to reach 32 total (we'll use red and blue for balance)
    colorDistribution.push('red', 'blue');

    // Shuffle the color distribution for variety
    for (let i = colorDistribution.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colorDistribution[i], colorDistribution[j]] = [colorDistribution[j], colorDistribution[i]];
    }

    let shelfIndex = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * shelfSpacingX;
        const y = startY + row * shelfSpacingY;

        // Pick a color from our balanced distribution
        const color = colorDistribution[shelfIndex];

        // Create shelf
        const wallet = new Wallet(this.game, x, y, color);
        this.wallets.push(wallet);

        // Fill shelf to capacity (6 books)
        for (let i = 0; i < wallet.capacity; i++) {
          const coin = new Coin(this.game, 0, 0, color);
          wallet.addCoin(coin);
          this.coins.push(coin);
        }

        shelfIndex++;
      }
    }

    // Log color distribution for debugging
    const colorCounts = {};
    this.wallets.forEach(wallet => {
      colorCounts[wallet.color] = (colorCounts[wallet.color] || 0) + 1;
    });
    console.log('[LIBRARY LAYOUT] Shelf color distribution:', colorCounts);
    console.log('[LIBRARY LAYOUT] Total books per color:', Object.entries(colorCounts).map(([color, count]) => `${color}: ${count * 6}`));
  }

  isPlayerNearWallet(wallet, distance) {
    if (!this.player) return false;

    // Check if player is within distance of any edge of the shelf
    const playerLeft = this.player.x;
    const playerRight = this.player.x + this.player.width;
    const playerTop = this.player.y;
    const playerBottom = this.player.y + this.player.height;

    const walletLeft = wallet.x;
    const walletRight = wallet.x + wallet.width;
    const walletTop = wallet.y;
    const walletBottom = wallet.y + wallet.height;

    // Expand shelf bounds by distance
    const expandedLeft = walletLeft - distance;
    const expandedRight = walletRight + distance;
    const expandedTop = walletTop - distance;
    const expandedBottom = walletBottom + distance;

    // Check if player overlaps with expanded bounds
    return !(playerLeft >= expandedRight ||
             playerRight <= expandedLeft ||
             playerTop >= expandedBottom ||
             playerBottom <= expandedTop);
  }

  checkCoinPickup() {
    if (!this.player) return;

    const pickupRadiusPixels = this.player.stats.pickupRadius * 32;
    const playerCenterX = this.player.getCenterX();
    const playerCenterY = this.player.getCenterY();

    for (const coin of this.coins) {
      // Skip if book is already held or shelved
      if (coin.isHeld || coin.isDeposited) continue;

      // Check distance
      const distance = Math.sqrt(
        Math.pow(coin.getCenterX() - playerCenterX, 2) +
        Math.pow(coin.getCenterY() - playerCenterY, 2)
      );

      if (distance <= pickupRadiusPixels) {
        // Try to pick up the book
        if (this.player.pickupCoin(coin)) {
          coin.pickup(this.player);

          // Track book collection
          this.game.gameData.coinsCollected++;

          // Reduce chaos when picking up (balanced with new rates)
          this.game.gameData.fudLevel -= 0.5; // Much smaller reduction
          this.game.gameData.fudLevel = Math.max(0, this.game.gameData.fudLevel);

          // Award XP
          this.awardXP(5);

          // Play pickup sound
          this.playPickupSound();
        }
      }
    }
  }

  checkCoinDepositing() {
    if (!this.player || this.player.carriedCoins.length === 0) return;

    const returnDistance = this.player.stats.returnRadius * 32;

    for (const wallet of this.wallets) {
      // Check if player is near any edge of the shelf
      if (this.isPlayerNearWallet(wallet, returnDistance)) {
        // Try to shelve matching books
        const coin = this.player.depositCoin(wallet);
        if (coin && wallet.addCoin(coin)) {
          // Track book shelving
          this.game.gameData.coinsDeposited++;

          // Reduce chaos when shelving (bigger reward for completing the task)
          this.game.gameData.fudLevel -= 1.0; // Reduced to match new chaos rates
          this.game.gameData.fudLevel = Math.max(0, this.game.gameData.fudLevel);

          // Award XP
          this.awardXP(10);

          // Play shelf sound
          this.playShelfSound();
        }
      }
    }
  }

  awardXP(amount) {
    const gameData = this.game.gameData;

    // Apply XP multiplier and early game boost
    let xpMultiplier = this.player?.getXPMultiplier() || 1;

    // Early game XP boost for first 2 minutes
    if (gameData.elapsedTime < 120) { // 2 minutes
      xpMultiplier *= 1.5;
    }

    const multipliedAmount = Math.floor(amount * xpMultiplier);
    gameData.xp += multipliedAmount;

    // Create floating XP text
    if (this.player) {
      this.particleSystem.particles.push({
        type: 'xp',
        x: this.player.getCenterX(),
        y: this.player.y - 10,
        text: `+${multipliedAmount} XP`,
        vy: -50,
        lifetime: 1.5,
        age: 0
      });
    }

    // Check for level up
    while (gameData.xp >= gameData.xpToNext) {
      gameData.xp -= gameData.xpToNext;
      gameData.playerLevel++;

      // Refill stamina as a level up bonus
      if (this.player) {
        this.player.stats.stamina = this.player.stats.maxStamina;
      }

      // Calculate next level XP requirement
      gameData.xpToNext = Math.floor(100 * Math.pow(1.45, gameData.playerLevel - 1));

      // Show upgrade selection
      this.game.stateManager.pushState('upgradeSelection');
    }
  }

  updateParticles(deltaTime) {
    // Update and remove expired particles
    this.particleSystem.particles = this.particleSystem.particles.filter(particle => {
      particle.age += deltaTime;

      if (particle.type === 'xp') {
        particle.y += particle.vy * deltaTime;
        particle.vy += 100 * deltaTime; // Gravity
      }

      return particle.age < particle.lifetime;
    });
  }

  renderParticles(renderer) {
    renderer.addToLayer('ui', (ctx) => {
      ctx.save();

      for (const particle of this.particleSystem.particles) {
        if (particle.type === 'xp') {
          const alpha = 1 - (particle.age / particle.lifetime);
          ctx.globalAlpha = alpha;
          ctx.font = 'bold 18px Arial';
          ctx.fillStyle = '#ffff00';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.textAlign = 'center';
          ctx.strokeText(particle.text, particle.x, particle.y);
          ctx.fillText(particle.text, particle.x, particle.y);
        }
      }

      ctx.restore();
    });
  }

  validateBookStates() {
    const coinStates = {
      shelved: 0,
      held: 0,
      floor: 0,
      invalid: 0
    };

    for (const coin of this.coins) {
      if (coin.isDeposited && coin.isHeld) {
        console.error(`Book ${coin.id} is both shelved and held!`);
        coinStates.invalid++;
      } else if (coin.isDeposited) {
        coinStates.shelved++;
        // Verify book is actually in a shelf
        let foundInShelf = false;
        for (const wallet of this.wallets) {
          if (wallet.coins.includes(coin)) {
            foundInShelf = true;
            break;
          }
        }
        if (!foundInShelf) {
          console.error(`Book ${coin.id} marked as shelved but not in any shelf!`);
        }
      } else if (coin.isHeld) {
        coinStates.held++;
        if (!coin.holder) {
          console.error(`Book ${coin.id} marked as held but has no holder!`);
        }
      } else {
        coinStates.floor++;
      }
    }

    // Log summary only if there are issues
    if (coinStates.invalid > 0) {
      console.log('Book states:', coinStates, 'Total:', this.coins.length);
    }
  }

  checkCoinSnatching() {
    if (!this.player || this.player.carriedCoins.length >= this.player.stats.carrySlots) return;

    // Use player's repel radius for snatching coins from scammers
    const snatchRadius = this.player.repelRadius;
    const playerCenterX = this.player.getCenterX();
    const playerCenterY = this.player.getCenterY();

    for (const scammer of this.scammers) {
      // Check if scammer is carrying a coin
      if (scammer.carriedCoins.length === 0) continue;

      // Check distance to scammer
      const distance = Math.sqrt(
        Math.pow(scammer.getCenterX() - playerCenterX, 2) +
        Math.pow(scammer.getCenterY() - playerCenterY, 2)
      );

      if (distance <= snatchRadius) {
        // Snatch the coin from the scammer
        const coin = scammer.carriedCoins[0];

        // Remove book from scammer
        scammer.carriedCoins = [];

        // Give book to player
        if (this.player.pickupCoin(coin)) {
          coin.pickup(this.player);

          // Track book collection
          this.game.gameData.coinsCollected++;

          // Kid flees after being robbed
          scammer.state = 'fleeing';

          // Reduce chaos when snatching (reward for catching scammers)
          this.game.gameData.fudLevel -= 0.75; // Balanced reduction
          this.game.gameData.fudLevel = Math.max(0, this.game.gameData.fudLevel);

          // Award XP for snatching
          this.awardXP(7); // Slightly more XP than ground pickup

          // Play pickup sound
          this.playPickupSound();
        }
      }
    }
  }

  isInViewport(entity, viewX, viewY, viewWidth, viewHeight) {
    return !(entity.x + entity.width < viewX ||
             entity.x > viewX + viewWidth ||
             entity.y + entity.height < viewY ||
             entity.y > viewY + viewHeight);
  }

  playPickupSound() {
    // Find an available audio instance that's not currently playing
    for (const audio of this.pickupSounds) {
      if (audio.paused || audio.ended) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Pickup sound play failed:', e));
        return;
      }
    }

    // If all are playing, use the first one anyway (will restart it)
    if (this.pickupSounds.length > 0) {
      this.pickupSounds[0].currentTime = 0;
      this.pickupSounds[0].play().catch(e => console.log('Pickup sound play failed:', e));
    }
  }

  playShelfSound() {
    if (this.shelfSound) {
      this.shelfSound.currentTime = 0;
      this.shelfSound.play().catch(e => console.log('Shelf sound play failed:', e));
    }
  }
  
  onWaveChange(wave) {
    // Check if this wave spawns a boss
    const BossClass = this.bossSpawnWaves[wave];
    if (BossClass && !this.currentBoss) {
      this.showBossWarning = true;
      this.bossWarningTimer = 5; // 5 second warning
      
      // Clear all scammers when boss spawns
      setTimeout(() => {
        this.scammers.forEach(scammer => {
          scammer.isDead = true;
        });
        this.scammers = [];
        
        // Spawn the boss
        this.spawnBoss(BossClass);
      }, 5000);
    }
  }
  
  spawnBoss(BossClass) {
    const centerX = this.worldWidth / 2;
    const centerY = this.worldHeight / 2;
    
    this.currentBoss = new BossClass(this.game, centerX - 80, centerY - 80);
    this.showBossWarning = false;
    
    // Boss music would go here
    // this.playBossMusic();
    
    // Announce boss
    this.showNotification(`${this.currentBoss.constructor.name.toUpperCase()} APPEARS!`, 3);
  }
  
  updateBoss(deltaTime) {
    if (!this.currentBoss) return;
    
    this.currentBoss.update(deltaTime);
    
    // Check collision with player attacks
    if (this.player) {
      // Check weapon damage
      this.weaponSystem.activeWeapons.forEach(weapon => {
        if (weapon.currentCooldown <= 0.1 && weapon.id === 'diamond_slap') {
          const distance = this.player.getDistanceTo(this.currentBoss);
          if (distance < weapon.range) {
            this.currentBoss.takeDamage(50);
          }
        }
      });
    }
    
    // Remove dead boss
    if (this.currentBoss.isDead) {
      this.currentBoss = null;
      // Resume normal spawning
      this.scammerSpawnTimer = 0;
    }
  }
  
  updateTelegraphs(deltaTime) {
    this.telegraphs = this.telegraphs.filter(telegraph => {
      telegraph.duration -= deltaTime;
      return telegraph.duration > 0;
    });
  }
  
  updateTsunamiWaves(deltaTime) {
    this.tsunamiWaves = this.tsunamiWaves.filter(wave => {
      wave.x += wave.speed * deltaTime;
      wave.life -= deltaTime;
      
      // Check collision with player
      if (this.player) {
        const playerLeft = this.player.x;
        const playerRight = this.player.x + this.player.width;
        const waveRight = wave.x + wave.width;
        
        if (waveRight > playerLeft && wave.x < playerRight &&
            this.player.y < wave.y + wave.height) {
          // Hit by tsunami
          this.player.dropAllCoins();
          this.game.gameData.fudLevel = Math.min(
            this.game.gameData.maxFud,
            this.game.gameData.fudLevel + 25
          );
          
          // Knockback
          this.player.x += wave.speed * deltaTime * 0.5;
        }
      }
      
      return wave.life > 0 && wave.x < this.game.camera.x + this.game.camera.width + 100;
    });
  }
  
  renderBossUI(ctx) {
    if (!this.currentBoss) return;
    
    // Draw boss health bar at top of screen
    const barWidth = 400;
    const barHeight = 30;
    const barX = (this.game.width - barWidth) / 2;
    const barY = 20;
    
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);
    
    // Health bar background
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Health bar
    const healthPercent = this.currentBoss.health / this.currentBoss.maxHealth;
    const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth * healthPercent, barY);
    
    if (healthPercent > 0.5) {
      gradient.addColorStop(0, '#00ff00');
      gradient.addColorStop(1, '#00aa00');
    } else if (healthPercent > 0.25) {
      gradient.addColorStop(0, '#ffff00');
      gradient.addColorStop(1, '#aaaa00');
    } else {
      gradient.addColorStop(0, '#ff0000');
      gradient.addColorStop(1, '#aa0000');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    
    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Boss name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const bossName = this.currentBoss.constructor.name.replace(/([A-Z])/g, ' $1').trim();
    ctx.fillText(bossName, this.game.width / 2, barY - 5);
    
    // Health text
    ctx.font = '16px Arial';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${Math.ceil(this.currentBoss.health)} / ${this.currentBoss.maxHealth}`,
      this.game.width / 2,
      barY + barHeight / 2
    );
  }
  
  renderBossWarning(ctx) {
    if (!this.showBossWarning || this.bossWarningTimer <= 0) return;
    
    // Flash background
    if (Math.floor(this.bossWarningTimer * 4) % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.fillRect(0, 0, this.game.width, this.game.height);
    }
    
    // Warning text
    ctx.save();
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    
    const text = 'BOSS INCOMING!';
    const x = this.game.width / 2;
    const y = this.game.height / 2;
    
    // Shake effect
    const shakeX = (Math.random() - 0.5) * 10;
    const shakeY = (Math.random() - 0.5) * 10;
    
    ctx.strokeText(text, x + shakeX, y + shakeY);
    ctx.fillText(text, x + shakeX, y + shakeY);
    
    // Countdown
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#fff';
    const countdown = Math.ceil(this.bossWarningTimer);
    ctx.strokeText(countdown, x, y + 60);
    ctx.fillText(countdown, x, y + 60);
    
    ctx.restore();
  }
  
  renderTelegraphs(ctx) {
    ctx.save();
    
    this.telegraphs.forEach(telegraph => {
      const alpha = telegraph.duration / telegraph.maxDuration;
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.3})`;
      ctx.strokeStyle = `rgba(255, 0, 0, ${alpha * 0.8})`;
      ctx.lineWidth = 2;
      
      if (telegraph.type === 'circle') {
        ctx.beginPath();
        ctx.arc(telegraph.x, telegraph.y, telegraph.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (telegraph.type === 'rect') {
        ctx.fillRect(telegraph.x, telegraph.y, telegraph.width, telegraph.height);
        ctx.strokeRect(telegraph.x, telegraph.y, telegraph.width, telegraph.height);
      }
    });
    
    ctx.restore();
  }
  
  renderTsunamiWaves(ctx) {
    ctx.save();
    
    this.tsunamiWaves.forEach(wave => {
      // Wave gradient
      const gradient = ctx.createLinearGradient(
        wave.x, wave.y,
        wave.x + wave.width, wave.y
      );
      gradient.addColorStop(0, 'rgba(26, 188, 156, 0.8)');
      gradient.addColorStop(0.5, 'rgba(52, 152, 219, 0.9)');
      gradient.addColorStop(1, 'rgba(26, 188, 156, 0.6)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(wave.x, wave.y, wave.width, wave.height);
      
      // Foam on top
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (let x = 0; x < wave.width; x += 20) {
        const foamY = Math.sin((wave.x + x) * 0.05) * 10;
        ctx.beginPath();
        ctx.arc(wave.x + x, wave.y + foamY, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    ctx.restore();
  }
  
  showNotification(text, duration = 2) {
    // This would be implemented with a notification system
    console.log(`[NOTIFICATION] ${text}`);
  }
}