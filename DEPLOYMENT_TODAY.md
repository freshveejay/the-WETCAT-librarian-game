# WETCAT Librarian - Deployment Checklist (2025-08-07)

## Prerequisites Needed

### 1. World ID Registration ⏰ (15 minutes)
- [ ] Go to https://developer.worldcoin.org/
- [ ] Create a new app called "WETCAT Librarian"
- [ ] Get your APP_ID (looks like: app_staging_xxxxxxxxxxxxx)
- [ ] Save the APP_ID for later

### 2. Wallet Setup 💰 (5 minutes)
- [ ] Have a MetaMask wallet with some ETH on Worldchain
- [ ] Get your wallet's private key (for deployment)
- [ ] Make sure you have ~0.1 ETH for gas fees

### 3. Alchemy Account 🔧 (10 minutes)
- [ ] Sign up at https://www.alchemy.com/ (free)
- [ ] Create a new app for "Worldchain"
- [ ] Get your API key

### 4. Vercel Account 🚀 (5 minutes)
- [ ] Have a Vercel account ready
- [ ] Optional: Get Vercel CLI token for automated deployment

## Deployment Steps

### Step 1: Configure Environment
Update the `.env` file with:
- Your Alchemy API key
- Your wallet private key (without 0x)
- Your World ID APP_ID

### Step 2: Deploy Smart Contracts
```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to Worldchain testnet first
npm run deploy:contracts
```

### Step 3: Update Contract Addresses
After deployment, update in code:
- `src/web3/WETCATWeb3.js` - GAME_REWARDS_ADDRESS
- `src/game/ui/Web3UI.js` - Same address

### Step 4: Test Locally
```bash
# Start development server
npm run dev

# Test at http://localhost:3000/wetcat-librarian/
# - Connect wallet
# - Verify World ID
# - Play game and claim rewards
```

### Step 5: Deploy to Vercel
```bash
# Build project
npm run build

# Deploy
vercel --prod
```

### Step 6: Configure Domain
- Set up wetcat.boomboxindustries.com/game in Vercel
- Update CORS settings if needed

## Quick Start Commands

```bash
# If you have all prerequisites ready, run:
cd "/Users/baseshot/Library/Mobile Documents/com~apple~CloudDocs/SCRIPTING/WETCAT LIBRARIAN/wetcat-librarian"

# 1. Install dependencies
npm install

# 2. Deploy contracts (after updating .env)
npm run deploy:contracts

# 3. Test locally
npm run dev

# 4. Deploy to production
npm run deploy:production
```

## Need Help?

- Contract deployment issues? Check `hardhat.config.js`
- World ID not working? Verify APP_ID in `WorldIDIntegration.js`
- Web3 connection issues? Check network in MetaMask (Worldchain = Chain ID 480)

Ready to deploy? Let's go! 🚀