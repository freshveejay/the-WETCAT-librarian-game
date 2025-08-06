import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../../src/game/entities/Player.js';

describe('Player Entity', () => {
  let player;
  let mockGame;

  beforeEach(() => {
    // Mock game object
    mockGame = {
      inputManager: {
        getMovementVector: vi.fn().mockReturnValue({ x: 0, y: 0 }),
        isActionDown: vi.fn().mockReturnValue(false)
      },
      stateManager: {
        currentState: {
          shelves: [],
          worldWidth: 2000,
          worldHeight: 2000
        }
      }
    };

    player = new Player(mockGame, 100, 100);
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(player.x).toBe(100);
      expect(player.y).toBe(100);
      expect(player.width).toBe(48);
      expect(player.height).toBe(64);
      expect(player.stats.moveSpeed).toBe(3);
      expect(player.stats.stamina).toBe(100);
      expect(player.stats.maxStamina).toBe(100);
      expect(player.facing).toBe('down');
    });

    it('should have correct collision box dimensions', () => {
      expect(player.collisionBox.offsetX).toBe(8);
      expect(player.collisionBox.offsetY).toBe(24);
      expect(player.collisionBox.width).toBe(32);
      expect(player.collisionBox.height).toBe(36);
    });
  });

  describe('Movement', () => {
    it('should move based on input vector', () => {
      mockGame.inputManager.getMovementVector.mockReturnValue({ x: 1, y: 0 });
      const deltaTime = 0.016; // 60 FPS

      player.update(deltaTime);

      expect(player.vx).toBe(player.baseSpeed);
      expect(player.vy).toBe(0);
      expect(player.x).toBeGreaterThan(100);
    });

    it('should face the correct direction when moving', () => {
      // Move right
      mockGame.inputManager.getMovementVector.mockReturnValue({ x: 1, y: 0 });
      player.update(0.016);
      expect(player.facing).toBe('right');

      // Move left
      mockGame.inputManager.getMovementVector.mockReturnValue({ x: -1, y: 0 });
      player.update(0.016);
      expect(player.facing).toBe('left');

      // Move down
      mockGame.inputManager.getMovementVector.mockReturnValue({ x: 0, y: 1 });
      player.update(0.016);
      expect(player.facing).toBe('down');

      // Move up
      mockGame.inputManager.getMovementVector.mockReturnValue({ x: 0, y: -1 });
      player.update(0.016);
      expect(player.facing).toBe('up');
    });

    it('should stay within world bounds', () => {
      player.x = -10;
      player.y = -10;
      player.update(0.016);

      expect(player.x).toBe(0);
      expect(player.y).toBe(0);

      player.x = 3000;
      player.y = 3000;
      player.update(0.016);

      expect(player.x).toBe(2000 - player.width);
      expect(player.y).toBe(2000 - player.height);
    });
  });

  describe('Sprinting', () => {
    it('should increase speed when sprinting with stamina', () => {
      mockGame.inputManager.getMovementVector.mockReturnValue({ x: 1, y: 0 });
      mockGame.inputManager.isActionDown.mockReturnValue(true); // Sprint key pressed

      const normalSpeed = player.baseSpeed;
      player.update(0.016);

      expect(player.vx).toBe(normalSpeed * player.sprintMultiplier);
      expect(player.isSprinting).toBe(true);
    });

    it('should drain stamina while sprinting', () => {
      mockGame.inputManager.isActionDown.mockReturnValue(true);
      const initialStamina = player.stats.stamina;

      player.update(1); // 1 second

      expect(player.stats.stamina).toBeLessThan(initialStamina);
      expect(player.stats.stamina).toBe(80); // 100 - 20 per second
    });

    it('should not sprint when stamina is depleted', () => {
      player.stats.stamina = 0;
      mockGame.inputManager.getMovementVector.mockReturnValue({ x: 1, y: 0 });
      mockGame.inputManager.isActionDown.mockReturnValue(true);

      player.update(0.016);

      expect(player.isSprinting).toBe(false);
      expect(player.vx).toBe(player.baseSpeed); // Normal speed
    });

    it('should regenerate stamina when not sprinting', () => {
      player.stats.stamina = 50;
      mockGame.inputManager.isActionDown.mockReturnValue(false);

      player.update(1); // 1 second

      expect(player.stats.stamina).toBe(60); // 50 + 10 per second
    });
  });

  describe('Collision Detection', () => {
    it('should detect collision with shelves', () => {
      const shelf = {
        x: 150,
        y: 100,
        width: 50,
        height: 50
      };

      mockGame.stateManager.currentState.shelves = [shelf];
      mockGame.inputManager.getMovementVector.mockReturnValue({ x: 1, y: 0 });

      // Position player near shelf
      player.x = 120;
      player.update(0.016);

      // Should stop before colliding
      expect(player.x).toBeLessThan(shelf.x);
    });

    it('should check collision correctly', () => {
      const otherEntity = {
        x: 100,
        y: 100,
        width: 50,
        height: 50
      };

      // Test overlapping
      expect(player.checkCollision(110, 110, otherEntity)).toBe(true);

      // Test not overlapping
      expect(player.checkCollision(200, 200, otherEntity)).toBe(false);
    });
  });

  describe('Book Carrying', () => {
    it('should pick up coins when space is available', () => {
      const coin = { id: 'coin1', x: 100, y: 100 };
      
      const picked = player.pickUpCoin(coin);
      
      expect(picked).toBe(true);
      expect(player.carriedCoins).toContain(coin);
      expect(player.carriedCoins.length).toBe(1);
    });

    it('should not pick up coins when at max capacity', () => {
      // Fill up carry slots
      for (let i = 0; i < player.stats.carrySlots; i++) {
        player.carriedCoins.push({ id: `coin${i}` });
      }

      const extraCoin = { id: 'extra', x: 100, y: 100 };
      const picked = player.pickUpCoin(extraCoin);

      expect(picked).toBe(false);
      expect(player.carriedCoins.length).toBe(player.stats.carrySlots);
    });

    it('should drop all coins', () => {
      player.carriedCoins = [
        { id: 'coin1' },
        { id: 'coin2' }
      ];

      const dropped = player.dropAllCoins();

      expect(dropped.length).toBe(2);
      expect(player.carriedCoins.length).toBe(0);
    });
  });

  describe('Distance Calculations', () => {
    it('should calculate distance to entity correctly', () => {
      const entity = { x: 200, y: 100 };
      
      const distance = player.getDistanceTo(entity);
      
      expect(distance).toBeCloseTo(100); // Simple horizontal distance
    });

    it('should check if entity is within radius', () => {
      const nearEntity = { x: 150, y: 100 };
      const farEntity = { x: 500, y: 500 };

      expect(player.isWithinRadius(nearEntity, 100)).toBe(true);
      expect(player.isWithinRadius(farEntity, 100)).toBe(false);
    });
  });
});