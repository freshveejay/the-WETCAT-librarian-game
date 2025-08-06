#!/bin/bash

# ===================================================================
# WETCAT Librarian - Quick Deploy Script
# ===================================================================
# Fast deployment script for development/staging environments
# Skips some checks for rapid iteration
# Usage: ./scripts/quick-deploy.sh
# ===================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}⚡ Quick Deploy - WETCAT Librarian${NC}"
echo "=================================="

# Build
echo -e "${BLUE}Building...${NC}"
npm run build

# Deploy to Vercel
echo -e "${BLUE}Deploying to Vercel...${NC}"
vercel --yes

echo -e "${GREEN}✅ Quick deploy complete!${NC}"