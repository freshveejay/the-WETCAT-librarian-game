export class Weapon {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.cooldown = config.cooldown;
    this.currentCooldown = 0;
    this.damage = config.damage || 0;
    this.range = config.range || 100;
    this.effect = config.effect;
    this.level = 1;
    this.icon = config.icon;
  }

  update(deltaTime) {
    if (this.currentCooldown > 0) {
      this.currentCooldown = Math.max(0, this.currentCooldown - deltaTime);
    }
  }

  canFire() {
    return this.currentCooldown <= 0;
  }

  fire(player, game) {
    if (!this.canFire()) return false;

    this.currentCooldown = this.cooldown;
    this.effect(player, game, this.level);
    return true;
  }

  getCooldownPercent() {
    return this.currentCooldown / this.cooldown;
  }
}

export class WeaponSystem {
  constructor(game) {
    this.game = game;
    this.weapons = new Map();
    this.activeWeapons = [];
    this.maxActiveWeapons = 4;

    // Initialize all weapons
    this.initializeWeapons();
  }

  initializeWeapons() {
    // FUD Blast - Cone attack that repels scammers
    this.registerWeapon({
      id: 'fud_blast',
      name: 'FUD Blast',
      icon: '💥',
      cooldown: 3,
      range: 150,
      effect: (player, game, level) => {
        const state = game.stateManager.currentState;
        if (!state || !state.scammers) return;

        // Create cone effect
        const coneAngle = Math.PI / 3 + (level * 0.1); // 60° + 10° per level
        const range = 150 + (level * 20);

        // Visual effect
        if (state.particleSystem) {
          state.particleSystem.emit(player.getCenterX(), player.getCenterY(), 'repel', 20);
        }

        // Check scammers in cone
        state.scammers.forEach(scammer => {
          const dx = scammer.getCenterX() - player.getCenterX();
          const dy = scammer.getCenterY() - player.getCenterY();
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= range) {
            // Check angle
            const angle = Math.atan2(dy, dx);
            const playerAngle = player.facing === 'right' ? 0 :
              player.facing === 'left' ? Math.PI :
                player.facing === 'down' ? Math.PI / 2 : -Math.PI / 2;

            const angleDiff = Math.abs(angle - playerAngle);
            if (angleDiff <= coneAngle / 2) {
              // Repel scammer
              scammer.isRepelled = true;
              scammer.repelVelocity = {
                x: (dx / distance) * 300,
                y: (dy / distance) * 300
              };
              scammer.state = 'fleeing';
              scammer.dropAllCoins();

              // Award XP
              state.awardXP(10);
              game.gameData.scammersRepelled++;
            }
          }
        });

        // Play sound
        game.soundManager?.playSound('fudBlast');

        // Screen shake
        game.screenShake?.shake(5, 0.3);
      }
    });

    // Diamond Hand Slap - Melee attack
    this.registerWeapon({
      id: 'diamond_slap',
      name: 'Diamond Hand Slap',
      icon: '💎',
      cooldown: 1,
      range: 50,
      effect: (player, game, level) => {
        const state = game.stateManager.currentState;
        if (!state || !state.scammers) return;

        const range = 50 + (level * 10);
        const damage = 1 + Math.floor(level / 2);

        // Visual effect - diamond particles
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i;
          if (state.particleSystem) {
            state.particleSystem.particles.push({
              x: player.getCenterX() + Math.cos(angle) * 20,
              y: player.getCenterY() + Math.sin(angle) * 20,
              vx: Math.cos(angle) * 200,
              vy: Math.sin(angle) * 200,
              life: 0.5,
              maxLife: 0.5,
              size: 8,
              color: '#B9F2FF',
              type: 'sparkle'
            });
          }
        }

        // Hit nearby scammers
        let hitCount = 0;
        state.scammers.forEach(scammer => {
          const distance = player.getDistanceTo(scammer);
          if (distance <= range) {
            // Knock back
            const dx = scammer.getCenterX() - player.getCenterX();
            const dy = scammer.getCenterY() - player.getCenterY();
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            scammer.repelVelocity = {
              x: (dx / dist) * 200,
              y: (dy / dist) * 200
            };
            scammer.dropAllCoins();
            hitCount++;

            // Coin magnet effect at higher levels
            if (level >= 3) {
              state.coins.forEach(coin => {
                const coinDist = player.getDistanceTo(coin);
                if (coinDist <= range * 2 && !coin.isHeld) {
                  // Pull coin toward player
                  coin.vx = (player.getCenterX() - coin.x) * 2;
                  coin.vy = (player.getCenterY() - coin.y) * 2;
                }
              });
            }
          }
        });

        if (hitCount > 0) {
          state.awardXP(5 * hitCount);
          game.soundManager?.playSound('diamondSlap');
        }
      }
    });

    // HODL Shield - Defensive bubble
    this.registerWeapon({
      id: 'hodl_shield',
      name: 'HODL Shield',
      icon: '🛡️',
      cooldown: 10,
      duration: 3,
      effect: (player, game, level) => {
        const duration = 3 + (level * 0.5);

        // Apply shield buff to player
        player.buffs = player.buffs || {};
        player.buffs.hodlShield = {
          duration: duration,
          level: level
        };

        // Visual feedback
        game.soundManager?.playSound('shieldUp');

        // Heal FUD at higher levels
        if (level >= 3) {
          game.gameData.fudLevel = Math.max(0, game.gameData.fudLevel - 10);
        }
      }
    });

    // Moon Beam - Auto-deposit laser
    this.registerWeapon({
      id: 'moon_beam',
      name: 'Moon Beam',
      icon: '🌙',
      cooldown: 15,
      range: 300,
      effect: (player, game, level) => {
        const state = game.stateManager.currentState;
        if (!state || !player.carriedCoins.length === 0) return;

        const coinsToDeposit = Math.min(player.carriedCoins.length, 1 + level);
        let deposited = 0;

        // Find matching wallets for carried coins
        for (let i = 0; i < coinsToDeposit; i++) {
          const coin = player.carriedCoins[0];
          if (!coin) break;

          // Find nearest matching wallet
          let nearestWallet = null;
          let nearestDistance = Infinity;

          state.wallets.forEach(wallet => {
            if (wallet.canAcceptCoin(coin)) {
              const distance = player.getDistanceTo(wallet);
              if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestWallet = wallet;
              }
            }
          });

          if (nearestWallet) {
            // Create beam effect
            if (state.particleSystem) {
              const beamSteps = 20;
              for (let j = 0; j < beamSteps; j++) {
                const t = j / beamSteps;
                state.particleSystem.particles.push({
                  x: player.getCenterX() + (nearestWallet.getCenterX() - player.getCenterX()) * t,
                  y: player.getCenterY() + (nearestWallet.getCenterY() - player.getCenterY()) * t,
                  vx: 0,
                  vy: -50,
                  life: 1,
                  maxLife: 1,
                  size: 10,
                  color: '#FFD93D',
                  type: 'sparkle'
                });
              }
            }

            // Deposit coin
            const depositedCoin = player.depositCoin(nearestWallet);
            if (depositedCoin && nearestWallet.addCoin(depositedCoin)) {
              deposited++;
              state.awardXP(20);
              game.gameData.coinsDeposited++;
            }
          }
        }

        if (deposited > 0) {
          game.soundManager?.playSound('moonBeam');
          game.gameData.fudLevel = Math.max(0, game.gameData.fudLevel - deposited * 2);
        }
      }
    });
  }

  registerWeapon(config) {
    const weapon = new Weapon(config);
    this.weapons.set(config.id, weapon);
  }

  unlockWeapon(weaponId) {
    const weapon = this.weapons.get(weaponId);
    if (weapon && this.activeWeapons.length < this.maxActiveWeapons) {
      this.activeWeapons.push(weapon);
      return true;
    }
    return false;
  }

  update(deltaTime, player) {
    // Update all active weapons
    this.activeWeapons.forEach(weapon => {
      weapon.update(deltaTime);
    });

    // Update player buffs
    if (player.buffs) {
      Object.entries(player.buffs).forEach(([buffName, buff]) => {
        buff.duration -= deltaTime;
        if (buff.duration <= 0) {
          delete player.buffs[buffName];
        }
      });
    }
  }

  fireWeapon(weaponIndex, player) {
    if (weaponIndex >= 0 && weaponIndex < this.activeWeapons.length) {
      const weapon = this.activeWeapons[weaponIndex];
      return weapon.fire(player, this.game);
    }
    return false;
  }

  render(ctx) {
    // Render weapon UI at bottom of screen
    const { width, height } = this.game;
    const slotSize = 60;
    const slotSpacing = 10;
    const totalWidth = (slotSize + slotSpacing) * this.activeWeapons.length - slotSpacing;
    const startX = (width - totalWidth) / 2;
    const y = height - 80;

    this.activeWeapons.forEach((weapon, index) => {
      const x = startX + index * (slotSize + slotSpacing);

      // Slot background
      ctx.fillStyle = weapon.canFire() ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(x, y, slotSize, slotSize);

      // Slot border
      ctx.strokeStyle = '#FFD93D';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, slotSize, slotSize);

      // Weapon icon
      ctx.font = '32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = weapon.canFire() ? '#fff' : '#666';
      ctx.fillText(weapon.icon, x + slotSize / 2, y + slotSize / 2);

      // Cooldown overlay
      if (!weapon.canFire()) {
        const cooldownHeight = slotSize * weapon.getCooldownPercent();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, y + slotSize - cooldownHeight, slotSize, cooldownHeight);
      }

      // Hotkey
      ctx.font = '12px Arial';
      ctx.fillStyle = '#FFD93D';
      ctx.fillText((index + 1).toString(), x + slotSize - 10, y + 10);
    });
  }
}