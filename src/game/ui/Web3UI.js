import { wetcatWeb3 } from '../../web3/WETCATWeb3.js';
import { worldID } from '../../web3/WorldIDIntegration.js';
import { worldApp } from '../../web3/WorldAppIntegration.js';

export class Web3UI {
  constructor(game) {
    this.game = game;
    this.isVisible = true;
    this.balance = '0';
    this.account = null;
    this.connectionStatus = 'disconnected';
    this.pendingRewards = [];
    this.showRewardAnimation = false;
    this.rewardAnimationTimer = 0;

    // UI positioning
    this.panelX = 10;
    this.panelY = 170; // Below player stats
    this.panelWidth = 250;
    this.panelHeight = 100;
    
    // World ID status
    this.worldIdVerified = false;
    this.verificationMultiplier = 1.0;

    // Setup Web3 listeners
    this.setupWeb3Listeners();
  }

  setupWeb3Listeners() {
    wetcatWeb3.on('connected', (data) => {
      this.account = data.account;
      this.connectionStatus = 'connected';
    });

    wetcatWeb3.on('disconnected', () => {
      this.account = null;
      this.balance = '0';
      this.connectionStatus = 'disconnected';
    });

    wetcatWeb3.on('balanceUpdated', (data) => {
      this.balance = parseFloat(data.balance).toFixed(2);
    });

    wetcatWeb3.on('rewardClaimed', (data) => {
      this.pendingRewards.push({
        amount: data.amount,
        reason: data.reason,
        timer: 3.0
      });
      this.showRewardAnimation = true;
    });

    wetcatWeb3.on('error', (error) => {
      console.error('Web3 error:', error);
      this.connectionStatus = 'error';
    });
  }

  async connect() {
    if (this.connectionStatus === 'connecting') return;

    this.connectionStatus = 'connecting';
    const success = await wetcatWeb3.connect();

    if (!success) {
      this.connectionStatus = 'error';
    }
  }

  update(deltaTime) {
    // Update reward animations
    this.pendingRewards = this.pendingRewards.filter(reward => {
      reward.timer -= deltaTime;
      return reward.timer > 0;
    });

    if (this.pendingRewards.length === 0) {
      this.showRewardAnimation = false;
    }
  }

  render(ctx) {
    if (!this.isVisible) return;

    ctx.save();

    // Draw Web3 panel
    this.drawPanel(ctx);

    // Draw reward animations
    this.drawRewardAnimations(ctx);

    ctx.restore();
  }

  drawPanel(ctx) {
    // Adjust height if World ID panel is needed
    const panelHeight = this.connectionStatus === 'connected' && !worldID.isVerified() ? 
      this.panelHeight + 60 : this.panelHeight;
    
    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(this.panelX, this.panelY, this.panelWidth, panelHeight);

    // Panel border
    ctx.strokeStyle = '#FFD93D';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.panelX, this.panelY, this.panelWidth, panelHeight);

    // Title
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('$WETCAT Wallet', this.panelX + 10, this.panelY + 20);

    if (this.connectionStatus === 'disconnected') {
      // Connect button
      const buttonX = this.panelX + 10;
      const buttonY = this.panelY + 35;
      const buttonWidth = this.panelWidth - 20;
      const buttonHeight = 30;

      ctx.fillStyle = '#FFD93D';
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Connect Wallet', buttonX + buttonWidth / 2, buttonY + 20);

      // Store button bounds for click detection
      this.connectButton = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

    } else if (this.connectionStatus === 'connecting') {
      ctx.fillStyle = '#fff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Connecting...', this.panelX + this.panelWidth / 2, this.panelY + 55);

    } else if (this.connectionStatus === 'connected') {
      // Show account
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      const formattedAccount = wetcatWeb3.formatAddress(this.account);
      ctx.fillText(`Wallet: ${formattedAccount}`, this.panelX + 10, this.panelY + 40);

      // Show balance with coin icon
      ctx.fillStyle = '#FFD93D';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`${this.balance} $WETCAT`, this.panelX + 10, this.panelY + 65);

      // Show earnings this session
      const sessionEarnings = this.game.stateManager.currentState?.sessionStats?.wetcatEarned || 0;
      if (sessionEarnings > 0) {
        ctx.fillStyle = '#4CAF50';
        ctx.font = '12px Arial';
        ctx.fillText(`+${sessionEarnings} this session`, this.panelX + 10, this.panelY + 85);
      }
      
      // World ID verification status
      if (worldID.isVerified()) {
        // Show verified status
        ctx.fillStyle = '#4CAF50';
        ctx.font = '12px Arial';
        const verificationLevel = worldID.getVerificationLevel();
        const multiplier = worldID.getRewardMultiplier();
        ctx.fillText(`✓ Verified (${verificationLevel}) - ${multiplier}x rewards`, this.panelX + 10, this.panelY + 105);
      } else {
        // Show verify button
        const verifyButtonY = this.panelY + 105;
        ctx.fillStyle = '#1F1F23';
        ctx.fillRect(this.panelX + 10, verifyButtonY, this.panelWidth - 20, 25);
        
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.panelX + 10, verifyButtonY, this.panelWidth - 20, 25);
        
        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Verify with World ID (2x rewards)', this.panelX + this.panelWidth / 2, verifyButtonY + 16);
        
        // Store verify button bounds
        this.verifyButton = { x: this.panelX + 10, y: verifyButtonY, width: this.panelWidth - 20, height: 25 };
      }

    } else if (this.connectionStatus === 'error') {
      ctx.fillStyle = '#ff4444';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Connection Error', this.panelX + this.panelWidth / 2, this.panelY + 45);
      ctx.fillText('Click to retry', this.panelX + this.panelWidth / 2, this.panelY + 65);
    }
  }

  drawRewardAnimations(ctx) {
    if (!this.showRewardAnimation) return;

    this.pendingRewards.forEach((reward, index) => {
      const alpha = Math.min(1, reward.timer / 1.0);
      const yOffset = (3.0 - reward.timer) * 50;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Position above Web3 panel
      const x = this.panelX + this.panelWidth / 2;
      const y = this.panelY - 20 - yOffset - (index * 30);

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(x - 100, y - 15, 200, 30);

      // Text
      ctx.fillStyle = '#FFD93D';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`+${reward.amount} $WETCAT`, x, y);

      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(reward.reason, x, y + 15);

      ctx.restore();
    });
  }

  handleClick(x, y) {
    if (this.connectionStatus === 'disconnected' || this.connectionStatus === 'error') {
      if (this.connectButton &&
          x >= this.connectButton.x &&
          x <= this.connectButton.x + this.connectButton.width &&
          y >= this.connectButton.y &&
          y <= this.connectButton.y + this.connectButton.height) {
        this.connect();
        return true;
      }
    } else if (this.connectionStatus === 'connected' && !worldID.isVerified()) {
      // Check if verify button was clicked
      if (this.verifyButton &&
          x >= this.verifyButton.x &&
          x <= this.verifyButton.x + this.verifyButton.width &&
          y >= this.verifyButton.y &&
          y <= this.verifyButton.y + this.verifyButton.height) {
        this.verifyWithWorldID();
        return true;
      }
    }
    return false;
  }
  
  async verifyWithWorldID() {
    try {
      const verification = await worldID.verifyWithOrb();
      console.log('World ID verification successful:', verification);
      
      // Update UI to show verified status
      this.verificationMultiplier = worldID.getRewardMultiplier();
      
      // Trigger haptic feedback in World App
      if (worldApp.isWorldApp) {
        worldApp.triggerHaptic('medium');
      }
    } catch (error) {
      console.error('World ID verification failed:', error);
    }
  }
}

// Achievement definitions
export const WETCAT_ACHIEVEMENTS = {
  FIRST_MOON: {
    id: 'first_moon',
    name: 'First Moon',
    description: 'Survive 30 minutes',
    reward: 100,
    check: (stats) => stats.timeSurvived >= 1800
  },
  DIAMOND_HANDS: {
    id: 'diamond_hands',
    name: 'Diamond Hands',
    description: 'Never go above 50% FUD',
    reward: 200,
    check: (stats) => stats.maxFudReached < 50 && stats.timeSurvived >= 1800
  },
  WHALE_ALERT: {
    id: 'whale_alert',
    name: 'Whale Alert',
    description: 'Collect 1000 coins in one run',
    reward: 300,
    check: (stats) => stats.coinsCollected >= 1000
  },
  SCAMMER_SLAYER: {
    id: 'scammer_slayer',
    name: 'Scammer Slayer',
    description: 'Repel 100 scammers',
    reward: 150,
    check: (stats) => stats.scammersRepelled >= 100
  },
  SPEED_DEMON: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Reach max speed upgrade',
    reward: 100,
    check: (stats) => stats.upgrades?.speed >= 5
  }
};

// Calculate daily reward based on score
export function calculateDailyReward(score) {
  // Base reward + performance bonus
  const baseReward = 10;
  const performanceBonus = Math.floor(score / 1000) * 5;
  const maxDailyReward = 100;

  return Math.min(baseReward + performanceBonus, maxDailyReward);
}