#!/bin/bash

# ===================================================================
# WETCAT Librarian - Setup Script
# ===================================================================
# This script sets up the WETCAT Librarian game on a new machine
# It installs dependencies, configures environment, and prepares for development
# Usage: ./scripts/setup.sh
# ===================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

# Function to print ASCII art
print_welcome() {
    echo -e "${CYAN}"
    cat << 'EOF'
 __      __ _____ _____ ___    _   _____   _     _ _                    _           
 \ \    / /| ____|_   _/ __|  / \ |_   _| | |   (_) |__  _ __ __ _ _ _(_) __ _ _ __
  \ \/\/ / | _|    | || (__  / _ \  | |   | |   | | '_ \| '__/ _` | '_| |/ _` | '_ \
   \_/\_/  |_____| |_| \___|/_/ \_\ |_|   |___| |_|_.__/|_| \__,_|_| |_|\__,_|_| |_|
                                                                                     
EOF
    echo -e "${NC}"
    print_message $BLUE "Welcome to WETCAT Librarian Setup!"
    print_message $BLUE "=================================="
    echo ""
}

# Function to check system requirements
check_requirements() {
    print_message $BLUE "🔍 Checking system requirements..."
    
    local missing_requirements=()
    
    # Check Git
    if ! command_exists git; then
        missing_requirements+=("Git")
    fi
    
    # Check Node.js
    if ! command_exists node; then
        missing_requirements+=("Node.js (v18 or higher)")
    else
        # Check Node version
        local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -lt 18 ]; then
            missing_requirements+=("Node.js v18 or higher (current: $(node -v))")
        fi
    fi
    
    # Check npm
    if ! command_exists npm; then
        missing_requirements+=("npm")
    fi
    
    # Report missing requirements
    if [ ${#missing_requirements[@]} -gt 0 ]; then
        print_message $RED "❌ Missing requirements:"
        for req in "${missing_requirements[@]}"; do
            print_message $RED "   - $req"
        done
        echo ""
        print_message $YELLOW "Please install the missing requirements and run this script again."
        print_message $YELLOW "Visit: https://nodejs.org/ for Node.js installation"
        exit 1
    fi
    
    print_message $GREEN "✅ All system requirements met"
}

# Function to setup git hooks
setup_git_hooks() {
    print_message $BLUE "🪝 Setting up Git hooks..."
    
    # Create hooks directory if it doesn't exist
    mkdir -p .git/hooks
    
    # Pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook for WETCAT Librarian

# Run linter
echo "Running linter..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting failed. Please fix errors before committing."
    exit 1
fi

echo "✅ Pre-commit checks passed"
EOF
    
    chmod +x .git/hooks/pre-commit
    
    print_message $GREEN "✅ Git hooks configured"
}

# Function to install global dependencies
install_global_deps() {
    print_message $BLUE "🌍 Installing global dependencies..."
    
    # Check and install Vercel CLI
    if ! command_exists vercel; then
        print_message $YELLOW "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Check and install Hardhat
    if ! command_exists hardhat; then
        print_message $YELLOW "Installing Hardhat..."
        npm install -g hardhat
    fi
    
    print_message $GREEN "✅ Global dependencies installed"
}

# Function to install project dependencies
install_project_deps() {
    print_message $BLUE "📦 Installing project dependencies..."
    
    # Clean install
    rm -rf node_modules package-lock.json
    npm install
    
    # Install additional dev dependencies if needed
    print_message $BLUE "📦 Installing additional dev dependencies..."
    npm install --save-dev eslint @nomicfoundation/hardhat-toolbox
    
    print_message $GREEN "✅ Project dependencies installed"
}

# Function to setup environment files
setup_environment() {
    print_message $BLUE "🔧 Setting up environment files..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        print_message $YELLOW "Creating .env file from template..."
        cp .env.example .env
        print_message $YELLOW "⚠️  Please edit .env file with your actual values"
    else
        print_message $GREEN "✅ .env file already exists"
    fi
    
    # Create other environment files
    for env in development staging production; do
        if [ ! -f ".env.$env" ]; then
            print_message $YELLOW "Creating .env.$env file..."
            cp .env.example ".env.$env"
        fi
    done
    
    print_message $GREEN "✅ Environment files created"
}

# Function to setup IDE configuration
setup_ide_config() {
    print_message $BLUE "💻 Setting up IDE configuration..."
    
    # Create .vscode directory
    mkdir -p .vscode
    
    # VS Code settings
    cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact"
  ],
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/package-lock.json": true
  }
}
EOF
    
    # VS Code launch configuration
    cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome against localhost",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}",
      "runtimeExecutable": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    }
  ]
}
EOF
    
    # VS Code recommended extensions
    cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "JuanBlanco.solidity",
    "NomicFoundation.hardhat-solidity"
  ]
}
EOF
    
    print_message $GREEN "✅ IDE configuration created"
}

# Function to initialize database/storage
setup_storage() {
    print_message $BLUE "💾 Setting up local storage..."
    
    # Create necessary directories
    mkdir -p data
    mkdir -p logs
    mkdir -p temp
    
    # Create .gitignore entries
    if ! grep -q "data/" .gitignore 2>/dev/null; then
        echo -e "\n# Local storage\ndata/\nlogs/\ntemp/" >> .gitignore
    fi
    
    print_message $GREEN "✅ Storage directories created"
}

# Function to run initial build
run_initial_build() {
    print_message $BLUE "🔨 Running initial build..."
    
    npm run build
    
    if [ -d "dist" ]; then
        print_message $GREEN "✅ Initial build successful"
    else
        print_message $RED "❌ Initial build failed"
        exit 1
    fi
}

# Function to setup test environment
setup_test_environment() {
    print_message $BLUE "🧪 Setting up test environment..."
    
    # Create test directory
    mkdir -p test
    
    # Create basic test setup if not exists
    if [ ! -f "test/setup.js" ]; then
        cat > test/setup.js << 'EOF'
// Test setup for WETCAT Librarian
console.log("Test environment initialized");
EOF
    fi
    
    # Update package.json with test script if not present
    if ! grep -q '"test"' package.json; then
        print_message $YELLOW "Adding test script to package.json..."
        # This would require a more complex JSON manipulation
        print_message $YELLOW "⚠️  Please add test script manually to package.json"
    fi
    
    print_message $GREEN "✅ Test environment ready"
}

# Function to display next steps
display_next_steps() {
    echo ""
    print_message $GREEN "🎉 Setup Complete!"
    print_message $GREEN "=================="
    echo ""
    print_message $CYAN "Next steps:"
    print_message $CYAN "1. Update environment variables:"
    print_message $YELLOW "   - Edit .env file with your configuration"
    print_message $YELLOW "   - Add your PRIVATE_KEY for contract deployment"
    print_message $YELLOW "   - Add your VERCEL_TOKEN for automated deployments"
    echo ""
    print_message $CYAN "2. Start development server:"
    print_message $YELLOW "   npm run dev"
    echo ""
    print_message $CYAN "3. Deploy to Vercel:"
    print_message $YELLOW "   ./scripts/deploy.sh [environment]"
    echo ""
    print_message $CYAN "4. View documentation:"
    print_message $YELLOW "   - PROJECT_SUMMARY.md - Project overview"
    print_message $YELLOW "   - DEPLOYMENT.md - Deployment guide"
    print_message $YELLOW "   - WETCAT_ROADMAP.md - Development roadmap"
    echo ""
    print_message $BLUE "Happy coding! 🎮"
}

# Main setup flow
main() {
    print_welcome
    
    # Change to project root
    cd "$(dirname "$0")/.."
    
    # Run setup steps
    check_requirements
    setup_git_hooks
    install_global_deps
    install_project_deps
    setup_environment
    setup_ide_config
    setup_storage
    setup_test_environment
    run_initial_build
    
    display_next_steps
}

# Check if script is run with sudo (not recommended)
if [ "$EUID" -eq 0 ]; then 
   print_message $RED "Please do not run this script as root/sudo"
   exit 1
fi

# Run main function
main