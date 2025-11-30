import { stakingIntegration, LockTier, LOCK_TIER_INFO } from '../../web3/StakingIntegration.js';
import { wetcatWeb3 } from '../../web3/WETCATWeb3.js';
import { worldID } from '../../web3/WorldIDIntegration.js';

export class StakingUI {
  constructor(game) {
    this.game = game;
    this.isVisible = false;
    this.isExpanded = false;

    // UI state
    this.stakeInfo = null;
    this.globalStats = null;
    this.selectedTier = LockTier.FLEXIBLE;
    this.stakeAmount = '';
    this.isLoading = false;
    this.errorMessage = null;
    this.successMessage = null;

    // Panel positioning
    this.panelX = 10;
    this.panelY = 280;
    this.panelWidth = 280;
    this.collapsedHeight = 40;
    this.expandedHeight = 320;

    // Buttons
    this.buttons = {};

    // Update timer
    this.updateTimer = 0;
    this.updateInterval = 10; // Update every 10 seconds

    // Setup listeners
    this.setupListeners();
  }

  setupListeners() {
    stakingIntegration.on('staked', (data) => {
      this.successMessage = `Staked ${parseFloat(data.amount).toFixed(2)} $WETCAT!`;
      this.isLoading = false;
      this.refreshData();
    });

    stakingIntegration.on('unstaked', (data) => {
      this.successMessage = `Unstaked ${parseFloat(data.amount).toFixed(2)} + ${parseFloat(data.rewards).toFixed(2)} rewards!`;
      this.isLoading = false;
      this.refreshData();
    });

    stakingIntegration.on('rewardsClaimed', (data) => {
      this.successMessage = `Claimed ${parseFloat(data.amount).toFixed(4)} $WETCAT!`;
      this.isLoading = false;
      this.refreshData();
    });

    stakingIntegration.on('compounded', (data) => {
      this.successMessage = `Compounded ${parseFloat(data.amount).toFixed(4)} $WETCAT!`;
      this.isLoading = false;
      this.refreshData();
    });

    stakingIntegration.on('error', (error) => {
      this.errorMessage = error.message || 'Transaction failed';
      this.isLoading = false;
    });

    stakingIntegration.on('transactionPending', (data) => {
      this.isLoading = true;
      this.errorMessage = null;
    });
  }

  async refreshData() {
    if (wetcatWeb3.connectionStatus !== 'connected') return;

    try {
      this.stakeInfo = await stakingIntegration.getStakeInfo();
      this.globalStats = await stakingIntegration.getGlobalStats();
    } catch (error) {
      console.error('Failed to refresh staking data:', error);
    }
  }

  update(deltaTime) {
    // Clear messages after 3 seconds
    if (this.successMessage || this.errorMessage) {
      this.messageTimer = (this.messageTimer || 0) + deltaTime;
      if (this.messageTimer > 3) {
        this.successMessage = null;
        this.errorMessage = null;
        this.messageTimer = 0;
      }
    }

    // Periodic refresh
    if (wetcatWeb3.connectionStatus === 'connected') {
      this.updateTimer += deltaTime;
      if (this.updateTimer >= this.updateInterval) {
        this.updateTimer = 0;
        this.refreshData();
      }
    }
  }

  render(ctx) {
    if (!this.isVisible || wetcatWeb3.connectionStatus !== 'connected') return;

    ctx.save();

    const panelHeight = this.isExpanded ? this.expandedHeight : this.collapsedHeight;

    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(this.panelX, this.panelY, this.panelWidth, panelHeight);

    // Panel border (gold for staking)
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.panelX, this.panelY, this.panelWidth, panelHeight);

    // Header
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('STAKING', this.panelX + 10, this.panelY + 25);

    // Expand/collapse indicator
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(this.isExpanded ? '[-]' : '[+]', this.panelX + this.panelWidth - 10, this.panelY + 25);

    // Store toggle button bounds
    this.buttons.toggle = {
      x: this.panelX,
      y: this.panelY,
      width: this.panelWidth,
      height: this.collapsedHeight
    };

    if (this.isExpanded) {
      this.renderExpandedView(ctx);
    } else {
      this.renderCollapsedView(ctx);
    }

    // Loading overlay
    if (this.isLoading) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(this.panelX, this.panelY, this.panelWidth, panelHeight);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Processing...', this.panelX + this.panelWidth / 2, this.panelY + panelHeight / 2);
    }

    // Messages
    if (this.successMessage) {
      this.drawMessage(ctx, this.successMessage, '#4CAF50');
    } else if (this.errorMessage) {
      this.drawMessage(ctx, this.errorMessage, '#ff4444');
    }

    ctx.restore();
  }

  renderCollapsedView(ctx) {
    if (this.stakeInfo && this.stakeInfo.isActive) {
      ctx.fillStyle = '#4CAF50';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(
        `Staked: ${parseFloat(this.stakeInfo.amount).toFixed(2)} | APY: ${this.stakeInfo.effectiveAPY}%`,
        this.panelX + 80,
        this.panelY + 25
      );
    } else {
      ctx.fillStyle = '#888';
      ctx.font = '12px Arial';
      ctx.fillText('Click to expand', this.panelX + 80, this.panelY + 25);
    }
  }

  renderExpandedView(ctx) {
    let y = this.panelY + 50;

    if (this.stakeInfo && this.stakeInfo.isActive) {
      // Active stake view
      this.renderActiveStake(ctx, y);
    } else {
      // New stake view
      this.renderNewStake(ctx, y);
    }

    // Global stats at bottom
    this.renderGlobalStats(ctx);
  }

  renderActiveStake(ctx, startY) {
    let y = startY;

    // Staked amount
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Your Stake:', this.panelX + 10, y);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`${parseFloat(this.stakeInfo.amount).toFixed(2)} $WETCAT`, this.panelX + 10, y + 18);
    y += 40;

    // APY
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`${this.stakeInfo.effectiveAPY}% APY`, this.panelX + 10, y);

    // World ID bonus indicator
    if (worldID.isVerified()) {
      ctx.fillStyle = '#00ff00';
      ctx.font = '10px Arial';
      ctx.fillText('(+15% World ID bonus)', this.panelX + 100, y);
    }
    y += 25;

    // Tier info
    ctx.fillStyle = '#888';
    ctx.font = '11px Arial';
    ctx.fillText(`Tier: ${this.stakeInfo.tierInfo.name}`, this.panelX + 10, y);
    y += 18;

    // Lock end time
    if (this.stakeInfo.lockEndTime && this.stakeInfo.tier !== LockTier.FLEXIBLE) {
      const now = new Date();
      const lockEnd = this.stakeInfo.lockEndTime;
      const daysLeft = Math.max(0, Math.ceil((lockEnd - now) / (1000 * 60 * 60 * 24)));

      ctx.fillStyle = daysLeft > 0 ? '#ff8800' : '#4CAF50';
      ctx.fillText(
        daysLeft > 0 ? `Unlock in: ${daysLeft} days` : 'Unlocked!',
        this.panelX + 10,
        y
      );
    }
    y += 25;

    // Pending rewards
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText('Pending Rewards:', this.panelX + 10, y);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`${parseFloat(this.stakeInfo.pendingRewards).toFixed(4)} $WETCAT`, this.panelX + 10, y + 16);
    y += 45;

    // Action buttons
    const buttonWidth = 80;
    const buttonHeight = 28;
    const buttonGap = 10;
    let buttonX = this.panelX + 10;

    // Claim button
    this.drawButton(ctx, 'Claim', buttonX, y, buttonWidth, buttonHeight, '#4CAF50');
    this.buttons.claim = { x: buttonX, y, width: buttonWidth, height: buttonHeight };
    buttonX += buttonWidth + buttonGap;

    // Compound button
    this.drawButton(ctx, 'Compound', buttonX, y, buttonWidth, buttonHeight, '#2196F3');
    this.buttons.compound = { x: buttonX, y, width: buttonWidth, height: buttonHeight };
    buttonX += buttonWidth + buttonGap;

    // Unstake button
    if (this.stakeInfo.canUnstake) {
      this.drawButton(ctx, 'Unstake', buttonX, y, buttonWidth, buttonHeight, '#ff4444');
      this.buttons.unstake = { x: buttonX, y, width: buttonWidth, height: buttonHeight };
    } else {
      this.drawButton(ctx, 'Locked', buttonX, y, buttonWidth, buttonHeight, '#666', true);
      this.buttons.unstake = null;
    }
  }

  renderNewStake(ctx, startY) {
    let y = startY;

    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Start Staking $WETCAT', this.panelX + 10, y);
    y += 25;

    // Tier selection
    ctx.fillStyle = '#888';
    ctx.font = '11px Arial';
    ctx.fillText('Select Lock Period:', this.panelX + 10, y);
    y += 20;

    // Tier buttons
    const tierButtonWidth = 50;
    const tierButtonHeight = 24;
    let tierX = this.panelX + 10;

    Object.entries(LOCK_TIER_INFO).forEach(([tier, info]) => {
      const isSelected = parseInt(tier) === this.selectedTier;
      this.drawButton(
        ctx,
        info.name.substring(0, 4),
        tierX,
        y,
        tierButtonWidth,
        tierButtonHeight,
        isSelected ? '#FFD700' : '#444'
      );
      this.buttons[`tier_${tier}`] = { x: tierX, y, width: tierButtonWidth, height: tierButtonHeight, tier: parseInt(tier) };
      tierX += tierButtonWidth + 5;
    });
    y += 35;

    // Selected tier info
    const selectedInfo = LOCK_TIER_INFO[this.selectedTier];
    ctx.fillStyle = '#FFD700';
    ctx.font = '11px Arial';
    ctx.fillText(selectedInfo.description, this.panelX + 10, y);
    y += 20;

    // APY preview
    const baseAPY = 25;
    const tierBonus = selectedInfo.bonus;
    const verifiedBonus = worldID.isVerified() ? 15 : 0;
    const totalAPY = baseAPY + tierBonus + verifiedBonus;

    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Est. APY: ${totalAPY}%`, this.panelX + 10, y);
    y += 25;

    // Amount input display
    ctx.fillStyle = '#fff';
    ctx.font = '11px Arial';
    ctx.fillText('Amount to stake:', this.panelX + 10, y);
    y += 18;

    // Amount input box
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(this.panelX + 10, y, 150, 25);
    ctx.strokeStyle = '#FFD700';
    ctx.strokeRect(this.panelX + 10, y, 150, 25);

    ctx.fillStyle = this.stakeAmount ? '#fff' : '#888';
    ctx.font = '12px Arial';
    ctx.fillText(
      this.stakeAmount || '100 (min)',
      this.panelX + 15,
      y + 17
    );

    // Quick amount buttons
    const quickAmounts = [100, 500, 1000];
    let quickX = this.panelX + 170;
    quickAmounts.forEach(amount => {
      this.drawButton(ctx, String(amount), quickX, y, 30, 25, '#444');
      this.buttons[`amount_${amount}`] = { x: quickX, y, width: 30, height: 25, amount };
      quickX += 35;
    });
    y += 40;

    // Stake button
    this.drawButton(ctx, 'STAKE NOW', this.panelX + 10, y, this.panelWidth - 20, 32, '#FFD700');
    this.buttons.stakeNow = { x: this.panelX + 10, y, width: this.panelWidth - 20, height: 32 };
  }

  renderGlobalStats(ctx) {
    if (!this.globalStats) return;

    const y = this.panelY + this.expandedHeight - 35;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(this.panelX + 5, y - 5, this.panelWidth - 10, 30);

    ctx.fillStyle = '#888';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Total Staked: ${parseFloat(this.globalStats.totalStaked).toFixed(0)} | Stakers: ${this.globalStats.totalStakers}`,
      this.panelX + this.panelWidth / 2,
      y + 10
    );
  }

  drawButton(ctx, text, x, y, width, height, color, disabled = false) {
    ctx.fillStyle = disabled ? '#333' : color;
    ctx.fillRect(x, y, width, height);

    if (!disabled) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.strokeRect(x, y, width, height);
    }

    ctx.fillStyle = disabled ? '#666' : (color === '#FFD700' ? '#000' : '#fff');
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
    ctx.textBaseline = 'alphabetic';
  }

  drawMessage(ctx, message, color) {
    const y = this.panelY - 30;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(this.panelX, y, this.panelWidth, 25);
    ctx.strokeStyle = color;
    ctx.strokeRect(this.panelX, y, this.panelWidth, 25);

    ctx.fillStyle = color;
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, this.panelX + this.panelWidth / 2, y + 16);
  }

  handleClick(x, y) {
    if (!this.isVisible || wetcatWeb3.connectionStatus !== 'connected') return false;

    // Toggle expand/collapse
    if (this.isPointInButton(x, y, this.buttons.toggle)) {
      this.isExpanded = !this.isExpanded;
      if (this.isExpanded) {
        this.refreshData();
      }
      return true;
    }

    if (!this.isExpanded) return false;

    // Active stake actions
    if (this.stakeInfo && this.stakeInfo.isActive) {
      if (this.isPointInButton(x, y, this.buttons.claim)) {
        stakingIntegration.claimRewards();
        return true;
      }
      if (this.isPointInButton(x, y, this.buttons.compound)) {
        stakingIntegration.compound();
        return true;
      }
      if (this.buttons.unstake && this.isPointInButton(x, y, this.buttons.unstake)) {
        stakingIntegration.unstake();
        return true;
      }
    } else {
      // New stake actions
      // Tier selection
      for (let tier = 0; tier <= 4; tier++) {
        const btn = this.buttons[`tier_${tier}`];
        if (btn && this.isPointInButton(x, y, btn)) {
          this.selectedTier = tier;
          return true;
        }
      }

      // Quick amount buttons
      [100, 500, 1000].forEach(amount => {
        const btn = this.buttons[`amount_${amount}`];
        if (btn && this.isPointInButton(x, y, btn)) {
          this.stakeAmount = String(amount);
        }
      });

      // Stake button
      if (this.isPointInButton(x, y, this.buttons.stakeNow)) {
        const amount = parseFloat(this.stakeAmount) || 100;
        if (amount >= 100) {
          stakingIntegration.stake(amount, this.selectedTier);
        } else {
          this.errorMessage = 'Minimum stake is 100 $WETCAT';
        }
        return true;
      }
    }

    return false;
  }

  isPointInButton(x, y, button) {
    if (!button) return false;
    return x >= button.x && x <= button.x + button.width &&
           y >= button.y && y <= button.y + button.height;
  }

  show() {
    this.isVisible = true;
    this.refreshData();
  }

  hide() {
    this.isVisible = false;
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}
