import { wetcatWeb3 } from '../../web3/WETCATWeb3.js';

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
    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(this.panelX, this.panelY, this.panelWidth, this.panelHeight);

    // Panel border
    ctx.strokeStyle = '#FFD93D';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.panelX, this.panelY, this.panelWidth, this.panelHeight);

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
    }
    return false;
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