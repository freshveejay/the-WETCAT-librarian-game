// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IWorldID {
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view returns (bool);
}

// Minimal Permit2 interface for gasless approvals
interface IPermit2 {
    struct PermitTransferFrom {
        address from;
        address to;
        uint160 amount;
        address token;
    }
    
    struct PermitData {
        address token;
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
    }
    
    function permitTransferFrom(
        PermitTransferFrom calldata transfer,
        PermitData calldata permit,
        address owner,
        bytes calldata signature
    ) external;
}

contract WETCATGameRewardsV2 {
    address public owner;
    address public gameServer;
    IERC20 public wetcatToken;
    IWorldID public worldId;
    IPermit2 public constant permit2 = IPermit2(0x000000000022D473030F116dDEE9F6B43aC78BA3);
    
    // World ID configuration
    uint256 public immutable worldIdGroupId = 1; // Orb verification group
    string public worldIdActionId = "play_wetcat_game";
    
    mapping(address => uint256) public playerTotalEarned;
    mapping(address => uint256) public playerHighScore;
    mapping(address => uint256) public lastClaimTime;
    mapping(address => mapping(string => bool)) public achievementsClaimed;
    
    // World ID verification tracking
    mapping(uint256 => bool) public nullifierHashes; // Prevent double verification
    mapping(address => bool) public verifiedHumans; // Track orb-verified players
    mapping(address => uint256) public verificationMultiplier; // 100 = 1x, 200 = 2x
    
    uint256 public constant DAILY_CLAIM_COOLDOWN = 24 hours;
    uint256 public constant BASE_REWARD = 10 * 10**18; // 10 WETCAT
    uint256 public constant SCORE_MULTIPLIER = 5 * 10**18; // 5 WETCAT per 1000 score
    uint256 public constant MAX_DAILY_REWARD = 100 * 10**18; // 100 WETCAT max
    uint256 public constant ORB_MULTIPLIER = 200; // 2x for orb verified
    uint256 public constant DEVICE_MULTIPLIER = 150; // 1.5x for device verified
    
    event RewardClaimed(address indexed player, uint256 amount, string reason);
    event AchievementClaimed(address indexed player, string achievementId, uint256 reward);
    event HighScoreUpdated(address indexed player, uint256 newHighScore);
    event HumanVerified(address indexed player, uint256 nullifierHash, uint256 multiplier);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyGameServer() {
        require(msg.sender == gameServer, "Not game server");
        _;
    }
    
    constructor(address _wetcatToken, address _worldId) {
        owner = msg.sender;
        wetcatToken = IERC20(_wetcatToken);
        worldId = IWorldID(_worldId);
    }
    
    function setGameServer(address _gameServer) external onlyOwner {
        gameServer = _gameServer;
    }
    
    // Verify World ID proof and set multiplier
    function verifyHuman(
        address player,
        uint256 merkleRoot,
        uint256 nullifierHash,
        uint256[8] calldata proof,
        uint256 verificationLevel // 1 = device, 2 = orb
    ) external onlyGameServer {
        require(!nullifierHashes[nullifierHash], "Proof already used");
        
        // Verify the proof
        uint256 signalHash = uint256(keccak256(abi.encodePacked(player)));
        uint256 externalNullifierHash = uint256(keccak256(abi.encodePacked(worldIdActionId)));
        
        require(
            worldId.verifyProof(
                merkleRoot,
                worldIdGroupId,
                signalHash,
                nullifierHash,
                externalNullifierHash,
                proof
            ),
            "Invalid World ID proof"
        );
        
        // Mark proof as used
        nullifierHashes[nullifierHash] = true;
        verifiedHumans[player] = true;
        
        // Set multiplier based on verification level
        if (verificationLevel == 2) {
            verificationMultiplier[player] = ORB_MULTIPLIER;
        } else {
            verificationMultiplier[player] = DEVICE_MULTIPLIER;
        }
        
        emit HumanVerified(player, nullifierHash, verificationMultiplier[player]);
    }
    
    function claimDailyReward(address player, uint256 score) external onlyGameServer {
        require(block.timestamp >= lastClaimTime[player] + DAILY_CLAIM_COOLDOWN, "Daily reward on cooldown");
        
        // Update high score if needed
        if (score > playerHighScore[player]) {
            playerHighScore[player] = score;
            emit HighScoreUpdated(player, score);
        }
        
        // Calculate base reward
        uint256 performanceBonus = (score * SCORE_MULTIPLIER) / 1000;
        uint256 baseAmount = BASE_REWARD + performanceBonus;
        
        // Cap at max daily reward
        if (baseAmount > MAX_DAILY_REWARD) {
            baseAmount = MAX_DAILY_REWARD;
        }
        
        // Apply World ID multiplier
        uint256 multiplier = verificationMultiplier[player];
        if (multiplier == 0) multiplier = 100; // Default 1x
        
        uint256 finalReward = (baseAmount * multiplier) / 100;
        
        // Transfer tokens
        require(wetcatToken.transfer(player, finalReward), "Transfer failed");
        
        // Update tracking
        playerTotalEarned[player] += finalReward;
        lastClaimTime[player] = block.timestamp;
        
        emit RewardClaimed(player, finalReward, "daily_play");
    }
    
    // Gasless claim using Permit2
    function claimDailyRewardGasless(
        address player,
        uint256 score,
        IPermit2.PermitTransferFrom calldata permitTransfer,
        IPermit2.PermitData calldata permitData,
        bytes calldata signature
    ) external {
        require(block.timestamp >= lastClaimTime[player] + DAILY_CLAIM_COOLDOWN, "Daily reward on cooldown");
        
        // Calculate reward (same as regular claim)
        uint256 performanceBonus = (score * SCORE_MULTIPLIER) / 1000;
        uint256 baseAmount = BASE_REWARD + performanceBonus;
        if (baseAmount > MAX_DAILY_REWARD) {
            baseAmount = MAX_DAILY_REWARD;
        }
        
        uint256 multiplier = verificationMultiplier[player];
        if (multiplier == 0) multiplier = 100;
        uint256 finalReward = (baseAmount * multiplier) / 100;
        
        // Use Permit2 for gasless transfer
        require(permitTransfer.token == address(wetcatToken), "Invalid token");
        require(permitTransfer.from == address(this), "Invalid from");
        require(permitTransfer.to == player, "Invalid to");
        require(permitTransfer.amount >= finalReward, "Invalid amount");
        
        // Execute permit transfer
        permit2.permitTransferFrom(permitTransfer, permitData, address(this), signature);
        
        // Update tracking
        if (score > playerHighScore[player]) {
            playerHighScore[player] = score;
            emit HighScoreUpdated(player, score);
        }
        playerTotalEarned[player] += finalReward;
        lastClaimTime[player] = block.timestamp;
        
        emit RewardClaimed(player, finalReward, "daily_play_gasless");
    }
    
    function claimAchievement(address player, string memory achievementId, uint256 rewardAmount) external onlyGameServer {
        require(!achievementsClaimed[player][achievementId], "Achievement already claimed");
        
        // Apply multiplier to achievement rewards too
        uint256 multiplier = verificationMultiplier[player];
        if (multiplier == 0) multiplier = 100;
        uint256 finalReward = (rewardAmount * 10**18 * multiplier) / 100;
        
        // Transfer reward
        require(wetcatToken.transfer(player, finalReward), "Transfer failed");
        
        // Mark as claimed
        achievementsClaimed[player][achievementId] = true;
        playerTotalEarned[player] += finalReward;
        
        emit AchievementClaimed(player, achievementId, finalReward);
    }
    
    function getPlayerStats(address player) external view returns (
        uint256 totalEarned,
        uint256 highScore,
        uint256 lastClaim,
        bool canClaimDaily,
        bool isVerified,
        uint256 rewardMultiplier
    ) {
        totalEarned = playerTotalEarned[player];
        highScore = playerHighScore[player];
        lastClaim = lastClaimTime[player];
        canClaimDaily = block.timestamp >= lastClaimTime[player] + DAILY_CLAIM_COOLDOWN;
        isVerified = verifiedHumans[player];
        rewardMultiplier = verificationMultiplier[player] > 0 ? verificationMultiplier[player] : 100;
    }
    
    function isAchievementClaimed(address player, string memory achievementId) external view returns (bool) {
        return achievementsClaimed[player][achievementId];
    }
    
    // Admin functions
    function withdrawTokens(uint256 amount) external onlyOwner {
        require(wetcatToken.transfer(owner, amount), "Transfer failed");
    }
    
    function getContractBalance() external view returns (uint256) {
        return wetcatToken.balanceOf(address(this));
    }
    
    // Approve Permit2 for gasless transfers
    function approvePermit2() external onlyOwner {
        wetcatToken.approve(address(permit2), type(uint256).max);
    }
}