#!/bin/bash

# ===================================================================
# WETCAT Librarian - Deployment Checklist
# ===================================================================
# This script runs through a pre-deployment checklist to ensure
# everything is ready for deployment
# Usage: ./scripts/deployment-checklist.sh
# ===================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check with user
confirm() {
    local prompt=$1
    read -p "$prompt (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Checklist items tracking
CHECKLIST_PASSED=true

# Function to check item
check_item() {
    local description=$1
    local command=$2
    local required=${3:-true}
    
    echo -n "Checking: $description... "
    
    if eval $command 2>/dev/null; then
        print_message $GREEN "✅"
    else
        if [ "$required" = true ]; then
            print_message $RED "❌"
            CHECKLIST_PASSED=false
        else
            print_message $YELLOW "⚠️  (optional)"
        fi
    fi
}

# Main checklist
print_message $BLUE "🚀 WETCAT Librarian Deployment Checklist"
print_message $BLUE "========================================"
echo ""

# Git checks
print_message $BLUE "📝 Git Status:"
check_item "Git repository clean" "[ -z \"\$(git status --porcelain)\" ]"
check_item "On main branch" "[ \"\$(git branch --show-current)\" = \"main\" ]" false
check_item "Up to date with remote" "git fetch && [ \"\$(git rev-parse HEAD)\" = \"\$(git rev-parse @{u})\" ]"

echo ""

# Environment checks
print_message $BLUE "🔧 Environment:"
check_item ".env file exists" "[ -f .env ]"
check_item "VERCEL_TOKEN set" "[ ! -z \"\$VERCEL_TOKEN\" ]" false
check_item "PRIVATE_KEY set" "[ ! -z \"\$PRIVATE_KEY\" ]" false

echo ""

# Dependencies checks
print_message $BLUE "📦 Dependencies:"
check_item "node_modules exists" "[ -d node_modules ]"
check_item "No vulnerabilities" "npm audit --production --audit-level=high" false

echo ""

# Build checks
print_message $BLUE "🔨 Build:"
check_item "Build succeeds" "npm run build"
check_item "Dist folder created" "[ -d dist ]"
check_item "Index.html in dist" "[ -f dist/index.html ]"

echo ""

# Code quality checks
print_message $BLUE "✨ Code Quality:"
check_item "Linting passes" "npm run lint"
check_item "No console.log in production code" "! grep -r 'console\\.log' src/ --include='*.js' | grep -v '// eslint-disable-line'" false

echo ""

# Contract checks (if applicable)
if [ -f "hardhat.config.js" ]; then
    print_message $BLUE "📜 Smart Contracts:"
    check_item "Contracts compile" "npx hardhat compile"
    check_item "Contract tests pass" "npx hardhat test" false
    echo ""
fi

# Manual confirmations
print_message $BLUE "👤 Manual Checks:"
confirm "Have you tested the game locally?" || CHECKLIST_PASSED=false
confirm "Have you reviewed the deployment configuration?" || CHECKLIST_PASSED=false
confirm "Have you backed up important data?" || CHECKLIST_PASSED=false
confirm "Are all API endpoints configured correctly?" || CHECKLIST_PASSED=false

echo ""

# Summary
if [ "$CHECKLIST_PASSED" = true ]; then
    print_message $GREEN "✅ All checks passed! Ready for deployment."
    echo ""
    print_message $BLUE "To deploy, run:"
    print_message $YELLOW "./scripts/deploy.sh [environment]"
else
    print_message $RED "❌ Some checks failed. Please fix issues before deploying."
    exit 1
fi