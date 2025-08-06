// WORLD ID CONFIGURATION INSTRUCTIONS:
// 1. Install the World ID SDK: npm install @worldcoin/idkit
// 2. Uncomment the import below after installation
// 3. Replace APP_ID with your actual App ID from https://developer.worldcoin.org
// 4. For production, use 'app_' prefix instead of 'app_staging_'

// import { IDKitWidget, VerificationLevel } from '@worldcoin/idkit';
// Temporarily commented out - using mock implementation

const VerificationLevel = {
  Orb: 'orb',
  Device: 'device'
};

export class WorldIDIntegration {
  constructor() {
    // World ID App configuration
    // IMPORTANT: Replace with your actual App ID from the World ID Developer Portal
    // Staging: app_staging_a1b2c3d4e5f6
    // Production: app_a1b2c3d4e5f6
    this.APP_ID = 'app_staging_YOUR_APP_ID'; // TODO: Replace with your World ID app ID
    this.ACTION_ID = 'play_wetcat_game';
    
    // Verification status
    this.verificationStatus = {
      isVerified: false,
      nullifierHash: null,
      proof: null,
      merkleRoot: null,
      verificationLevel: null
    };
    
    // Cache verification in localStorage
    this.loadCachedVerification();
  }

  loadCachedVerification() {
    const cached = localStorage.getItem('worldid_verification');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        // Check if verification is less than 24 hours old
        if (data.timestamp && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          this.verificationStatus = data;
        } else {
          // Clear expired verification
          localStorage.removeItem('worldid_verification');
        }
      } catch (e) {
        console.error('Failed to load cached verification:', e);
      }
    }
  }

  saveVerification(verificationData) {
    const dataToSave = {
      ...verificationData,
      timestamp: Date.now()
    };
    localStorage.setItem('worldid_verification', JSON.stringify(dataToSave));
    this.verificationStatus = dataToSave;
  }

  async verifyWithOrb() {
    return new Promise((resolve, reject) => {
      // For World App integration
      if (this.isWorldApp()) {
        this.verifyInWorldApp(resolve, reject);
      } else {
        // For web version - show IDKit widget
        this.showIDKitWidget(resolve, reject);
      }
    });
  }

  isWorldApp() {
    // Check if running inside World App
    return window.WorldApp !== undefined || 
           window.navigator.userAgent.includes('WorldApp') ||
           window.location.search.includes('world-app=true');
  }

  showIDKitWidget(resolve, reject) {
    // This would be rendered in React, but for vanilla JS:
    const config = {
      app_id: this.APP_ID,
      action: this.ACTION_ID,
      verification_level: VerificationLevel.Orb,
      handleVerify: async (verificationResponse) => {
        console.log('Verification successful:', verificationResponse);
        
        // Save verification data
        this.saveVerification({
          isVerified: true,
          nullifierHash: verificationResponse.nullifier_hash,
          proof: verificationResponse.proof,
          merkleRoot: verificationResponse.merkle_root,
          verificationLevel: 'orb'
        });
        
        // Send to backend for verification
        const verified = await this.verifyOnBackend(verificationResponse);
        if (verified) {
          resolve(this.verificationStatus);
        } else {
          reject(new Error('Backend verification failed'));
        }
      },
      onError: (error) => {
        console.error('Verification error:', error);
        reject(error);
      }
    };

    // TODO: After installing @worldcoin/idkit, replace this with actual IDKit component
    // Example React implementation:
    // return <IDKitWidget {...config} />
    console.log('IDKit config:', config);
    alert('World ID verification would appear here. Install @worldcoin/idkit for full integration.');
    
    // Simulate verification for development
    if (window.location.hostname === 'localhost') {
      setTimeout(() => {
        this.saveVerification({
          isVerified: true,
          nullifierHash: '0x' + '1234'.repeat(16),
          proof: '0x' + 'abcd'.repeat(16),
          merkleRoot: '0x' + 'ef01'.repeat(16),
          verificationLevel: 'orb'
        });
        resolve(this.verificationStatus);
      }, 1000);
    }
  }

  async verifyInWorldApp(resolve, reject) {
    try {
      // World App native verification
      const verificationRequest = {
        action_id: this.ACTION_ID,
        signal: 'wetcat_game_session',
        verification_level: 'orb'
      };

      // Call World App native bridge
      const response = await window.WorldApp.verify(verificationRequest);
      
      if (response.success) {
        this.saveVerification({
          isVerified: true,
          nullifierHash: response.nullifier_hash,
          proof: response.proof,
          merkleRoot: response.merkle_root,
          verificationLevel: 'orb'
        });
        
        resolve(this.verificationStatus);
      } else {
        reject(new Error('World App verification failed'));
      }
    } catch (error) {
      console.error('World App verification error:', error);
      reject(error);
    }
  }

  async verifyOnBackend(verificationResponse) {
    // IMPORTANT: You must implement this endpoint on your backend
    // See WORLD_ID_SETUP.md for example implementation
    // The backend should verify the proof with World ID's API
    try {
      const response = await fetch('/api/verify-worldid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proof: verificationResponse.proof,
          merkle_root: verificationResponse.merkle_root,
          nullifier_hash: verificationResponse.nullifier_hash,
          verification_level: 'orb',
          action: this.ACTION_ID,
          signal: 'wetcat_game_session'
        })
      });

      const data = await response.json();
      return data.verified;
    } catch (error) {
      console.error('Backend verification error:', error);
      // In development, you might want to return true for testing
      // return window.location.hostname === 'localhost';
      return false;
    }
  }

  isVerified() {
    return this.verificationStatus.isVerified;
  }

  getVerificationLevel() {
    return this.verificationStatus.verificationLevel;
  }

  getNullifierHash() {
    return this.verificationStatus.nullifierHash;
  }

  // Get bonus multiplier for verified users
  getRewardMultiplier() {
    if (!this.isVerified()) return 1.0;
    
    switch (this.verificationStatus.verificationLevel) {
      case 'orb':
        return 2.0; // 2x rewards for orb-verified users
      case 'device':
        return 1.5; // 1.5x rewards for device-verified users
      default:
        return 1.0;
    }
  }

  // Check if user can claim daily reward (unique human)
  canClaimDailyReward() {
    return this.isVerified() && this.verificationStatus.verificationLevel === 'orb';
  }
}

export const worldID = new WorldIDIntegration();