# WETCAT Game Rewards Smart Contract

## Overview
The WETCATGameRewards contract manages on-chain rewards for the WETCAT Librarian game. It distributes $WETCAT tokens to players based on their performance and achievements.

**Network**: World Chain (Chain ID: 480)  
**$WETCAT Token**: `0x9e0ddff1a66efcbb697c7a3c513b3c83ace239aa`

## Features
- Daily reward claims with 24-hour cooldown
- Score-based reward calculation (10-100 $WETCAT per day)
- Achievement rewards for special milestones
- Anti-cheat through server-side verification
- Owner controls for contract management

## Deployment Steps

1. **Install Hardhat**:
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   npx hardhat init
   ```

2. **Configure Hardhat**:
   - Add network configuration for your target chain
   - Set up deployment account private key

3. **Set Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your private key
   ```

4. **Deploy to World Chain**:
   ```bash
   # For testnet deployment
   npx hardhat run contracts/deploy.js --network worldchain_testnet
   
   # For mainnet deployment
   npx hardhat run contracts/deploy.js --network worldchain
   ```

5. **Post-Deployment**:
   - Set the game server address using `setGameServer()`
   - Transfer WETCAT tokens to the contract for rewards
   - Update `WETCATWeb3.js` with the deployed contract address

## Security Considerations
- Only the designated game server can trigger rewards
- Server validates game sessions before claiming
- Daily cooldown prevents reward farming
- Contract owner can withdraw excess tokens

## Testing
```bash
npx hardhat test
```

## Gas Costs
- Deployment: ~0.02 ETH
- Daily claim: ~0.003 ETH
- Achievement claim: ~0.002 ETH