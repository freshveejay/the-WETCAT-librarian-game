# World App Integration Guide

## Overview
WETCAT Librarian supports enhanced features when run inside World App, including:
- World ID (Orb) verification for 2x rewards
- Gasless transactions using Permit2
- Native World App UI components
- Haptic feedback and theme support

## Features

### 1. World ID Verification
Players can verify with World ID to unlock reward multipliers:
- **Orb Verification**: 2x reward multiplier
- **Device Verification**: 1.5x reward multiplier
- **Sybil-resistant**: One verification per unique human

### 2. Gasless Transactions (Permit2)
No gas fees required for claiming rewards:
- One-time approval of Permit2 contract
- All subsequent claims are gasless
- Backend relayer handles gas costs

### 3. World App Native Features
- **Haptic Feedback**: Touch responses for actions
- **Native Share**: Share scores with World App friends
- **Theme Support**: Automatic light/dark mode
- **Storage API**: Cloud save game progress

## Implementation Details

### Detecting World App
```javascript
const isWorldApp = !!(
  window.WorldApp ||
  window.navigator.userAgent.includes('WorldApp') ||
  window.location.search.includes('world-app=true')
);
```

### World ID Integration
```javascript
// Verify with orb
const verification = await worldID.verifyWithOrb();

// Check verification status
if (worldID.isVerified()) {
  const multiplier = worldID.getRewardMultiplier(); // 2.0 for orb
}
```

### Gasless Claims
```javascript
// Initialize once
await worldApp.initialize();

// Claim rewards without gas
const result = await worldApp.claimDailyRewardGasless(score);
```

## Deployment

### 1. Web Version
Deploy normally to: `https://wetcat.boomboxindustries.com/game`

### 2. World App Version
1. Register app at: https://developer.worldcoin.org
2. Get your APP_ID and update `WorldIDIntegration.js`
3. Submit app manifest:

```json
{
  "id": "wetcat-librarian",
  "name": "WETCAT Librarian",
  "description": "Collect $WETCAT tokens in this crypto-themed game",
  "icon": "https://wetcat.boomboxindustries.com/game/icon.png",
  "url": "https://wetcat.boomboxindustries.com/game?world-app=true",
  "category": "games",
  "permissions": ["storage", "share", "haptic"],
  "verification_level": "orb",
  "reward_multiplier": true
}
```

## Smart Contract Setup

### Deploy V2 Contract
The `WETCATGameRewardsV2.sol` includes:
- World ID verification support
- Permit2 gasless claims
- Multiplier rewards for verified humans

```bash
# Deploy to World Chain
npx hardhat run contracts/deploy-v2.js --network worldchain
```

### Configure World ID
```javascript
// Set World ID contract address (World Chain)
const WORLD_ID_ADDRESS = "0x..."; // Get from World ID docs
```

## Testing

### Local Testing
```bash
# Add ?world-app=true to simulate World App
http://localhost:3001?world-app=true
```

### Test Verification
- Use World ID Simulator for development
- Test both orb and device verification flows
- Verify multipliers apply correctly

## User Flow

1. **Connect Wallet**: Standard Web3 connection
2. **Verify Identity**: Optional World ID verification
3. **Play Game**: Normal gameplay
4. **Claim Rewards**: Gasless if verified, standard if not

## Benefits for Players

- **2x Rewards**: Orb-verified users earn double
- **No Gas Fees**: All transactions are gasless
- **Sybil Protection**: Fair rewards, no bots
- **Native Experience**: Seamless World App integration

## Security Considerations

- Nullifier hashes prevent double claims
- Server validation prevents cheating
- Permit2 signatures expire after 1 hour
- World ID proofs are verified on-chain

## Support

For World App specific issues:
- World ID Docs: https://docs.worldcoin.org
- Permit2 Docs: https://docs.uniswap.org/contracts/permit2
- Discord: Join World Builders community