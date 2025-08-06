import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WETCATWeb3 } from '../../src/web3/WETCATWeb3.js';
import { WorldIDIntegration } from '../../src/web3/WorldIDIntegration.js';
import { ethers } from 'ethers';

// Mock ethers
vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn().mockImplementation(() => ({
      getSigner: vi.fn().mockResolvedValue({
        getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
      }),
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1n })
    })),
    Contract: vi.fn().mockImplementation(() => ({
      balanceOf: vi.fn().mockResolvedValue(1000n),
      approve: vi.fn().mockResolvedValue({ wait: vi.fn() }),
      claimDailyReward: vi.fn().mockResolvedValue({ wait: vi.fn() }),
      getPlayerStats: vi.fn().mockResolvedValue([100n, 50n, Date.now(), true])
    })),
    parseEther: vi.fn(amount => BigInt(amount * 1e18)),
    formatEther: vi.fn(wei => Number(wei) / 1e18),
    isAddress: vi.fn(addr => addr.startsWith('0x') && addr.length === 42)
  }
}));

describe('Web3 Integration', () => {
  let web3Integration;
  let mockWindow;

  beforeEach(() => {
    // Mock window.ethereum
    mockWindow = {
      ethereum: {
        request: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
        isMetaMask: true
      }
    };
    global.window = mockWindow;

    // Reset singleton instance
    WETCATWeb3.instance = null;
    web3Integration = new WETCATWeb3();
  });

  describe('Wallet Connection', () => {
    it('should connect to MetaMask wallet', async () => {
      mockWindow.ethereum.request.mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']);
      
      const result = await web3Integration.connectWallet();

      expect(result.success).toBe(true);
      expect(result.address).toBe('0x1234567890123456789012345678901234567890');
      expect(web3Integration.isConnected()).toBe(true);
    });

    it('should handle wallet connection errors', async () => {
      mockWindow.ethereum.request.mockRejectedValueOnce(new Error('User rejected'));
      
      const result = await web3Integration.connectWallet();

      expect(result.success).toBe(false);
      expect(result.error).toContain('User rejected');
      expect(web3Integration.isConnected()).toBe(false);
    });

    it('should detect when wallet is not installed', async () => {
      delete global.window.ethereum;
      
      const result = await web3Integration.connectWallet();

      expect(result.success).toBe(false);
      expect(result.error).toContain('wallet');
    });

    it('should handle account changes', () => {
      const callback = vi.fn();
      web3Integration.onAccountChange(callback);

      // Simulate account change
      const accountChangeHandler = mockWindow.ethereum.on.mock.calls.find(
        call => call[0] === 'accountsChanged'
      )[1];
      accountChangeHandler(['0x9876543210987654321098765432109876543210']);

      expect(callback).toHaveBeenCalledWith('0x9876543210987654321098765432109876543210');
    });
  });

  describe('Token Balance', () => {
    beforeEach(async () => {
      mockWindow.ethereum.request.mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']);
      await web3Integration.connectWallet();
    });

    it('should fetch WETCAT token balance', async () => {
      const balance = await web3Integration.getWETCATBalance();

      expect(balance).toBe('1000.0');
    });

    it('should format balance with correct decimals', async () => {
      web3Integration.contract.balanceOf.mockResolvedValueOnce(1234567890123456789012n);
      
      const balance = await web3Integration.getWETCATBalance();

      expect(balance).toBe('1234.567890123456789012');
    });
  });

  describe('Game Rewards', () => {
    beforeEach(async () => {
      mockWindow.ethereum.request.mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']);
      await web3Integration.connectWallet();
    });

    it('should claim daily rewards', async () => {
      const gameSession = {
        score: 1000,
        booksCollected: 50,
        kidsRepelled: 20,
        timePlayed: 1800
      };

      const result = await web3Integration.claimDailyReward(gameSession);

      expect(result.success).toBe(true);
      expect(web3Integration.contract.claimDailyReward).toHaveBeenCalled();
    });

    it('should check if daily reward is available', async () => {
      const canClaim = await web3Integration.canClaimDailyReward();

      expect(canClaim).toBe(true);
    });

    it('should get player stats', async () => {
      const stats = await web3Integration.getPlayerStats();

      expect(stats.totalScore).toBe(100);
      expect(stats.rewardsClaimed).toBe(50);
      expect(stats.canClaimDaily).toBe(true);
    });
  });

  describe('Permit2 Integration', () => {
    it('should approve tokens with Permit2', async () => {
      const result = await web3Integration.approveWithPermit2(100);

      expect(result.success).toBe(true);
      expect(web3Integration.contract.approve).toHaveBeenCalled();
    });
  });

  describe('Network Handling', () => {
    it('should switch to correct network', async () => {
      mockWindow.ethereum.request
        .mockRejectedValueOnce({ code: 4902 }) // Chain not added
        .mockResolvedValueOnce(null); // Add chain success

      const result = await web3Integration.switchToCorrectNetwork();

      expect(result).toBe(true);
      expect(mockWindow.ethereum.request).toHaveBeenCalledWith({
        method: 'wallet_addEthereumChain',
        params: expect.any(Array)
      });
    });

    it('should handle network switch errors', async () => {
      mockWindow.ethereum.request.mockRejectedValueOnce(new Error('User rejected'));

      const result = await web3Integration.switchToCorrectNetwork();

      expect(result).toBe(false);
    });
  });
});

describe('World ID Integration', () => {
  let worldID;

  beforeEach(() => {
    worldID = new WorldIDIntegration();
    localStorage.clear();
  });

  describe('Verification Flow', () => {
    it('should verify with World ID orb', async () => {
      // Mock successful verification
      global.fetch = vi.fn().mockResolvedValueOnce({
        json: async () => ({ verified: true })
      });

      // Simulate localhost development
      delete global.window.location;
      global.window.location = { hostname: 'localhost' };

      const verification = await worldID.verifyWithOrb();

      expect(verification.isVerified).toBe(true);
      expect(verification.verificationLevel).toBe('orb');
    });

    it('should cache verification in localStorage', () => {
      const verificationData = {
        isVerified: true,
        nullifierHash: '0x123',
        proof: '0xabc',
        merkleRoot: '0xdef',
        verificationLevel: 'orb'
      };

      worldID.saveVerification(verificationData);

      const cached = JSON.parse(localStorage.getItem('worldid_verification'));
      expect(cached.isVerified).toBe(true);
      expect(cached.timestamp).toBeDefined();
    });

    it('should load cached verification if valid', () => {
      const verificationData = {
        isVerified: true,
        nullifierHash: '0x123',
        timestamp: Date.now() - 1000 // 1 second ago
      };

      localStorage.setItem('worldid_verification', JSON.stringify(verificationData));
      
      const newWorldID = new WorldIDIntegration();
      expect(newWorldID.isVerified()).toBe(true);
    });

    it('should clear expired verification', () => {
      const oldVerification = {
        isVerified: true,
        timestamp: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      };

      localStorage.setItem('worldid_verification', JSON.stringify(oldVerification));
      
      const newWorldID = new WorldIDIntegration();
      expect(newWorldID.isVerified()).toBe(false);
      expect(localStorage.getItem('worldid_verification')).toBeNull();
    });
  });

  describe('Rewards Multiplier', () => {
    it('should return correct multiplier for orb verification', () => {
      worldID.verificationStatus = {
        isVerified: true,
        verificationLevel: 'orb'
      };

      expect(worldID.getRewardMultiplier()).toBe(2.0);
    });

    it('should return correct multiplier for device verification', () => {
      worldID.verificationStatus = {
        isVerified: true,
        verificationLevel: 'device'
      };

      expect(worldID.getRewardMultiplier()).toBe(1.5);
    });

    it('should return 1.0 multiplier when not verified', () => {
      expect(worldID.getRewardMultiplier()).toBe(1.0);
    });
  });

  describe('World App Detection', () => {
    it('should detect World App user agent', () => {
      global.window.navigator = { userAgent: 'Mozilla/5.0 WorldApp/1.0' };
      
      expect(worldID.isWorldApp()).toBe(true);
    });

    it('should detect World App query parameter', () => {
      global.window.location = { search: '?world-app=true' };
      
      expect(worldID.isWorldApp()).toBe(true);
    });

    it('should detect World App global object', () => {
      global.window.WorldApp = {};
      
      expect(worldID.isWorldApp()).toBe(true);
    });
  });

  describe('Backend Verification', () => {
    it('should verify proof with backend', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verified: true })
      });

      const verificationResponse = {
        proof: '0xproof',
        merkle_root: '0xroot',
        nullifier_hash: '0xhash'
      };

      const verified = await worldID.verifyOnBackend(verificationResponse);

      expect(verified).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/verify-worldid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('0xproof')
      });
    });

    it('should handle backend verification errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const verified = await worldID.verifyOnBackend({});

      expect(verified).toBe(false);
    });
  });
});