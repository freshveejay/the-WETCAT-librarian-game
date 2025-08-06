# WETCAT Librarian - Deployment Guide

This guide provides comprehensive instructions for deploying the WETCAT Librarian game.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Environment Configuration](#environment-configuration)
- [Deployment Scripts](#deployment-scripts)
- [Deployment Workflows](#deployment-workflows)
- [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

1. **Node.js** (v18 or higher)
2. **Git** installed
3. **Vercel** account (for hosting)
4. **Alchemy** account (for blockchain RPC)
5. **Private key** for contract deployment
6. **World App** credentials (if using World ID)

## Initial Setup

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd wetcat-librarian

# Run the setup script
npm run setup
```

The setup script will:
- Install dependencies
- Create environment files
- Setup git hooks
- Configure IDE settings
- Build the project

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
# Edit .env with your actual values
```

Key environment variables:
- `VERCEL_TOKEN` - For automated deployments
- `PRIVATE_KEY` - For contract deployment
- `ALCHEMY_API_KEY` - For blockchain access
- `WORLD_APP_ID` - For World ID integration

## Deployment Scripts

### Main Scripts

1. **Setup Script** (`npm run setup`)
   - Initial project setup on new machine
   - Installs all dependencies
   - Creates necessary configuration files

2. **Deploy Script** (`npm run deploy [environment]`)
   - Full deployment pipeline
   - Runs tests, builds, and deploys
   - Environments: `development`, `staging`, `production`

3. **Quick Deploy** (`npm run deploy:quick`)
   - Fast deployment for development
   - Skips tests and checks
   - Use for rapid iteration

4. **Contract Deployment** (`npm run deploy:contracts`)
   - Deploys smart contracts
   - Saves deployment artifacts
   - Verifies on block explorer

### Utility Scripts

- `npm run checklist` - Pre-deployment checklist
- `npm run dev:setup` - Local development setup
- `npm run clean` - Clean all build artifacts
- `npm run lint:fix` - Fix linting issues

## Deployment Workflows

### Local Development

```bash
# Setup local environment
npm run dev:setup

# This will:
# 1. Start local blockchain
# 2. Deploy contracts locally
# 3. Start development server
```

### Staging Deployment

```bash
# Check deployment readiness
npm run checklist

# Deploy to staging
npm run deploy:staging
```

### Production Deployment

```bash
# Ensure on main branch
git checkout main
git pull origin main

# Run deployment checklist
npm run checklist

# Deploy to production
npm run deploy:production
```

### Contract Deployment

```bash
# Deploy to testnet
SKIP_CONTRACT_DEPLOY=false npm run deploy staging

# Deploy to mainnet
SKIP_CONTRACT_DEPLOY=false npm run deploy production
```

## CI/CD Pipeline

The GitHub Actions workflow automatically:

1. **On Pull Request**:
   - Runs linting
   - Builds project
   - Runs tests
   - Security audit

2. **On Push to `develop`**:
   - Deploys to staging environment
   - Runs full test suite

3. **On Push to `main`**:
   - Deploys to production
   - Creates deployment record

### Setting up GitHub Actions

1. Add secrets to GitHub repository:
   ```
   VERCEL_TOKEN
   VERCEL_ORG_ID
   VERCEL_PROJECT_ID
   PRIVATE_KEY
   ALCHEMY_API_KEY
   ```

2. Workflows will trigger automatically on push/PR

## Manual Deployment Steps

If you prefer manual deployment:

```bash
# 1. Install dependencies
npm install

# 2. Run tests
npm test

# 3. Build project
npm run build

# 4. Deploy contracts (if needed)
npx hardhat run scripts/deploy-contracts.js --network worldchain

# 5. Deploy to Vercel
vercel --prod
```

## Vercel Configuration

The project includes `vercel.json` for automatic configuration:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### First-time Vercel Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Deploy
vercel --prod
```

## Environment-Specific Configuration

### Development
- Uses local blockchain
- Debug mode enabled
- Test wallets configured

### Staging
- Testnet deployment
- Limited features
- Test tokens

### Production
- Mainnet deployment
- All features enabled
- Real tokens

## Troubleshooting

### Common Issues

1. **Build Fails**
   ```bash
   # Clean and rebuild
   npm run clean
   npm install
   npm run build
   ```

2. **Contract Deployment Fails**
   - Check wallet balance
   - Verify RPC endpoint
   - Ensure correct network

3. **Vercel Deployment Fails**
   - Check Vercel token
   - Verify build output
   - Check error logs

### Debug Commands

```bash
# Check environment
node -v
npm -v
vercel --version

# Test build locally
npm run build
npm run preview

# Check contract compilation
npx hardhat compile

# Test contract deployment locally
npm run hardhat:node  # In one terminal
npm run deploy:local  # In another terminal
```

## Best Practices

1. **Always run checklist before production deployment**
   ```bash
   npm run checklist
   ```

2. **Test on staging first**
   ```bash
   npm run deploy:staging
   # Test thoroughly
   npm run deploy:production
   ```

3. **Keep deployment logs**
   - Check `deployment-report-*.txt` files
   - Monitor GitHub Actions logs

4. **Version control**
   - Tag releases: `git tag v1.0.0`
   - Keep CHANGELOG.md updated

## Security Considerations

1. **Never commit sensitive data**
   - Private keys
   - API tokens
   - Passwords

2. **Use environment variables**
   - Different `.env` files per environment
   - Rotate keys regularly

3. **Contract security**
   - Audit before mainnet deployment
   - Test thoroughly on testnet

## Support

For deployment issues:
1. Check deployment logs
2. Review error messages
3. Consult documentation
4. Open GitHub issue

---

Remember: A successful deployment requires preparation. Use the provided scripts and checklists to ensure smooth deployments!