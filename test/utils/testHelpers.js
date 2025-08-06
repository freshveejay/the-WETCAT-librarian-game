import { vi } from 'vitest';

/**
 * Test utilities and helper functions
 */

// Wait for a specific amount of time
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simulate game loop iterations
export async function simulateGameLoop(game, iterations = 60, deltaTime = 0.016) {
  for (let i = 0; i < iterations; i++) {
    game.update(deltaTime);
    await wait(0); // Allow async operations to complete
  }
}

// Create a mock canvas context with all required methods
export function createMockContext() {
  const ctx = {
    // State
    save: vi.fn(),
    restore: vi.fn(),
    
    // Transformations
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    
    // Drawing
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    
    // Paths
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    rect: vi.fn(),
    
    // Drawing paths
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    
    // Text
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    
    // Images
    drawImage: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
    
    // Pixel manipulation
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    createPattern: vi.fn(),
    
    // Properties
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    strokeStyle: '#000000',
    fillStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: 'rgba(0, 0, 0, 0)',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    
    // Canvas reference
    canvas: {
      width: 1280,
      height: 720,
      style: {}
    }
  };
  
  return ctx;
}

// Create a mock DOM element
export function createMockElement(tag = 'div') {
  const element = {
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(() => false),
      toggle: vi.fn()
    },
    style: {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    parentElement: null,
    children: [],
    innerHTML: '',
    textContent: '',
    getAttribute: vi.fn(),
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100
    }))
  };
  
  if (tag === 'canvas') {
    element.getContext = vi.fn(() => createMockContext());
    element.width = 1280;
    element.height = 720;
  }
  
  return element;
}

// Simulate keyboard input
export function simulateKeyPress(inputManager, key, type = 'down') {
  const event = new KeyboardEvent(`key${type}`, {
    key,
    code: `Key${key.toUpperCase()}`,
    bubbles: true
  });
  
  inputManager.handleKeyDown?.(event);
  if (type === 'up') {
    inputManager.handleKeyUp?.(event);
  }
}

// Simulate mouse input
export function simulateMouseClick(inputManager, x, y) {
  const event = new MouseEvent('click', {
    clientX: x,
    clientY: y,
    bubbles: true
  });
  
  inputManager.handleMouseClick?.(event);
}

// Create a test game session
export function createTestGameSession() {
  return {
    sessionId: `test_${Date.now()}`,
    playerAddress: '0x1234567890123456789012345678901234567890',
    startTime: Date.now(),
    score: 0,
    coinsCollected: 0,
    booksShelved: 0,
    kidsRepelled: 0,
    chaosLevel: 0,
    achievements: []
  };
}

// Verify game state consistency
export function verifyGameState(game) {
  const errors = [];
  
  // Check chaos level
  if (game.gameData.chaosLevel < 0 || game.gameData.chaosLevel > game.gameData.maxChaos) {
    errors.push(`Invalid chaos level: ${game.gameData.chaosLevel}`);
  }
  
  // Check player stats
  const player = game.stateManager.currentState?.player;
  if (player) {
    if (player.stats.stamina < 0 || player.stats.stamina > player.stats.maxStamina) {
      errors.push(`Invalid stamina: ${player.stats.stamina}`);
    }
    
    if (player.carriedCoins.length > player.stats.carrySlots) {
      errors.push(`Too many coins carried: ${player.carriedCoins.length}`);
    }
  }
  
  // Check XP and level
  if (game.gameData.xp < 0) {
    errors.push(`Invalid XP: ${game.gameData.xp}`);
  }
  
  if (game.gameData.playerLevel < 1) {
    errors.push(`Invalid player level: ${game.gameData.playerLevel}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Performance testing helper
export function measurePerformance(fn, iterations = 1000) {
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  return {
    average: avg,
    min,
    max,
    total: times.reduce((a, b) => a + b, 0),
    iterations
  };
}

// Mock localStorage with full functionality
export function createMockLocalStorage() {
  const storage = new Map();
  
  return {
    getItem: vi.fn((key) => storage.get(key) || null),
    setItem: vi.fn((key, value) => storage.set(key, value)),
    removeItem: vi.fn((key) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    get length() {
      return storage.size;
    },
    key: vi.fn((index) => {
      const keys = Array.from(storage.keys());
      return keys[index] || null;
    })
  };
}

// Assert approximate equality for floating point numbers
export function expectApprox(actual, expected, tolerance = 0.001) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(`Expected ${actual} to be approximately ${expected} (tolerance: ${tolerance}, diff: ${diff})`);
  }
}

// Create a deterministic random number generator for tests
export function createSeededRandom(seed = 12345) {
  let value = seed;
  
  return {
    next: () => {
      value = (value * 1103515245 + 12345) % 2147483648;
      return value / 2147483648;
    },
    reset: () => {
      value = seed;
    }
  };
}

// Mock fetch with predefined responses
export function createMockFetch(responses = {}) {
  return vi.fn(async (url, options) => {
    const response = responses[url] || responses.default || { 
      ok: true, 
      json: async () => ({}) 
    };
    
    if (typeof response === 'function') {
      return response(url, options);
    }
    
    return {
      ok: response.ok !== false,
      status: response.status || 200,
      statusText: response.statusText || 'OK',
      json: async () => response.json || {},
      text: async () => response.text || '',
      headers: new Headers(response.headers || {})
    };
  });
}