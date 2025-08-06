import { worldID } from './WorldIDIntegration.js';
import { Permit2Integration } from './Permit2Integration.js';
import { wetcatWeb3 } from './WETCATWeb3.js';

export class WorldAppIntegration {
  constructor() {
    this.isWorldApp = this.detectWorldApp();
    this.permit2 = null;
    this.isInitialized = false;
  }

  detectWorldApp() {
    // Multiple ways to detect World App
    return !!(
      window.WorldApp ||
      window.navigator.userAgent.includes('WorldApp') ||
      window.location.search.includes('world-app=true') ||
      window.ethereum?.isWorldApp
    );
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize Web3 connection
      await wetcatWeb3.connect();
      
      // Initialize Permit2
      this.permit2 = new Permit2Integration(wetcatWeb3.provider, wetcatWeb3.signer);
      
      // Check and setup Permit2 approval
      await this.ensurePermit2Approval();
      
      this.isInitialized = true;
      console.log('World App integration initialized');
    } catch (error) {
      console.error('Failed to initialize World App integration:', error);
      throw error;
    }
  }

  async ensurePermit2Approval() {
    const hasApproval = await this.permit2.hasApprovedPermit2(wetcatWeb3.WETCAT_TOKEN_ADDRESS);
    
    if (!hasApproval) {
      console.log('Requesting Permit2 approval...');
      
      // In World App, show a nice UI for this one-time approval
      if (this.isWorldApp) {
        const confirmed = await this.showWorldAppConfirmation(
          'One-time Setup Required',
          'Approve WETCAT for gasless transactions? This only needs to be done once.',
          'Approve'
        );
        
        if (confirmed) {
          await this.permit2.approvePermit2(wetcatWeb3.WETCAT_TOKEN_ADDRESS);
        } else {
          throw new Error('Permit2 approval required for gasless transactions');
        }
      } else {
        // Web version - just approve
        await this.permit2.approvePermit2(wetcatWeb3.WETCAT_TOKEN_ADDRESS);
      }
    }
  }

  async showWorldAppConfirmation(title, message, buttonText) {
    if (window.WorldApp?.showConfirmation) {
      return window.WorldApp.showConfirmation({
        title,
        message,
        confirmText: buttonText,
        cancelText: 'Cancel'
      });
    }
    
    // Fallback for web
    return confirm(`${title}\n\n${message}`);
  }

  async verifyWithOrb() {
    return worldID.verifyWithOrb();
  }

  async claimDailyRewardGasless(score) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Calculate expected reward
      const stats = await wetcatWeb3.getPlayerStats(wetcatWeb3.account);
      const baseReward = Math.min(10 + Math.floor(score / 1000) * 5, 100);
      const multiplier = worldID.getRewardMultiplier();
      const totalReward = baseReward * multiplier;

      // Create gasless claim data
      const claimData = await this.permit2.createGaslessRewardClaim(
        wetcatWeb3.WETCAT_TOKEN_ADDRESS,
        wetcatWeb3.GAME_REWARDS_ADDRESS,
        ethers.parseEther(totalReward.toString())
      );

      // Add World ID verification if available
      if (worldID.isVerified()) {
        claimData.worldIdProof = {
          nullifierHash: worldID.getNullifierHash(),
          proof: worldID.verificationStatus.proof,
          merkleRoot: worldID.verificationStatus.merkleRoot,
          verificationLevel: worldID.getVerificationLevel() === 'orb' ? 2 : 1
        };
      }

      // Send to backend for gasless execution
      const response = await fetch('/api/game/claim-gasless', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score,
          claimData,
          playerAddress: wetcatWeb3.account
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Show success in World App native UI
        if (this.isWorldApp && window.WorldApp?.showToast) {
          window.WorldApp.showToast({
            type: 'success',
            message: `Claimed ${totalReward} $WETCAT! 🎉`,
            duration: 3000
          });
        }
        
        return result;
      } else {
        throw new Error(result.error || 'Claim failed');
      }
    } catch (error) {
      console.error('Gasless claim error:', error);
      
      // Show error in World App
      if (this.isWorldApp && window.WorldApp?.showToast) {
        window.WorldApp.showToast({
          type: 'error',
          message: error.message,
          duration: 5000
        });
      }
      
      throw error;
    }
  }

  // World App specific features
  async shareScore(score) {
    if (!this.isWorldApp || !window.WorldApp?.share) {
      // Fallback to web share API
      if (navigator.share) {
        await navigator.share({
          title: 'WETCAT Librarian',
          text: `I just scored ${score} points in WETCAT Librarian! Can you beat my score?`,
          url: window.location.href
        });
      }
      return;
    }

    // Use World App native share
    await window.WorldApp.share({
      title: 'WETCAT Librarian High Score!',
      text: `I just scored ${score} points and earned $WETCAT tokens! 🌊🐱`,
      url: 'https://worldapp.link/wetcat-game',
      image: '/assets/share-image.png'
    });
  }

  async showLeaderboard() {
    if (this.isWorldApp && window.WorldApp?.openMiniApp) {
      // Open leaderboard mini app
      await window.WorldApp.openMiniApp({
        appId: 'wetcat-leaderboard',
        params: {
          playerAddress: wetcatWeb3.account
        }
      });
    } else {
      // Web fallback
      window.open('/leaderboard', '_blank');
    }
  }

  // Get World App theme preferences
  getThemePreference() {
    if (this.isWorldApp && window.WorldApp?.getTheme) {
      return window.WorldApp.getTheme(); // 'light' or 'dark'
    }
    
    // Web fallback
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Haptic feedback for World App
  triggerHaptic(type = 'light') {
    if (this.isWorldApp && window.WorldApp?.haptic) {
      window.WorldApp.haptic(type); // 'light', 'medium', 'heavy'
    }
  }

  // Save game progress to World App storage
  async saveProgress(gameData) {
    if (this.isWorldApp && window.WorldApp?.storage) {
      await window.WorldApp.storage.set('wetcat_game_progress', JSON.stringify(gameData));
    } else {
      // Web fallback
      localStorage.setItem('wetcat_game_progress', JSON.stringify(gameData));
    }
  }

  async loadProgress() {
    if (this.isWorldApp && window.WorldApp?.storage) {
      const data = await window.WorldApp.storage.get('wetcat_game_progress');
      return data ? JSON.parse(data) : null;
    } else {
      // Web fallback
      const data = localStorage.getItem('wetcat_game_progress');
      return data ? JSON.parse(data) : null;
    }
  }
}

export const worldApp = new WorldAppIntegration();