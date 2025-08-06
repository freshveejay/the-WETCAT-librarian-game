# WETCAT Librarian - A Chaotic Library Management Game

WETCAT Librarian is a fast-paced arcade game where you play as a dedicated librarian trying to maintain order in a library overrun by mischievous kids. Built with Web3 integration and World ID verification for unique rewards and fair play.

## Game Overview

In WETCAT Librarian, you must:
- Collect books (coins) scattered throughout the library
- Return them to their proper shelves
- Stop kids from stealing books and causing chaos
- Maintain order before the chaos level reaches critical mass
- Survive for 30 minutes to claim your daily rewards

## How to Play

### Controls
- **Arrow Keys/WASD**: Move your librarian character
- **Shift**: Sprint (consumes stamina)
- **Space**: Pick up books automatically when near them
- **P/Escape**: Pause the game

### Game Mechanics

#### Objective
Keep the library's chaos level below 100% by collecting and shelving books while preventing kids from stealing them.

#### Core Gameplay Loop
1. **Collect Books**: Walk over coins (books) to pick them up (max 5 at a time)
2. **Return to Shelves**: Bring books to bookshelves to reduce chaos
3. **Repel Kids**: Get close to kids to make them flee and drop stolen books
4. **Manage Stamina**: Sprint strategically - stamina depletes quickly!

#### Scoring System
- Collecting a book: 10 points
- Shelving a book: 20 points + chaos reduction
- Repelling a kid: 5 points
- Time bonus: 10 points per minute survived

#### Chaos System
- Chaos increases when kids hold books (3% per second per kid)
- Chaos decreases when you shelf books (5% per book)
- Game ends if chaos reaches 100%

#### Wave System
- New waves of kids spawn every 30 seconds
- Each wave increases in difficulty
- Later waves spawn more aggressive kids

## Web3 Features

### WETCAT Token Integration
- Connect your Web3 wallet to earn WETCAT tokens
- Daily rewards for completing 30-minute sessions
- Achievement-based bonus rewards
- Leaderboard rankings

### World ID Verification
- Verify your unique humanity with World ID
- 2x reward multiplier for orb-verified users
- 1.5x multiplier for device-verified users
- Sybil-resistant daily rewards

## Technical Setup

### Prerequisites
- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet
- World App (optional, for native World ID verification)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/wetcat-librarian.git
cd wetcat-librarian

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Web3 Configuration
VITE_WETCAT_TOKEN_ADDRESS=0x... # WETCAT token contract
VITE_GAME_REWARDS_ADDRESS=0x... # Game rewards contract
VITE_RPC_URL=https://...       # Your RPC endpoint

# World ID Configuration
VITE_WORLD_ID_APP_ID=app_staging_... # Your World ID app ID
VITE_WORLD_ID_ACTION_ID=play_wetcat_game

# Server Configuration (for backend)
JWT_SECRET=your-secret-key
GAME_SERVER_PRIVATE_KEY=0x...
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Architecture

### Frontend Structure
```
src/
├── game/
│   ├── entities/      # Game objects (Player, Kid, Coin, etc.)
│   ├── states/        # Game states (Menu, Playing, GameOver)
│   ├── systems/       # Core systems (Input, Rendering, Sound)
│   └── config/        # Game configuration
├── web3/
│   ├── WETCATWeb3.js  # Token and rewards integration
│   └── WorldIDIntegration.js # World ID verification
└── main.js            # Entry point
```

### Key Components

#### Game Engine
- Custom game loop with fixed timestep
- Entity-Component system for game objects
- State machine for game flow
- Collision detection system
- Particle effects and visual feedback

#### Web3 Integration
- MetaMask wallet connection
- WETCAT token balance tracking
- Smart contract interaction for rewards
- Permit2 integration for gas-efficient approvals

#### World ID Integration
- In-browser verification widget
- World App native verification
- Backend proof verification
- Cached verification (24-hour validity)

## Smart Contracts

### WETCATGameRewards Contract
Handles reward distribution and game statistics:
- `claimDailyReward(address player, uint256 score)`
- `claimAchievement(address player, string achievementId, uint256 reward)`
- `getPlayerStats(address player)`

See `contracts/WETCATGameRewards.sol` for implementation details.

## API Documentation

### Game Server Endpoints

#### POST /api/game/start
Start a new game session
```json
Request: { "playerAddress": "0x..." }
Response: { "sessionId": "...", "token": "jwt..." }
```

#### POST /api/game/update
Update game progress
```json
Request: {
  "token": "jwt...",
  "score": 1000,
  "coinsCollected": 50,
  "scammersRepelled": 20
}
Response: { "success": true }
```

#### POST /api/game/claim-daily
Claim daily rewards after 30-minute session
```json
Request: { "token": "jwt..." }
Response: {
  "success": true,
  "txHash": "0x...",
  "score": 1000
}
```

#### POST /api/verify-worldid
Verify World ID proof (backend implementation required)
```json
Request: {
  "proof": "0x...",
  "merkle_root": "0x...",
  "nullifier_hash": "0x...",
  "verification_level": "orb",
  "action": "play_wetcat_game"
}
Response: { "verified": true }
```

## Deployment

### Frontend Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to any static hosting
# Upload contents of dist/ folder
```

### Backend Deployment

The game server (`server/gameServer.js`) should be deployed to a Node.js hosting service:

```bash
# Install production dependencies
npm install --production

# Start server
node server/gameServer.js
```

### Smart Contract Deployment

```bash
# Deploy to testnet
npm run deploy:contracts

# Verify contracts
npm run verify:contract
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Write tests for your changes
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Security Considerations

- Never share your private keys or JWT secrets
- Always verify smart contract addresses
- Use environment variables for sensitive data
- Implement rate limiting on backend endpoints
- Validate all user inputs on both client and server
- Regular security audits for smart contracts

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- WETCAT community for inspiration
- World ID team for verification infrastructure
- All contributors and testers

## Support

- Discord: [Join our server](https://discord.gg/wetcat)
- Twitter: [@WETCATgame](https://twitter.com/wetcatgame)
- Email: support@wetcatgame.com

---

Built with love for the WETCAT community! Stay soaked! 💧🐱