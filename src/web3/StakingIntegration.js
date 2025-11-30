import { ethers } from 'ethers';
import { wetcatWeb3 } from './WETCATWeb3.js';
import { worldID } from './WorldIDIntegration.js';

// Lock tier enum matching the contract
export const LockTier = {
  FLEXIBLE: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  DIAMOND: 4
};

// Lock tier display info
export const LOCK_TIER_INFO = {
  [LockTier.FLEXIBLE]: { name: 'Flexible', days: 0, bonus: 0, description: 'No lock, withdraw anytime' },
  [LockTier.BRONZE]: { name: 'Bronze', days: 7, bonus: 5, description: '7 day lock, +5% APY' },
  [LockTier.SILVER]: { name: 'Silver', days: 30, bonus: 15, description: '30 day lock, +15% APY' },
  [LockTier.GOLD]: { name: 'Gold', days: 90, bonus: 30, description: '90 day lock, +30% APY' },
  [LockTier.DIAMOND]: { name: 'Diamond', days: 180, bonus: 50, description: '180 day lock, +50% APY' }
};

export class StakingIntegration {
  constructor() {
    // Contract address on World Chain (TODO: Deploy and update)
    this.STAKING_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

    this.stakingContract = null;
    this.listeners = new Map();

    // Staking ABI
    this.STAKING_ABI = [
      'function stake(uint256 amount, uint8 tier) external',
      'function addToStake(uint256 amount) external',
      'function unstake() external',
      'function emergencyUnstake() external',
      'function claimRewards() external',
      'function compound() external',
      'function calculatePendingRewards(address user) view returns (uint256)',
      'function getEffectiveAPY(address user) view returns (uint256)',
      'function getStakeInfo(address user) view returns (uint256 amount, uint256 startTime, uint256 lockEndTime, uint256 pendingRewards, uint256 effectiveAPY, uint8 tier, bool isActive, bool canUnstake)',
      'function getLockTierInfo(uint8 tier) view returns (uint256 lockDays, uint256 bonusAPY, string name)',
      'function getGlobalStats() view returns (uint256 totalStaked, uint256 totalStakers, uint256 totalRewardsDistributed, uint256 contractBalance)',
      'function MIN_STAKE() view returns (uint256)',
      'function BASE_APY() view returns (uint256)',
      'event Staked(address indexed user, uint256 amount, uint8 tier, uint256 lockEndTime)',
      'event Unstaked(address indexed user, uint256 amount, uint256 rewards)',
      'event RewardsClaimed(address indexed user, uint256 amount)',
      'event Compounded(address indexed user, uint256 rewards)'
    ];
  }

  async initialize() {
    if (!wetcatWeb3.provider || !wetcatWeb3.signer) {
      throw new Error('Web3 not connected');
    }

    this.stakingContract = new ethers.Contract(
      this.STAKING_CONTRACT_ADDRESS,
      this.STAKING_ABI,
      wetcatWeb3.signer
    );

    // Setup event listeners
    this.setupEventListeners();

    console.log('Staking integration initialized');
  }

  setupEventListeners() {
    if (!this.stakingContract) return;

    this.stakingContract.on('Staked', (user, amount, tier, lockEndTime) => {
      if (user.toLowerCase() === wetcatWeb3.account?.toLowerCase()) {
        this.emit('staked', {
          amount: ethers.formatEther(amount),
          tier,
          lockEndTime: new Date(Number(lockEndTime) * 1000)
        });
      }
    });

    this.stakingContract.on('Unstaked', (user, amount, rewards) => {
      if (user.toLowerCase() === wetcatWeb3.account?.toLowerCase()) {
        this.emit('unstaked', {
          amount: ethers.formatEther(amount),
          rewards: ethers.formatEther(rewards)
        });
      }
    });

    this.stakingContract.on('RewardsClaimed', (user, amount) => {
      if (user.toLowerCase() === wetcatWeb3.account?.toLowerCase()) {
        this.emit('rewardsClaimed', {
          amount: ethers.formatEther(amount)
        });
      }
    });

    this.stakingContract.on('Compounded', (user, rewards) => {
      if (user.toLowerCase() === wetcatWeb3.account?.toLowerCase()) {
        this.emit('compounded', {
          amount: ethers.formatEther(rewards)
        });
      }
    });
  }

  // Stake tokens
  async stake(amount, tier = LockTier.FLEXIBLE) {
    if (!this.stakingContract) {
      await this.initialize();
    }

    try {
      const amountWei = ethers.parseEther(amount.toString());

      // First approve the staking contract to spend tokens
      const approveTx = await wetcatWeb3.wetcatContract.approve(
        this.STAKING_CONTRACT_ADDRESS,
        amountWei
      );
      this.emit('transactionPending', { type: 'approve', hash: approveTx.hash });
      await approveTx.wait();

      // Then stake
      const stakeTx = await this.stakingContract.stake(amountWei, tier);
      this.emit('transactionPending', { type: 'stake', hash: stakeTx.hash });

      const receipt = await stakeTx.wait();
      this.emit('transactionConfirmed', { type: 'stake', receipt });

      return receipt;
    } catch (error) {
      console.error('Staking error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  // Add to existing stake
  async addToStake(amount) {
    if (!this.stakingContract) {
      await this.initialize();
    }

    try {
      const amountWei = ethers.parseEther(amount.toString());

      // Approve first
      const approveTx = await wetcatWeb3.wetcatContract.approve(
        this.STAKING_CONTRACT_ADDRESS,
        amountWei
      );
      await approveTx.wait();

      // Add to stake
      const tx = await this.stakingContract.addToStake(amountWei);
      this.emit('transactionPending', { type: 'addToStake', hash: tx.hash });

      const receipt = await tx.wait();
      this.emit('transactionConfirmed', { type: 'addToStake', receipt });

      return receipt;
    } catch (error) {
      console.error('Add to stake error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  // Unstake tokens
  async unstake() {
    if (!this.stakingContract) {
      await this.initialize();
    }

    try {
      const tx = await this.stakingContract.unstake();
      this.emit('transactionPending', { type: 'unstake', hash: tx.hash });

      const receipt = await tx.wait();
      this.emit('transactionConfirmed', { type: 'unstake', receipt });

      return receipt;
    } catch (error) {
      console.error('Unstake error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  // Emergency unstake (with penalty)
  async emergencyUnstake() {
    if (!this.stakingContract) {
      await this.initialize();
    }

    try {
      const tx = await this.stakingContract.emergencyUnstake();
      this.emit('transactionPending', { type: 'emergencyUnstake', hash: tx.hash });

      const receipt = await tx.wait();
      this.emit('transactionConfirmed', { type: 'emergencyUnstake', receipt });

      return receipt;
    } catch (error) {
      console.error('Emergency unstake error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  // Claim rewards
  async claimRewards() {
    if (!this.stakingContract) {
      await this.initialize();
    }

    try {
      const tx = await this.stakingContract.claimRewards();
      this.emit('transactionPending', { type: 'claimRewards', hash: tx.hash });

      const receipt = await tx.wait();
      this.emit('transactionConfirmed', { type: 'claimRewards', receipt });

      return receipt;
    } catch (error) {
      console.error('Claim rewards error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  // Compound rewards into stake
  async compound() {
    if (!this.stakingContract) {
      await this.initialize();
    }

    try {
      const tx = await this.stakingContract.compound();
      this.emit('transactionPending', { type: 'compound', hash: tx.hash });

      const receipt = await tx.wait();
      this.emit('transactionConfirmed', { type: 'compound', receipt });

      return receipt;
    } catch (error) {
      console.error('Compound error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  // Get user stake info
  async getStakeInfo(address = null) {
    if (!this.stakingContract) {
      await this.initialize();
    }

    const userAddress = address || wetcatWeb3.account;
    if (!userAddress) return null;

    try {
      const info = await this.stakingContract.getStakeInfo(userAddress);

      return {
        amount: ethers.formatEther(info.amount),
        startTime: info.startTime > 0 ? new Date(Number(info.startTime) * 1000) : null,
        lockEndTime: info.lockEndTime > 0 ? new Date(Number(info.lockEndTime) * 1000) : null,
        pendingRewards: ethers.formatEther(info.pendingRewards),
        effectiveAPY: Number(info.effectiveAPY),
        tier: Number(info.tier),
        tierInfo: LOCK_TIER_INFO[Number(info.tier)],
        isActive: info.isActive,
        canUnstake: info.canUnstake
      };
    } catch (error) {
      console.error('Get stake info error:', error);
      return null;
    }
  }

  // Get pending rewards
  async getPendingRewards(address = null) {
    if (!this.stakingContract) {
      await this.initialize();
    }

    const userAddress = address || wetcatWeb3.account;
    if (!userAddress) return '0';

    try {
      const rewards = await this.stakingContract.calculatePendingRewards(userAddress);
      return ethers.formatEther(rewards);
    } catch (error) {
      console.error('Get pending rewards error:', error);
      return '0';
    }
  }

  // Get effective APY for user
  async getEffectiveAPY(address = null) {
    if (!this.stakingContract) {
      await this.initialize();
    }

    const userAddress = address || wetcatWeb3.account;
    if (!userAddress) return 25; // Base APY

    try {
      const apy = await this.stakingContract.getEffectiveAPY(userAddress);
      return Number(apy);
    } catch (error) {
      console.error('Get effective APY error:', error);
      return 25;
    }
  }

  // Get global staking stats
  async getGlobalStats() {
    if (!this.stakingContract) {
      await this.initialize();
    }

    try {
      const stats = await this.stakingContract.getGlobalStats();

      return {
        totalStaked: ethers.formatEther(stats.totalStaked),
        totalStakers: Number(stats.totalStakers),
        totalRewardsDistributed: ethers.formatEther(stats.totalRewardsDistributed),
        contractBalance: ethers.formatEther(stats.contractBalance)
      };
    } catch (error) {
      console.error('Get global stats error:', error);
      return {
        totalStaked: '0',
        totalStakers: 0,
        totalRewardsDistributed: '0',
        contractBalance: '0'
      };
    }
  }

  // Calculate estimated rewards for a given amount and tier
  calculateEstimatedRewards(amount, tier, days) {
    const tierInfo = LOCK_TIER_INFO[tier];
    const baseAPY = 25;
    const tierBonus = tierInfo.bonus;
    const verifiedBonus = worldID.isVerified() ? 15 : 0;

    const totalAPY = baseAPY + tierBonus + verifiedBonus;
    const dailyRate = totalAPY / 365 / 100;

    return (amount * dailyRate * days).toFixed(4);
  }

  // Event emitter
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index !== -1) callbacks.splice(index, 1);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => callback(data));
  }
}

// Singleton instance
export const stakingIntegration = new StakingIntegration();
