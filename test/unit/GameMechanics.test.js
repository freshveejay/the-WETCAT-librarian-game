import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayingState } from '../../src/game/states/PlayingState.js';
import { Player } from '../../src/game/entities/Player.js';
import { Kid } from '../../src/game/entities/Kid.js';
import { Coin } from '../../src/game/entities/Coin.js';
import { Shelf } from '../../src/game/entities/Shelf.js';

describe('Game Mechanics', () => {
  let playingState;
  let mockGame;
  let player;

  beforeEach(() => {
    // Mock game object with necessary systems
    mockGame = {
      inputManager: {
        getMovementVector: vi.fn().mockReturnValue({ x: 0, y: 0 }),
        isActionDown: vi.fn().mockReturnValue(false),
        isActionJustPressed: vi.fn().mockReturnValue(false)
      },
      stateManager: {
        currentState: null,
        setState: vi.fn()
      },
      soundManager: {
        play: vi.fn(),
        stop: vi.fn(),
        setVolume: vi.fn()
      },
      camera: {
        x: 0,
        y: 0,
        update: vi.fn(),
        shake: vi.fn()
      },
      renderer: {
        clear: vi.fn(),
        drawSprite: vi.fn(),
        drawRect: vi.fn(),
        drawText: vi.fn()
      },
      gameData: {
        chaosLevel: 0,
        maxChaos: 100,
        playerLevel: 1,
        xp: 0,
        xpToNext: 100,
        elapsedTime: 0,
        targetTime: 30 * 60,
        isPaused: false,
        booksCollected: 0,
        booksShelved: 0,
        kidsRepelled: 0
      },
      width: 1280,
      height: 720
    };

    playingState = new PlayingState(mockGame);
    player = new Player(mockGame, 400, 300);
    playingState.player = player;
    mockGame.stateManager.currentState = playingState;
  });

  describe('Chaos Level Management', () => {
    it('should increase chaos when kids hold books', () => {
      const kid = new Kid(mockGame, 200, 200, 0);
      kid.isHoldingBook = true;
      playingState.kids = [kid];

      const initialChaos = mockGame.gameData.chaosLevel;
      playingState.updateChaosLevel(1);

      expect(mockGame.gameData.chaosLevel).toBeGreaterThan(initialChaos);
    });

    it('should trigger game over when chaos reaches maximum', () => {
      mockGame.gameData.chaosLevel = mockGame.gameData.maxChaos;
      
      playingState.update(0.016);

      expect(mockGame.stateManager.setState).toHaveBeenCalledWith('gameover');
    });

    it('should decrease chaos when books are shelved', () => {
      mockGame.gameData.chaosLevel = 50;
      
      playingState.shelfBooks(player, 3);

      expect(mockGame.gameData.chaosLevel).toBeLessThan(50);
      expect(mockGame.gameData.booksShelved).toBe(3);
    });
  });

  describe('Coin Collection', () => {
    it('should collect coins within pickup radius', () => {
      const coin = new Coin(mockGame, player.x + 20, player.y + 20);
      playingState.coins = [coin];
      player.stats.pickupRadius = 50;

      playingState.checkCoinCollection();

      expect(player.carriedCoins.length).toBe(1);
      expect(playingState.coins.length).toBe(0);
      expect(mockGame.soundManager.play).toHaveBeenCalledWith('pickup_book');
    });

    it('should not collect coins when inventory is full', () => {
      // Fill player inventory
      for (let i = 0; i < player.stats.carrySlots; i++) {
        player.carriedCoins.push({ id: `coin${i}` });
      }

      const coin = new Coin(mockGame, player.x + 20, player.y + 20);
      playingState.coins = [coin];

      playingState.checkCoinCollection();

      expect(playingState.coins.length).toBe(1); // Coin not collected
    });

    it('should spawn coins periodically', () => {
      playingState.coinSpawnTimer = 0;
      const initialCoinCount = playingState.coins.length;

      playingState.update(0.016);

      expect(playingState.coins.length).toBeGreaterThan(initialCoinCount);
    });
  });

  describe('Kid Behavior', () => {
    it('should repel kids within repel radius', () => {
      const kid = new Kid(mockGame, player.x + 30, player.y + 30, 0);
      playingState.kids = [kid];
      player.repelRadius = 50;

      playingState.updateKids(0.016);

      // Kid should be pushed away from player
      const distance = Math.sqrt(
        Math.pow(kid.x - player.x, 2) + 
        Math.pow(kid.y - player.y, 2)
      );
      expect(distance).toBeGreaterThan(30);
    });

    it('should make kids steal books from shelves', () => {
      const shelf = new Shelf(200, 200);
      shelf.booksStored = 5;
      const kid = new Kid(mockGame, shelf.x + 10, shelf.y + 10, 0);
      
      playingState.shelves = [shelf];
      playingState.kids = [kid];
      
      // Simulate kid reaching shelf
      kid.targetShelf = shelf;
      kid.stealBookFrom(shelf);

      expect(shelf.booksStored).toBe(4);
      expect(kid.isHoldingBook).toBe(true);
    });

    it('should make kids drop books when caught', () => {
      const kid = new Kid(mockGame, 200, 200, 0);
      kid.isHoldingBook = true;
      playingState.kids = [kid];

      // Simulate catching the kid
      kid.getCaught();

      expect(kid.isHoldingBook).toBe(false);
      expect(kid.isFleeing).toBe(true);
      expect(playingState.coins.length).toBe(1); // Book converted to coin
    });
  });

  describe('Book Shelving', () => {
    it('should shelve books when player is near shelf', () => {
      const shelf = new Shelf(player.x + 10, player.y + 10);
      playingState.shelves = [shelf];
      
      // Give player some books
      player.carriedCoins = [
        { id: 'book1' },
        { id: 'book2' }
      ];

      playingState.checkBookShelving();

      expect(shelf.booksStored).toBe(2);
      expect(player.carriedCoins.length).toBe(0);
      expect(mockGame.gameData.booksShelved).toBe(2);
    });

    it('should not exceed shelf capacity', () => {
      const shelf = new Shelf(player.x + 10, player.y + 10);
      shelf.maxBooks = 5;
      shelf.booksStored = 4;
      playingState.shelves = [shelf];
      
      player.carriedCoins = [
        { id: 'book1' },
        { id: 'book2' }
      ];

      playingState.checkBookShelving();

      expect(shelf.booksStored).toBe(5); // Max capacity
      expect(player.carriedCoins.length).toBe(1); // One book remains
    });
  });

  describe('Score and XP System', () => {
    it('should award XP for collecting books', () => {
      const initialXP = mockGame.gameData.xp;
      
      playingState.awardXP(10);

      expect(mockGame.gameData.xp).toBe(initialXP + 10);
    });

    it('should level up when XP threshold is reached', () => {
      mockGame.gameData.xp = 90;
      mockGame.gameData.xpToNext = 100;
      mockGame.gameData.playerLevel = 1;

      playingState.awardXP(15);

      expect(mockGame.gameData.playerLevel).toBe(2);
      expect(mockGame.gameData.xp).toBe(5); // Overflow XP
      expect(mockGame.stateManager.setState).toHaveBeenCalledWith('upgrade');
    });

    it('should calculate score based on game stats', () => {
      mockGame.gameData.booksCollected = 10;
      mockGame.gameData.booksShelved = 8;
      mockGame.gameData.kidsRepelled = 5;
      mockGame.gameData.elapsedTime = 300; // 5 minutes

      const score = playingState.calculateScore();

      // Score = books * 10 + shelved * 20 + kids * 5 + time bonus
      expect(score).toBe(10 * 10 + 8 * 20 + 5 * 5 + Math.floor(300 / 60) * 10);
    });
  });

  describe('Wave System', () => {
    it('should increase difficulty over time', () => {
      playingState.waveNumber = 1;
      playingState.waveTimer = 0;

      // Trigger next wave
      playingState.update(30); // Fast forward 30 seconds

      expect(playingState.waveNumber).toBe(2);
      expect(playingState.kids.length).toBeGreaterThan(0);
    });

    it('should spawn more kids in later waves', () => {
      playingState.waveNumber = 5;
      const kidCount = playingState.getKidsForWave(5);

      expect(kidCount).toBeGreaterThan(playingState.getKidsForWave(1));
    });
  });

  describe('Game Timer', () => {
    it('should track elapsed time', () => {
      const initialTime = mockGame.gameData.elapsedTime;
      
      playingState.update(1); // 1 second

      expect(mockGame.gameData.elapsedTime).toBe(initialTime + 1);
    });

    it('should end game when target time is reached', () => {
      mockGame.gameData.elapsedTime = mockGame.gameData.targetTime - 1;
      
      playingState.update(2); // Go over time limit

      expect(mockGame.stateManager.setState).toHaveBeenCalledWith('gameover');
    });
  });

  describe('Pause Functionality', () => {
    it('should pause game when requested', () => {
      mockGame.inputManager.isActionJustPressed.mockReturnValue(true);
      
      playingState.update(0.016);

      expect(mockGame.gameData.isPaused).toBe(true);
      expect(mockGame.stateManager.setState).toHaveBeenCalledWith('paused');
    });

    it('should not update game state when paused', () => {
      mockGame.gameData.isPaused = true;
      const initialTime = mockGame.gameData.elapsedTime;
      
      playingState.update(1);

      expect(mockGame.gameData.elapsedTime).toBe(initialTime);
    });
  });
});