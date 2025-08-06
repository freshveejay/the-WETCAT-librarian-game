// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract WETCATGameRewards {
    address public owner;
    address public gameServer;
    IERC20 public wetcatToken;
    
    mapping(address => uint256) public playerTotalEarned;
    mapping(address => uint256) public playerHighScore;
    mapping(address => uint256) public lastClaimTime;
    mapping(address => mapping(string => bool)) public achievementsClaimed;
    
    uint256 public constant DAILY_CLAIM_COOLDOWN = 24 hours;
    uint256 public constant BASE_REWARD = 10 * 10**18; // 10 WETCAT
    uint256 public constant SCORE_MULTIPLIER = 5 * 10**18; // 5 WETCAT per 1000 score
    uint256 public constant MAX_DAILY_REWARD = 100 * 10**18; // 100 WETCAT max
    
    event RewardClaimed(address indexed player, uint256 amount, string reason);
    event AchievementClaimed(address indexed player, string achievementId, uint256 reward);
    event HighScoreUpdated(address indexed player, uint256 newHighScore);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyGameServer() {
        require(msg.sender == gameServer, "Not game server");
        _;
    }
    
    constructor(address _wetcatToken) {
        owner = msg.sender;
        wetcatToken = IERC20(_wetcatToken);
    }
    
    function setGameServer(address _gameServer) external onlyOwner {
        gameServer = _gameServer;
    }
    
    function claimDailyReward(address player, uint256 score) external onlyGameServer {
        require(block.timestamp >= lastClaimTime[player] + DAILY_CLAIM_COOLDOWN, "Daily reward on cooldown");
        
        // Update high score if needed
        if (score > playerHighScore[player]) {
            playerHighScore[player] = score;
            emit HighScoreUpdated(player, score);
        }
        
        // Calculate reward based on score
        uint256 performanceBonus = (score * SCORE_MULTIPLIER) / 1000;
        uint256 reward = BASE_REWARD + performanceBonus;
        
        // Cap at max daily reward
        if (reward > MAX_DAILY_REWARD) {
            reward = MAX_DAILY_REWARD;
        }
        
        // Transfer tokens
        require(wetcatToken.transfer(player, reward), "Transfer failed");
        
        // Update tracking
        playerTotalEarned[player] += reward;
        lastClaimTime[player] = block.timestamp;
        
        emit RewardClaimed(player, reward, "daily_play");
    }
    
    function claimAchievement(address player, string memory achievementId, uint256 rewardAmount) external onlyGameServer {
        require(!achievementsClaimed[player][achievementId], "Achievement already claimed");
        
        // Transfer reward
        require(wetcatToken.transfer(player, rewardAmount * 10**18), "Transfer failed");
        
        // Mark as claimed
        achievementsClaimed[player][achievementId] = true;
        playerTotalEarned[player] += rewardAmount * 10**18;
        
        emit AchievementClaimed(player, achievementId, rewardAmount * 10**18);
    }
    
    function getPlayerStats(address player) external view returns (
        uint256 totalEarned,
        uint256 highScore,
        uint256 lastClaim,
        bool canClaimDaily
    ) {
        totalEarned = playerTotalEarned[player];
        highScore = playerHighScore[player];
        lastClaim = lastClaimTime[player];
        canClaimDaily = block.timestamp >= lastClaimTime[player] + DAILY_CLAIM_COOLDOWN;
    }
    
    function isAchievementClaimed(address player, string memory achievementId) external view returns (bool) {
        return achievementsClaimed[player][achievementId];
    }
    
    function withdrawTokens(uint256 amount) external onlyOwner {
        require(wetcatToken.transfer(owner, amount), "Transfer failed");
    }
    
    function getContractBalance() external view returns (uint256) {
        return wetcatToken.balanceOf(address(this));
    }
}