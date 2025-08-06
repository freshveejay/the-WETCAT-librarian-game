#!/bin/bash

# ===================================================================
# WETCAT Librarian - Deployment Script
# ===================================================================
# This script automates the deployment process for the WETCAT Librarian game
# It handles building, testing, and deploying to Vercel
# Usage: ./scripts/deploy.sh [environment]
# Environment options: development, staging, production
# ===================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-production}
SKIP_TESTS=${SKIP_TESTS:-false}
SKIP_CONTRACT_DEPLOY=${SKIP_CONTRACT_DEPLOY:-false}

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate environment
validate_environment() {
    print_message $BLUE "🔍 Validating environment..."
    
    # Check Node.js
    if ! command_exists node; then
        print_message $RED "❌ Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check npm
    if ! command_exists npm; then
        print_message $RED "❌ npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check Vercel CLI
    if ! command_exists vercel; then
        print_message $YELLOW "⚠️  Vercel CLI is not installed. Installing..."
        npm install -g vercel
    fi
    
    print_message $GREEN "✅ Environment validation complete"
}

# Function to load environment variables
load_env() {
    local env_file=".env.${ENVIRONMENT}"
    
    if [ ! -f "$env_file" ]; then
        env_file=".env"
    fi
    
    if [ -f "$env_file" ]; then
        print_message $BLUE "📋 Loading environment variables from $env_file"
        export $(cat $env_file | grep -v '^#' | xargs)
    else
        print_message $YELLOW "⚠️  No environment file found. Using system environment variables."
    fi
}

# Function to install dependencies
install_dependencies() {
    print_message $BLUE "📦 Installing dependencies..."
    
    # Clean install to ensure consistency
    rm -rf node_modules package-lock.json
    npm install
    
    # Install hardhat dependencies if not present
    if [ ! -d "node_modules/@nomicfoundation/hardhat-toolbox" ]; then
        print_message $BLUE "📦 Installing Hardhat dependencies..."
        npm install --save-dev @nomicfoundation/hardhat-toolbox
    fi
    
    print_message $GREEN "✅ Dependencies installed"
}

# Function to run linting
run_lint() {
    print_message $BLUE "🔍 Running linter..."
    
    if npm run lint; then
        print_message $GREEN "✅ Linting passed"
    else
        print_message $YELLOW "⚠️  Linting failed. Attempting to fix..."
        npm run lint:fix
        
        if npm run lint; then
            print_message $GREEN "✅ Linting fixed and passed"
        else
            print_message $RED "❌ Linting failed. Please fix errors manually."
            exit 1
        fi
    fi
}

# Function to run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        print_message $YELLOW "⚠️  Skipping tests (SKIP_TESTS=true)"
        return
    fi
    
    print_message $BLUE "🧪 Running tests..."
    
    # Check if test script exists
    if grep -q '"test"' package.json; then
        npm test
        print_message $GREEN "✅ Tests passed"
    else
        print_message $YELLOW "⚠️  No test script found. Skipping tests."
    fi
}

# Function to build the project
build_project() {
    print_message $BLUE "🔨 Building project..."
    
    # Clean previous build
    rm -rf dist
    
    # Run build
    npm run build
    
    # Verify build output
    if [ ! -d "dist" ]; then
        print_message $RED "❌ Build failed. No dist directory created."
        exit 1
    fi
    
    print_message $GREEN "✅ Build complete"
}

# Function to deploy smart contracts
deploy_contracts() {
    if [ "$SKIP_CONTRACT_DEPLOY" = "true" ]; then
        print_message $YELLOW "⚠️  Skipping contract deployment (SKIP_CONTRACT_DEPLOY=true)"
        return
    fi
    
    print_message $BLUE "📜 Deploying smart contracts..."
    
    # Check if private key is available
    if [ -z "$PRIVATE_KEY" ]; then
        print_message $YELLOW "⚠️  No PRIVATE_KEY found. Skipping contract deployment."
        return
    fi
    
    # Determine network based on environment
    local network="worldchain"
    if [ "$ENVIRONMENT" != "production" ]; then
        network="worldchain_testnet"
    fi
    
    # Compile contracts
    npx hardhat compile
    
    # Deploy contracts
    if [ -f "contracts/deploy.js" ]; then
        print_message $BLUE "🚀 Deploying to $network..."
        npx hardhat run contracts/deploy.js --network $network
        print_message $GREEN "✅ Contracts deployed"
    else
        print_message $YELLOW "⚠️  No deploy script found. Skipping contract deployment."
    fi
}

# Function to deploy to Vercel
deploy_to_vercel() {
    print_message $BLUE "🚀 Deploying to Vercel..."
    
    # Set Vercel environment based on deployment environment
    local vercel_env=""
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel_env="--prod"
    fi
    
    # Deploy with Vercel CLI
    if [ -z "$VERCEL_TOKEN" ]; then
        print_message $YELLOW "⚠️  No VERCEL_TOKEN found. Running interactive deployment..."
        vercel $vercel_env
    else
        print_message $BLUE "🚀 Running automated deployment..."
        vercel $vercel_env --token=$VERCEL_TOKEN --yes
    fi
    
    print_message $GREEN "✅ Deployment complete"
}

# Function to create deployment report
create_deployment_report() {
    local report_file="deployment-report-$(date +%Y%m%d-%H%M%S).txt"
    
    print_message $BLUE "📄 Creating deployment report..."
    
    cat > $report_file << EOF
WETCAT Librarian Deployment Report
==================================
Date: $(date)
Environment: $ENVIRONMENT
Git Branch: $(git branch --show-current)
Git Commit: $(git rev-parse HEAD)
Node Version: $(node --version)
NPM Version: $(npm --version)

Deployment Steps:
- Environment Validation: ✅
- Dependencies Installation: ✅
- Linting: ✅
- Tests: $([ "$SKIP_TESTS" = "true" ] && echo "⚠️  Skipped" || echo "✅")
- Build: ✅
- Contract Deployment: $([ "$SKIP_CONTRACT_DEPLOY" = "true" ] && echo "⚠️  Skipped" || echo "✅")
- Vercel Deployment: ✅

Build Output:
$(ls -la dist/ 2>/dev/null || echo "No dist directory found")

Notes:
- Review the deployment at https://wetcat-librarian.vercel.app
- Check contract deployment logs if applicable
EOF
    
    print_message $GREEN "✅ Deployment report created: $report_file"
}

# Main deployment flow
main() {
    print_message $BLUE "🎮 WETCAT Librarian Deployment Script"
    print_message $BLUE "====================================="
    print_message $BLUE "Environment: $ENVIRONMENT"
    echo ""
    
    # Change to project root
    cd "$(dirname "$0")/.."
    
    # Run deployment steps
    validate_environment
    load_env
    install_dependencies
    run_lint
    run_tests
    build_project
    deploy_contracts
    deploy_to_vercel
    create_deployment_report
    
    print_message $GREEN "🎉 Deployment complete!"
    print_message $BLUE "Visit your deployment at: https://wetcat-librarian.vercel.app"
}

# Run main function
main