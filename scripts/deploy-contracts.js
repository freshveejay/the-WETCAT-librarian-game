#!/usr/bin/env node

/**
 * WETCAT Librarian - Smart Contract Deployment Script
 * ===================================================
 * This script handles the deployment of smart contracts
 * Usage: node scripts/deploy-contracts.js [network]
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

// Helper function to print colored messages
function print(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Function to save deployment info
async function saveDeploymentInfo(network, deployments) {
  const deploymentPath = path.join(__dirname, "..", "deployments");
  
  // Create deployments directory if it doesn't exist
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  const filename = path.join(deploymentPath, `${network}-${Date.now()}.json`);
  const latestFilename = path.join(deploymentPath, `${network}-latest.json`);
  
  const deploymentData = {
    network,
    timestamp: new Date().toISOString(),
    contracts: deployments,
    deployer: deployments.deployer,
    blockNumber: deployments.blockNumber
  };
  
  // Save timestamped version
  fs.writeFileSync(filename, JSON.stringify(deploymentData, null, 2));
  
  // Save latest version
  fs.writeFileSync(latestFilename, JSON.stringify(deploymentData, null, 2));
  
  print(`Deployment info saved to: ${filename}`, colors.green);
}

// Function to verify contract on explorer
async function verifyContract(address, constructorArgs, contractName) {
  print(`\nVerifying ${contractName} on explorer...`, colors.blue);
  
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: constructorArgs,
    });
    print(`✅ ${contractName} verified successfully`, colors.green);
  } catch (error) {
    if (error.message.includes("already verified")) {
      print(`ℹ️  ${contractName} is already verified`, colors.yellow);
    } else {
      print(`❌ Failed to verify ${contractName}: ${error.message}`, colors.red);
    }
  }
}

// Main deployment function
async function main() {
  // Get network
  const network = hre.network.name;
  print(`\n🚀 Deploying to ${network}...`, colors.cyan);
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  print(`Deployer: ${deployerAddress}`, colors.blue);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployerAddress);
  print(`Balance: ${ethers.formatEther(balance)} ETH`, colors.blue);
  
  if (balance === 0n) {
    print("❌ Deployer has no ETH balance", colors.red);
    process.exit(1);
  }
  
  // Get current block
  const blockNumber = await ethers.provider.getBlockNumber();
  
  // Deploy WETCATGameRewards contract
  print("\n📜 Deploying WETCATGameRewards...", colors.blue);
  
  const WETCATGameRewards = await ethers.getContractFactory("WETCATGameRewardsV2");
  
  // Constructor arguments
  const wetcatTokenAddress = process.env.WETCAT_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployerAddress;
  const worldIdAddress = process.env.WORLD_ID_ADDRESS || "0x0000000000000000000000000000000000000000";
  
  const constructorArgs = [
    wetcatTokenAddress,
    treasuryAddress,
    worldIdAddress
  ];
  
  // Deploy contract
  const gameRewards = await WETCATGameRewards.deploy(...constructorArgs);
  await gameRewards.waitForDeployment();
  
  const gameRewardsAddress = await gameRewards.getAddress();
  print(`✅ WETCATGameRewards deployed to: ${gameRewardsAddress}`, colors.green);
  
  // Wait for a few blocks before verification
  if (network !== "hardhat" && network !== "localhost") {
    print("\nWaiting for blocks before verification...", colors.yellow);
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
    
    // Verify contract
    await verifyContract(gameRewardsAddress, constructorArgs, "WETCATGameRewards");
  }
  
  // Save deployment info
  const deployments = {
    deployer: deployerAddress,
    blockNumber,
    contracts: {
      WETCATGameRewards: {
        address: gameRewardsAddress,
        constructorArgs,
        deploymentTx: gameRewards.deploymentTransaction().hash
      }
    }
  };
  
  await saveDeploymentInfo(network, deployments);
  
  // Print summary
  print("\n📊 Deployment Summary", colors.cyan);
  print("====================", colors.cyan);
  print(`Network: ${network}`, colors.blue);
  print(`Deployer: ${deployerAddress}`, colors.blue);
  print(`WETCATGameRewards: ${gameRewardsAddress}`, colors.blue);
  
  // Update .env file
  print("\n📝 Update your .env file with:", colors.yellow);
  print(`WETCAT_GAME_REWARDS_ADDRESS=${gameRewardsAddress}`, colors.yellow);
  
  print("\n✅ Deployment complete!", colors.green);
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });