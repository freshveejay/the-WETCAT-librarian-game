import { vi } from 'vitest';

// Mock Game object factory
export function createMockGame(overrides = {}) {
  return {
    canvas: document.createElement('canvas'),
    ctx: {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      globalAlpha: 1,
      fillStyle: '#000',
      font: '16px Arial'
    },
    width: 1280,
    height: 720,
    inputManager: {
      getMovementVector: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      isActionDown: vi.fn().mockReturnValue(false),
      isActionJustPressed: vi.fn().mockReturnValue(false),
      isActionJustReleased: vi.fn().mockReturnValue(false)
    },
    stateManager: {
      currentState: null,
      setState: vi.fn(),
      init: vi.fn().mockResolvedValue(true)
    },
    soundManager: {
      play: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      setVolume: vi.fn(),
      preload: vi.fn().mockResolvedValue(true)
    },
    assetLoader: {
      loadImage: vi.fn().mockResolvedValue(new Image()),
      loadSound: vi.fn().mockResolvedValue(new Audio()),
      getAsset: vi.fn().mockReturnValue(new Image()),
      loadAll: vi.fn().mockResolvedValue(true)
    },
    camera: {
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
      update: vi.fn(),
      shake: vi.fn(),
      follow: vi.fn(),
      isInView: vi.fn().mockReturnValue(true)
    },
    renderer: {
      clear: vi.fn(),
      drawSprite: vi.fn(),
      drawRect: vi.fn(),
      drawText: vi.fn(),
      drawCircle: vi.fn(),
      setAlpha: vi.fn(),
      restore: vi.fn()
    },
    gameData: {
      chaosLevel: 0,
      maxChaos: 100,
      playerLevel: 1,
      xp: 0,
      xpToNext: 100,
      elapsedTime: 0,
      targetTime: 1800, // 30 minutes
      isPaused: false,
      booksCollected: 0,
      booksShelved: 0,
      kidsRepelled: 0
    },
    debug: {
      showFPS: false,
      showCollisionBoxes: false,
      showGrid: false
    },
    ...overrides
  };
}

// Mock Entity factory
export function createMockEntity(x = 0, y = 0, width = 32, height = 32) {
  return {
    x,
    y,
    width,
    height,
    vx: 0,
    vy: 0,
    active: true,
    update: vi.fn(),
    render: vi.fn(),
    checkCollision: vi.fn().mockReturnValue(false),
    getDistanceTo: vi.fn().mockReturnValue(100),
    isWithinRadius: vi.fn().mockReturnValue(false)
  };
}

// Mock Player factory
export function createMockPlayer(game, x = 100, y = 100) {
  return {
    ...createMockEntity(x, y, 48, 64),
    game,
    stats: {
      moveSpeed: 3,
      pickupRadius: 1,
      returnRadius: 0.5,
      carrySlots: 5,
      stamina: 100,
      maxStamina: 100,
      fudDampening: 0,
      xpMultiplier: 1.0
    },
    carriedCoins: [],
    facing: 'down',
    isSprinting: false,
    repelRadius: 48,
    baseSpeed: 96,
    sprintMultiplier: 1.5,
    pickUpCoin: vi.fn().mockReturnValue(true),
    dropAllCoins: vi.fn().mockReturnValue([]),
    isCarryingMax: vi.fn().mockReturnValue(false),
    collisionBox: {
      offsetX: 8,
      offsetY: 24,
      width: 32,
      height: 36
    }
  };
}

// Mock Kid factory
export function createMockKid(game, x = 200, y = 200, type = 0) {
  return {
    ...createMockEntity(x, y, 40, 56),
    game,
    type,
    isHoldingBook: false,
    isFleeing: false,
    targetShelf: null,
    speed: 60,
    fleeSpeed: 120,
    stealBookFrom: vi.fn(),
    dropBook: vi.fn(),
    getCaught: vi.fn(),
    update: vi.fn()
  };
}

// Mock Coin factory
export function createMockCoin(game, x = 300, y = 300) {
  return {
    ...createMockEntity(x, y, 24, 24),
    game,
    id: `coin_${Date.now()}_${Math.random()}`,
    collected: false,
    animationOffset: 0,
    collect: vi.fn()
  };
}

// Mock Shelf factory
export function createMockShelf(x = 400, y = 100) {
  return {
    ...createMockEntity(x, y, 96, 64),
    maxBooks: 10,
    booksStored: 0,
    addBooks: vi.fn().mockReturnValue(0),
    removeBook: vi.fn().mockReturnValue(true),
    hasSpace: vi.fn().mockReturnValue(true),
    isEmpty: vi.fn().mockReturnValue(true)
  };
}

// Mock State factory
export function createMockState(game, name = 'test') {
  return {
    game,
    name,
    enter: vi.fn(),
    exit: vi.fn(),
    update: vi.fn(),
    render: vi.fn(),
    handleInput: vi.fn()
  };
}

// Mock Web3 objects
export function createMockWeb3() {
  return {
    provider: {
      getSigner: vi.fn().mockResolvedValue({
        getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
      }),
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1n })
    },
    contract: {
      balanceOf: vi.fn().mockResolvedValue(1000n),
      approve: vi.fn().mockResolvedValue({ wait: vi.fn() }),
      claimDailyReward: vi.fn().mockResolvedValue({ wait: vi.fn() }),
      getPlayerStats: vi.fn().mockResolvedValue([100n, 50n, Date.now(), true])
    },
    connected: true,
    address: '0x1234567890123456789012345678901234567890'
  };
}

// Mock World ID verification
export function createMockWorldID() {
  return {
    isVerified: vi.fn().mockReturnValue(false),
    getVerificationLevel: vi.fn().mockReturnValue(null),
    getNullifierHash: vi.fn().mockReturnValue(null),
    getRewardMultiplier: vi.fn().mockReturnValue(1.0),
    canClaimDailyReward: vi.fn().mockReturnValue(false),
    verifyWithOrb: vi.fn().mockResolvedValue({
      isVerified: true,
      nullifierHash: '0xmock',
      proof: '0xmockproof',
      merkleRoot: '0xmockroot',
      verificationLevel: 'orb'
    })
  };
}

// Mock API responses
export function createMockApiResponses() {
  return {
    startGame: {
      sessionId: '0xmocksession',
      token: 'mockjwt',
      expiresAt: Date.now() + 7200000,
      rewardMultiplier: 1.0
    },
    updateGame: {
      success: true,
      warnings: []
    },
    claimDaily: {
      success: true,
      txHash: '0xmocktx',
      rewardAmount: '100000000000000000000',
      nextClaimTime: Date.now() + 86400000,
      bonusMultiplier: 1.0
    },
    verifyWorldID: {
      verified: true,
      nullifierHash: '0xmock',
      rewardMultiplier: 2.0,
      benefits: ['2x daily rewards']
    },
    playerStats: {
      address: '0x1234567890123456789012345678901234567890',
      statistics: {
        totalGamesPlayed: 10,
        totalScore: 10000,
        bestScore: 2000
      }
    }
  };
}