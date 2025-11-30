// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
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

contract WETCATStaking {
    // State variables
    address public owner;
    IERC20 public wetcatToken;
    IWorldID public worldId;

    // Staking configuration
    uint256 public constant MIN_STAKE = 100 * 10**18; // 100 WETCAT minimum
    uint256 public constant LOCK_PERIOD = 7 days; // Minimum lock period
    uint256 public constant BASE_APY = 25; // 25% base APY
    uint256 public constant VERIFIED_BONUS_APY = 15; // +15% for World ID verified
    uint256 public constant GAME_BONUS_APY = 10; // +10% for active gamers
    uint256 public constant COMPOUND_INTERVAL = 1 days;

    // Staking pools for different lock periods
    enum LockTier { FLEXIBLE, BRONZE, SILVER, GOLD, DIAMOND }

    struct LockConfig {
        uint256 lockDays;
        uint256 bonusAPY;
        string name;
    }

    mapping(LockTier => LockConfig) public lockConfigs;

    // Staker info
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lockEndTime;
        uint256 lastRewardTime;
        uint256 accumulatedRewards;
        LockTier tier;
        bool isActive;
    }

    mapping(address => Stake) public stakes;
    mapping(address => bool) public verifiedHumans;
    mapping(address => bool) public activeGamers; // Set by game contract
    mapping(address => uint256) public totalRewardsClaimed;

    // Global stats
    uint256 public totalStaked;
    uint256 public totalStakers;
    uint256 public totalRewardsDistributed;

    // Events
    event Staked(address indexed user, uint256 amount, LockTier tier, uint256 lockEndTime);
    event Unstaked(address indexed user, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, uint256 amount);
    event Compounded(address indexed user, uint256 rewards);
    event HumanVerified(address indexed user);
    event ActiveGamerSet(address indexed user, bool isActive);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _wetcatToken, address _worldId) {
        owner = msg.sender;
        wetcatToken = IERC20(_wetcatToken);
        worldId = IWorldID(_worldId);

        // Initialize lock tiers
        lockConfigs[LockTier.FLEXIBLE] = LockConfig(0, 0, "Flexible");
        lockConfigs[LockTier.BRONZE] = LockConfig(7, 5, "Bronze (7 days)");
        lockConfigs[LockTier.SILVER] = LockConfig(30, 15, "Silver (30 days)");
        lockConfigs[LockTier.GOLD] = LockConfig(90, 30, "Gold (90 days)");
        lockConfigs[LockTier.DIAMOND] = LockConfig(180, 50, "Diamond (180 days)");
    }

    // Stake WETCAT tokens
    function stake(uint256 amount, LockTier tier) external {
        require(amount >= MIN_STAKE, "Below minimum stake");
        require(!stakes[msg.sender].isActive, "Already staking - unstake first");

        // Transfer tokens to contract
        require(wetcatToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        LockConfig memory config = lockConfigs[tier];
        uint256 lockEnd = tier == LockTier.FLEXIBLE ? 0 : block.timestamp + (config.lockDays * 1 days);

        stakes[msg.sender] = Stake({
            amount: amount,
            startTime: block.timestamp,
            lockEndTime: lockEnd,
            lastRewardTime: block.timestamp,
            accumulatedRewards: 0,
            tier: tier,
            isActive: true
        });

        totalStaked += amount;
        totalStakers += 1;

        emit Staked(msg.sender, amount, tier, lockEnd);
    }

    // Add more tokens to existing stake
    function addToStake(uint256 amount) external {
        require(stakes[msg.sender].isActive, "No active stake");
        require(amount > 0, "Amount must be > 0");

        // Claim pending rewards first
        _claimRewards(msg.sender);

        // Transfer additional tokens
        require(wetcatToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        stakes[msg.sender].amount += amount;
        totalStaked += amount;
    }

    // Unstake tokens
    function unstake() external {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.isActive, "No active stake");

        // Check lock period for non-flexible stakes
        if (userStake.tier != LockTier.FLEXIBLE) {
            require(block.timestamp >= userStake.lockEndTime, "Lock period not ended");
        }

        // Calculate and claim final rewards
        uint256 pendingRewards = calculatePendingRewards(msg.sender);
        uint256 totalAmount = userStake.amount + pendingRewards + userStake.accumulatedRewards;

        // Reset stake
        uint256 stakedAmount = userStake.amount;
        userStake.amount = 0;
        userStake.accumulatedRewards = 0;
        userStake.isActive = false;

        totalStaked -= stakedAmount;
        totalStakers -= 1;
        totalRewardsDistributed += pendingRewards;
        totalRewardsClaimed[msg.sender] += pendingRewards;

        // Transfer tokens + rewards
        require(wetcatToken.transfer(msg.sender, totalAmount), "Transfer failed");

        emit Unstaked(msg.sender, stakedAmount, pendingRewards);
    }

    // Emergency unstake (forfeits some rewards)
    function emergencyUnstake() external {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.isActive, "No active stake");

        uint256 stakedAmount = userStake.amount;

        // 10% penalty for early withdrawal from locked stakes
        uint256 penalty = 0;
        if (userStake.tier != LockTier.FLEXIBLE && block.timestamp < userStake.lockEndTime) {
            penalty = stakedAmount / 10; // 10% penalty
        }

        uint256 returnAmount = stakedAmount - penalty;

        // Reset stake (forfeit accumulated rewards)
        userStake.amount = 0;
        userStake.accumulatedRewards = 0;
        userStake.isActive = false;

        totalStaked -= stakedAmount;
        totalStakers -= 1;

        // Transfer remaining tokens
        require(wetcatToken.transfer(msg.sender, returnAmount), "Transfer failed");

        emit Unstaked(msg.sender, returnAmount, 0);
    }

    // Claim rewards without unstaking
    function claimRewards() external {
        _claimRewards(msg.sender);
    }

    function _claimRewards(address user) internal {
        Stake storage userStake = stakes[user];
        require(userStake.isActive, "No active stake");

        uint256 pendingRewards = calculatePendingRewards(user);
        uint256 totalClaimable = pendingRewards + userStake.accumulatedRewards;

        if (totalClaimable > 0) {
            userStake.accumulatedRewards = 0;
            userStake.lastRewardTime = block.timestamp;

            totalRewardsDistributed += pendingRewards;
            totalRewardsClaimed[user] += totalClaimable;

            require(wetcatToken.transfer(user, totalClaimable), "Transfer failed");

            emit RewardsClaimed(user, totalClaimable);
        }
    }

    // Compound rewards back into stake
    function compound() external {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.isActive, "No active stake");

        uint256 pendingRewards = calculatePendingRewards(msg.sender);
        uint256 totalCompound = pendingRewards + userStake.accumulatedRewards;

        require(totalCompound > 0, "Nothing to compound");

        // Add rewards to stake
        userStake.amount += totalCompound;
        userStake.accumulatedRewards = 0;
        userStake.lastRewardTime = block.timestamp;

        totalStaked += totalCompound;
        totalRewardsDistributed += pendingRewards;

        emit Compounded(msg.sender, totalCompound);
    }

    // Calculate pending rewards for a user
    function calculatePendingRewards(address user) public view returns (uint256) {
        Stake memory userStake = stakes[user];
        if (!userStake.isActive || userStake.amount == 0) return 0;

        uint256 timeElapsed = block.timestamp - userStake.lastRewardTime;
        uint256 effectiveAPY = getEffectiveAPY(user);

        // rewards = principal * APY * time / (365 days * 100)
        uint256 rewards = (userStake.amount * effectiveAPY * timeElapsed) / (365 days * 100);

        return rewards;
    }

    // Get effective APY for a user including all bonuses
    function getEffectiveAPY(address user) public view returns (uint256) {
        Stake memory userStake = stakes[user];
        if (!userStake.isActive) return 0;

        uint256 apy = BASE_APY;

        // Lock tier bonus
        apy += lockConfigs[userStake.tier].bonusAPY;

        // World ID verified bonus
        if (verifiedHumans[user]) {
            apy += VERIFIED_BONUS_APY;
        }

        // Active gamer bonus
        if (activeGamers[user]) {
            apy += GAME_BONUS_APY;
        }

        return apy;
    }

    // Get user's stake info
    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 lockEndTime,
        uint256 pendingRewards,
        uint256 effectiveAPY,
        LockTier tier,
        bool isActive,
        bool canUnstake
    ) {
        Stake memory userStake = stakes[user];

        amount = userStake.amount;
        startTime = userStake.startTime;
        lockEndTime = userStake.lockEndTime;
        pendingRewards = calculatePendingRewards(user) + userStake.accumulatedRewards;
        effectiveAPY = getEffectiveAPY(user);
        tier = userStake.tier;
        isActive = userStake.isActive;
        canUnstake = userStake.tier == LockTier.FLEXIBLE || block.timestamp >= userStake.lockEndTime;
    }

    // Get lock tier details
    function getLockTierInfo(LockTier tier) external view returns (
        uint256 lockDays,
        uint256 bonusAPY,
        string memory name
    ) {
        LockConfig memory config = lockConfigs[tier];
        return (config.lockDays, config.bonusAPY, config.name);
    }

    // Set verified human status (called by game contract after World ID verification)
    function setVerifiedHuman(address user, bool verified) external onlyOwner {
        verifiedHumans[user] = verified;
        emit HumanVerified(user);
    }

    // Set active gamer status (called by game contract for players who play regularly)
    function setActiveGamer(address user, bool active) external onlyOwner {
        activeGamers[user] = active;
        emit ActiveGamerSet(user, active);
    }

    // Admin: withdraw excess tokens (for emergencies)
    function withdrawExcess(uint256 amount) external onlyOwner {
        uint256 available = wetcatToken.balanceOf(address(this)) - totalStaked;
        require(amount <= available, "Cannot withdraw staked tokens");
        require(wetcatToken.transfer(owner, amount), "Transfer failed");
    }

    // View functions for frontend
    function getGlobalStats() external view returns (
        uint256 _totalStaked,
        uint256 _totalStakers,
        uint256 _totalRewardsDistributed,
        uint256 _contractBalance
    ) {
        return (
            totalStaked,
            totalStakers,
            totalRewardsDistributed,
            wetcatToken.balanceOf(address(this))
        );
    }
}
