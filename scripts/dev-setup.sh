#!/bin/bash

# ===================================================================
# WETCAT Librarian - Local Development Setup
# ===================================================================
# Quick setup for local development environment
# Usage: ./scripts/dev-setup.sh
# ===================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_message $BLUE "🎮 WETCAT Librarian - Local Dev Setup"
print_message $BLUE "====================================="
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_message $YELLOW "Installing dependencies..."
    npm install
fi

# Create local env file if it doesn't exist
if [ ! -f ".env.local" ]; then
    print_message $YELLOW "Creating .env.local..."
    cat > .env.local << 'EOF'
# Local Development Environment
NODE_ENV=development
ENABLE_DEBUG_MODE=true
USE_LOCAL_BLOCKCHAIN=true

# Local test wallet (DO NOT USE IN PRODUCTION)
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Local RPC
LOCAL_RPC_URL=http://127.0.0.1:8545
EOF
    print_message $GREEN "✅ Created .env.local"
fi

# Start local blockchain in background
print_message $BLUE "🔗 Starting local blockchain..."
if ! pgrep -f "hardhat node" > /dev/null; then
    npx hardhat node > hardhat.log 2>&1 &
    print_message $GREEN "✅ Local blockchain started (check hardhat.log for details)"
    sleep 3
else
    print_message $YELLOW "ℹ️  Local blockchain already running"
fi

# Deploy contracts to local blockchain
print_message $BLUE "📜 Deploying contracts locally..."
npx hardhat run scripts/deploy-contracts.js --network localhost || true

# Start development server
print_message $BLUE "🚀 Starting development server..."
print_message $GREEN "✅ Setup complete! Access the game at: http://localhost:5173"
echo ""
print_message $YELLOW "Commands:"
print_message $YELLOW "- Stop local blockchain: pkill -f 'hardhat node'"
print_message $YELLOW "- View blockchain logs: tail -f hardhat.log"
print_message $YELLOW "- Deploy contracts: npm run deploy:local"
echo ""

# Start dev server
npm run dev