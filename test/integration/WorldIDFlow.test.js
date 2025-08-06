import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldIDIntegration } from '../../src/web3/WorldIDIntegration.js';

describe('World ID Verification Flow', () => {
  let worldID;
  let mockWindow;

  beforeEach(() => {
    // Reset singleton and mocks
    localStorage.clear();
    worldID = new WorldIDIntegration();
    
    mockWindow = {
      location: { 
        hostname: 'localhost',
        search: ''
      },
      navigator: { userAgent: 'TestBrowser' },
      WorldApp: undefined
    };
    global.window = mockWindow;
  });

  describe('Complete Verification Flow', () => {
    it('should complete orb verification flow successfully', async () => {
      // Mock backend verification
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verified: true })
      });

      // Start verification
      const verificationPromise = worldID.verifyWithOrb();

      // Since we're in localhost, it should auto-complete
      const result = await verificationPromise;

      expect(result.isVerified).toBe(true);
      expect(result.nullifierHash).toBeDefined();
      expect(result.proof).toBeDefined();
      expect(result.merkleRoot).toBeDefined();
      expect(result.verificationLevel).toBe('orb');
      
      // Check if verification was saved
      expect(worldID.isVerified()).toBe(true);
      expect(localStorage.getItem('worldid_verification')).toBeTruthy();
    });

    it('should handle verification rejection', async () => {
      // Mock user rejection
      global.window.location.hostname = 'production.com';
      
      const verificationPromise = worldID.verifyWithOrb();
      
      // Since we're not in localhost and IDKit is not installed, 
      // it should show an alert
      expect(verificationPromise).rejects.toThrow();
    });
  });

  describe('World App Native Verification', () => {
    beforeEach(() => {
      // Mock World App environment
      mockWindow.WorldApp = {
        verify: vi.fn()
      };
    });

    it('should use native World App verification when available', async () => {
      mockWindow.WorldApp.verify.mockResolvedValueOnce({
        success: true,
        nullifier_hash: '0xWorldAppHash',
        proof: '0xWorldAppProof',
        merkle_root: '0xWorldAppRoot'
      });

      const result = await worldID.verifyWithOrb();

      expect(mockWindow.WorldApp.verify).toHaveBeenCalledWith({
        action_id: 'play_wetcat_game',
        signal: 'wetcat_game_session',
        verification_level: 'orb'
      });
      
      expect(result.isVerified).toBe(true);
      expect(result.nullifierHash).toBe('0xWorldAppHash');
    });

    it('should handle World App verification failure', async () => {
      mockWindow.WorldApp.verify.mockResolvedValueOnce({
        success: false,
        error: 'User cancelled'
      });

      await expect(worldID.verifyWithOrb()).rejects.toThrow('World App verification failed');
    });

    it('should handle World App bridge errors', async () => {
      mockWindow.WorldApp.verify.mockRejectedValueOnce(new Error('Bridge error'));

      await expect(worldID.verifyWithOrb()).rejects.toThrow('Bridge error');
    });
  });

  describe('Daily Reward Eligibility', () => {
    it('should allow daily rewards for orb-verified users only', () => {
      // Not verified
      expect(worldID.canClaimDailyReward()).toBe(false);

      // Device verified
      worldID.verificationStatus = {
        isVerified: true,
        verificationLevel: 'device'
      };
      expect(worldID.canClaimDailyReward()).toBe(false);

      // Orb verified
      worldID.verificationStatus = {
        isVerified: true,
        verificationLevel: 'orb'
      };
      expect(worldID.canClaimDailyReward()).toBe(true);
    });
  });

  describe('Verification Persistence', () => {
    it('should persist verification across page reloads', () => {
      const verificationData = {
        isVerified: true,
        nullifierHash: '0xPersisted',
        proof: '0xPersistedProof',
        merkleRoot: '0xPersistedRoot',
        verificationLevel: 'orb'
      };

      worldID.saveVerification(verificationData);

      // Simulate page reload with new instance
      const newWorldID = new WorldIDIntegration();

      expect(newWorldID.isVerified()).toBe(true);
      expect(newWorldID.getNullifierHash()).toBe('0xPersisted');
      expect(newWorldID.getVerificationLevel()).toBe('orb');
      expect(newWorldID.getRewardMultiplier()).toBe(2.0);
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('worldid_verification', 'corrupted{data}');

      // Should not throw and should handle gracefully
      const newWorldID = new WorldIDIntegration();
      expect(newWorldID.isVerified()).toBe(false);
    });
  });

  describe('Backend Verification Integration', () => {
    it('should send correct data to backend', async () => {
      let capturedRequest;
      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedRequest = { url, options };
        return Promise.resolve({
          ok: true,
          json: async () => ({ verified: true })
        });
      });

      const verificationResponse = {
        proof: '0xTestProof',
        merkle_root: '0xTestRoot',
        nullifier_hash: '0xTestHash'
      };

      await worldID.verifyOnBackend(verificationResponse);

      expect(capturedRequest.url).toBe('/api/verify-worldid');
      expect(capturedRequest.options.method).toBe('POST');
      
      const body = JSON.parse(capturedRequest.options.body);
      expect(body.proof).toBe('0xTestProof');
      expect(body.merkle_root).toBe('0xTestRoot');
      expect(body.nullifier_hash).toBe('0xTestHash');
      expect(body.action).toBe('play_wetcat_game');
      expect(body.verification_level).toBe('orb');
    });

    it('should handle backend verification failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verified: false, error: 'Invalid proof' })
      });

      const result = await worldID.verifyOnBackend({});
      expect(result).toBe(false);
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive verification data', () => {
      worldID.verificationStatus = {
        isVerified: true,
        nullifierHash: '0xSecret',
        proof: '0xSecretProof',
        merkleRoot: '0xSecretRoot',
        verificationLevel: 'orb'
      };

      // These methods should return data but not expose internals
      expect(worldID.isVerified()).toBe(true);
      expect(worldID.getNullifierHash()).toBe('0xSecret');
      
      // Should not be able to modify internal state
      const hash = worldID.getNullifierHash();
      hash = '0xModified';
      expect(worldID.getNullifierHash()).toBe('0xSecret');
    });

    it('should validate app configuration', () => {
      expect(worldID.APP_ID).toContain('app_staging_');
      expect(worldID.ACTION_ID).toBe('play_wetcat_game');
    });
  });
});