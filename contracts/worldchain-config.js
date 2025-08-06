// World Chain Configuration for WETCAT Game

module.exports = {
  // World Chain Network Details
  WORLD_CHAIN: {
    chainId: 480, // World Chain ID
    rpcUrl: "https://worldchain-mainnet.g.alchemy.com/public",
    explorerUrl: "https://worldscan.org",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18
    }
  },

  // Contract Addresses
  CONTRACTS: {
    WETCAT_TOKEN: "0x9e0ddff1a66efcbb697c7a3c513b3c83ace239aa",
    GAME_REWARDS: null // To be deployed
  },

  // Deployment Configuration
  DEPLOYMENT: {
    gasPrice: "auto", // Let provider determine
    gasLimit: 3000000,
    confirmations: 2
  },

  // Reward Configuration (matching smart contract)
  REWARDS: {
    BASE_DAILY: 10, // 10 WETCAT
    SCORE_MULTIPLIER: 5, // 5 WETCAT per 1000 score
    MAX_DAILY: 100, // 100 WETCAT max
    COOLDOWN_HOURS: 24
  },

  // Achievement Rewards
  ACHIEVEMENTS: {
    "first_moon": 100,
    "diamond_hands": 200,
    "whale_alert": 300,
    "scammer_slayer": 150,
    "speed_demon": 100
  }
};