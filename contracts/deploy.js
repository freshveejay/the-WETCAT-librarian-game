// Deployment script for WETCATGameRewards contract
// This uses Hardhat - install with: npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // WETCAT token address on World Chain
  const WETCAT_TOKEN_ADDRESS = "0x9e0ddff1a66efcbb697c7a3c513b3c83ace239aa";
  
  // Deploy the game rewards contract
  const WETCATGameRewards = await ethers.getContractFactory("WETCATGameRewards");
  const gameRewards = await WETCATGameRewards.deploy(WETCAT_TOKEN_ADDRESS);
  
  await gameRewards.deployed();

  console.log("WETCATGameRewards deployed to:", gameRewards.address);
  
  // TODO: Set the game server address after deployment
  // await gameRewards.setGameServer("YOUR_GAME_SERVER_ADDRESS");
  
  // TODO: Transfer WETCAT tokens to the contract for rewards
  // const wetcatToken = await ethers.getContractAt("IERC20", WETCAT_TOKEN_ADDRESS);
  // await wetcatToken.transfer(gameRewards.address, ethers.utils.parseEther("10000"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });