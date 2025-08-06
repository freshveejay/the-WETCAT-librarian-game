import { ethers } from 'ethers';

export class WETCATWeb3 {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.wetcatContract = null;
    this.gameContract = null;
    console.log('WETCATWeb3 initialized');

    // Contract addresses (UPDATE THESE WITH REAL ADDRESSES)
    this.WETCAT_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'; // TODO: Add real address
    this.GAME_REWARDS_ADDRESS = '0x0000000000000000000000000000000000000000'; // TODO: Deploy and add

    // ABIs
    this.WETCAT_ABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
      'function approve(address spender, uint256 amount) returns (bool)'
    ];

    this.GAME_REWARDS_ABI = [
      'function claimDailyReward(uint256 score) external',
      'function claimAchievement(string memory achievementId) external',
      'function getPlayerStats(address player) external view returns (uint256 totalEarned, uint256 highScore, uint256 lastClaim)',
      'function isAchievementClaimed(address player, string memory achievementId) external view returns (bool)',
      'event RewardClaimed(address indexed player, uint256 amount, string reason)'
    ];

    this.connectionStatus = 'disconnected';
    this.listeners = new Map();
  }

  async connect() {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask not installed! Please install MetaMask to earn $WETCAT rewards.');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      this.account = await this.signer.getAddress();

      // Initialize contracts
      this.wetcatContract = new ethers.Contract(
        this.WETCAT_TOKEN_ADDRESS,
        this.WETCAT_ABI,
        this.signer
      );

      this.gameContract = new ethers.Contract(
        this.GAME_REWARDS_ADDRESS,
        this.GAME_REWARDS_ABI,
        this.signer
      );

      // Set up event listeners
      this.setupEventListeners();

      this.connectionStatus = 'connected';
      this.emit('connected', { account: this.account });

      // Get initial balance
      await this.updateBalance();

      return true;
    } catch (error) {
      console.error('Web3 connection failed:', error);
      this.connectionStatus = 'error';
      this.emit('error', error);
      return false;
    }
  }

  async disconnect() {
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.wetcatContract = null;
    this.gameContract = null;
    this.connectionStatus = 'disconnected';
    this.emit('disconnected');
  }

  setupEventListeners() {
    // Listen for account changes
    window.ethereum.on('accountsChanged', async (accounts) => {
      if (accounts.length === 0) {
        await this.disconnect();
      } else {
        this.account = accounts[0];
        await this.updateBalance();
        this.emit('accountChanged', { account: this.account });
      }
    });

    // Listen for chain changes
    window.ethereum.on('chainChanged', (chainId) => {
      window.location.reload();
    });

    // Listen for reward events
    if (this.gameContract) {
      this.gameContract.on('RewardClaimed', (player, amount, reason) => {
        if (player.toLowerCase() === this.account.toLowerCase()) {
          this.emit('rewardClaimed', { amount, reason });
          this.updateBalance();
        }
      });
    }
  }

  async updateBalance() {
    if (!this.wetcatContract || !this.account) return;

    try {
      const balance = await this.wetcatContract.balanceOf(this.account);
      const formatted = ethers.utils.formatEther(balance);
      this.emit('balanceUpdated', { balance: formatted });
      return formatted;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }

  async claimDailyReward(score) {
    if (!this.gameContract) throw new Error('Not connected to Web3');

    try {
      const tx = await this.gameContract.claimDailyReward(score);
      this.emit('transactionPending', { tx: tx.hash });

      const receipt = await tx.wait();
      this.emit('transactionConfirmed', { receipt });

      return receipt;
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('Transaction rejected by user');
      }
      throw error;
    }
  }

  async claimAchievement(achievementId) {
    if (!this.gameContract) throw new Error('Not connected to Web3');

    try {
      // Check if already claimed
      const isClaimed = await this.gameContract.isAchievementClaimed(this.account, achievementId);
      if (isClaimed) {
        throw new Error('Achievement already claimed');
      }

      const tx = await this.gameContract.claimAchievement(achievementId);
      this.emit('transactionPending', { tx: tx.hash });

      const receipt = await tx.wait();
      this.emit('transactionConfirmed', { receipt });

      return receipt;
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('Transaction rejected by user');
      }
      throw error;
    }
  }

  async getPlayerStats() {
    if (!this.gameContract || !this.account) return null;

    try {
      const stats = await this.gameContract.getPlayerStats(this.account);
      return {
        totalEarned: ethers.utils.formatEther(stats.totalEarned),
        highScore: stats.highScore.toNumber(),
        lastClaim: new Date(stats.lastClaim.toNumber() * 1000)
      };
    } catch (error) {
      console.error('Failed to get player stats:', error);
      return null;
    }
  }

  // Event emitter pattern
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
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;

    this.listeners.get(event).forEach(callback => {
      callback(data);
    });
  }

  // Utility functions
  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  async switchToCorrectNetwork() {
    // TODO: Add the correct chain ID for your deployment
    const REQUIRED_CHAIN_ID = '0x1'; // Mainnet

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: REQUIRED_CHAIN_ID }]
      });
      return true;
    } catch (error) {
      if (error.code === 4902) {
        // Chain not added, could add it here
        console.error('Please add the correct network to MetaMask');
      }
      return false;
    }
  }
}

// Singleton instance
export const wetcatWeb3 = new WETCATWeb3();