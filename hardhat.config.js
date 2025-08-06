require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    worldchain: {
      url: "https://worldchain-mainnet.g.alchemy.com/public",
      chainId: 480,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto"
    },
    worldchain_testnet: {
      url: "https://worldchain-sepolia.g.alchemy.com/public", 
      chainId: 4801,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto"
    },
    hardhat: {
      forking: {
        url: "https://worldchain-mainnet.g.alchemy.com/public"
      }
    }
  },
  etherscan: {
    apiKey: {
      worldchain: "YOUR_WORLDSCAN_API_KEY" // Get from worldscan.org
    },
    customChains: [
      {
        network: "worldchain",
        chainId: 480,
        urls: {
          apiURL: "https://worldscan.org/api",
          browserURL: "https://worldscan.org"
        }
      }
    ]
  }
};