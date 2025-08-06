# WETCAT Librarian Deployment Guide

## Vercel Deployment

The game is configured to deploy to Vercel at the `/game` subpath of your main site.

### Prerequisites
1. Vercel CLI installed: `npm install -g vercel`
2. Logged into Vercel: `vercel login`
3. Access to wetcat.boomboxindustries.com project

### Deployment Steps

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```
   - Select the existing wetcat.boomboxindustries.com project
   - The game will be deployed to https://wetcat.boomboxindustries.com/game

### Configuration
The `vercel.json` file is already configured:
- Build command: `npm run build`
- Output directory: `dist`
- Base path: `/game`

### Important Notes
- The game is deployed as a subpage, not the main site
- All assets are served from the `/game` path
- The main site at wetcat.boomboxindustries.com remains unchanged

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start dev server**:
   ```bash
   npm run dev
   ```

3. **Run linting**:
   ```bash
   npm run lint
   ```

## Next Steps

After deployment:
1. Test the game at https://wetcat.boomboxindustries.com/game
2. Deploy the smart contract for $WETCAT rewards
3. Update the contract addresses in `/src/web3/WETCATWeb3.js`
4. Implement server-side verification for rewards