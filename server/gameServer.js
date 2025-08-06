// Example game server for WETCAT rewards verification
// This prevents cheating by validating game sessions server-side

const express = require('express');
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GAME_REWARDS_ADDRESS = process.env.GAME_REWARDS_ADDRESS;
const PRIVATE_KEY = process.env.GAME_SERVER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || 'https://mainnet.infura.io/v3/YOUR_KEY';

// Contract ABI (minimal)
const REWARDS_ABI = [
  'function claimDailyReward(address player, uint256 score) external',
  'function claimAchievement(address player, string memory achievementId, uint256 rewardAmount) external',
  'function getPlayerStats(address player) external view returns (uint256, uint256, uint256, bool)'
];

// Initialize ethers
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const rewardsContract = new ethers.Contract(GAME_REWARDS_ADDRESS, REWARDS_ABI, signer);

// Game session storage (use Redis in production)
const gameSessions = new Map();

// Start game session
app.post('/api/game/start', async (req, res) => {
  const { playerAddress } = req.body;
  
  if (!ethers.isAddress(playerAddress)) {
    return res.status(400).json({ error: 'Invalid address' });
  }
  
  // Create session
  const sessionId = ethers.hexlify(ethers.randomBytes(32));
  const session = {
    playerAddress,
    startTime: Date.now(),
    score: 0,
    coinsCollected: 0,
    scammersRepelled: 0,
    achievements: []
  };
  
  gameSessions.set(sessionId, session);
  
  // Create JWT token
  const token = jwt.sign({ sessionId, playerAddress }, JWT_SECRET, { expiresIn: '2h' });
  
  res.json({ sessionId, token });
});

// Update game progress
app.post('/api/game/update', async (req, res) => {
  const { token, score, coinsCollected, scammersRepelled } = req.body;
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const session = gameSessions.get(decoded.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Validate reasonable progress (anti-cheat)
    const timePlayed = (Date.now() - session.startTime) / 1000; // seconds
    const maxReasonableScore = timePlayed * 100; // 100 points per second max
    
    if (score > maxReasonableScore) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    
    // Update session
    session.score = Math.max(session.score, score);
    session.coinsCollected = coinsCollected;
    session.scammersRepelled = scammersRepelled;
    
    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Claim daily reward
app.post('/api/game/claim-daily', async (req, res) => {
  const { token } = req.body;
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const session = gameSessions.get(decoded.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Verify minimum play time (30 minutes)
    const timePlayed = (Date.now() - session.startTime) / 1000;
    if (timePlayed < 1800) {
      return res.status(400).json({ error: 'Minimum play time not met' });
    }
    
    // Check if player can claim
    const stats = await rewardsContract.getPlayerStats(session.playerAddress);
    if (!stats[3]) { // canClaimDaily
      return res.status(400).json({ error: 'Daily reward on cooldown' });
    }
    
    // Claim reward on-chain
    const tx = await rewardsContract.claimDailyReward(session.playerAddress, session.score);
    await tx.wait();
    
    // Clean up session
    gameSessions.delete(decoded.sessionId);
    
    res.json({ 
      success: true, 
      txHash: tx.hash,
      score: session.score
    });
  } catch (error) {
    console.error('Claim error:', error);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

// Claim achievement
app.post('/api/game/claim-achievement', async (req, res) => {
  const { token, achievementId } = req.body;
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const session = gameSessions.get(decoded.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Define achievement requirements
    const achievements = {
      'first_moon': { requirement: (s) => s.timePlayed >= 1800, reward: 100 },
      'whale_alert': { requirement: (s) => s.coinsCollected >= 1000, reward: 300 },
      'scammer_slayer': { requirement: (s) => s.scammersRepelled >= 100, reward: 150 }
    };
    
    const achievement = achievements[achievementId];
    if (!achievement) {
      return res.status(400).json({ error: 'Invalid achievement' });
    }
    
    // Check if requirements met
    session.timePlayed = (Date.now() - session.startTime) / 1000;
    if (!achievement.requirement(session)) {
      return res.status(400).json({ error: 'Achievement requirements not met' });
    }
    
    // Claim on-chain
    const tx = await rewardsContract.claimAchievement(
      session.playerAddress, 
      achievementId, 
      achievement.reward
    );
    await tx.wait();
    
    res.json({ 
      success: true, 
      txHash: tx.hash,
      reward: achievement.reward
    });
  } catch (error) {
    console.error('Achievement claim error:', error);
    res.status(500).json({ error: 'Failed to claim achievement' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`WETCAT game server running on port ${PORT}`);
});