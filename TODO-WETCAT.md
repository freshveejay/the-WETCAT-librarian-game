# WETCAT Survivors - TODO / Next Session Checklist

**Last Updated**: Feb 6, 2026
**Live URL**: https://wetcat-survivors.vercel.app
**Repo**: github.com/freshveejay/the-WETCAT-librarian-game

---

## PRIORITY 1: Telegram Bot Launch

- [ ] Create bot via @BotFather on Telegram (name: `WETCAT Survivors Bot`)
- [ ] Get bot token and community group chat ID
- [ ] Deploy bot to hosting (Railway/Render/VPS)
  ```bash
  cd bot/
  export TELEGRAM_BOT_TOKEN="token"
  export TELEGRAM_CHAT_ID="-100xxx"
  npm install telegraf node-cron
  node wetcat-bot.js
  ```
- [ ] Test all commands: /start, /play, /score, /leaderboard, /giveaway, /refer
- [ ] Announce bot launch to community
- [ ] Set bot description & profile picture in @BotFather

## PRIORITY 2: 1M $WETCAT Giveaway Campaign

- [ ] Announce giveaway on Twitter/X with game link
- [ ] Create Telegram announcement post with referral mechanics
- [ ] Set up tracking spreadsheet for giveaway distribution
- [ ] Decide on giveaway timeline (2 weeks? 1 month?)
- [ ] Coordinate with $WETCAT token holders for the 1M coin allocation
- [ ] First weekly leaderboard reward distribution

## PRIORITY 3: Smart Contract Deployment

- [ ] Deploy GameRewards contract to World Chain (chainId 480)
- [ ] Update `GAME_REWARDS_ADDRESS` from `0x0000...` to real address
- [ ] Wire up game server (server/gameServer.js) for on-chain reward claiming
- [ ] Test daily reward claiming flow end-to-end
- [ ] Test achievement claiming (First Moon, Diamond Hands, Whale Alert, etc.)

## PRIORITY 4: Game Server Deployment

- [ ] Deploy `server/gameServer.js` to hosting (Vercel serverless or Railway)
- [ ] Set up JWT secret, RPC URL, private key env vars
- [ ] Add score submission from game client to server (currently client-only)
- [ ] Connect game server to Telegram bot for verified score submission
- [ ] Add Redis for production session storage (currently uses Map)

## PRIORITY 5: Game Polish

- [ ] Add boss attack sound effects (SoundManager exists, sounds missing)
- [ ] Add more game music tracks (4 wetcat-songs exist, only 1 used)
- [ ] Fix boss audio: fire breath whoosh, vacuum hum, tsunami wave, market crash
- [ ] Add visual indicator when HODL Shield is active on player
- [ ] Test all 3 bosses thoroughly (FUDDragon wave 5, RugPullMonster wave 10, WhaleManipulator wave 15)
- [ ] Balance check: is 30-minute survival achievable?

## PRIORITY 6: ORKY Integration

- [ ] Fix MetaSpark Engine database connection on 192.168.1.115
- [ ] Add task management endpoints to MetaSpark API (or standalone ORKY service)
- [ ] Set up Claude Code hooks to auto-log to ORKY on commit/deploy
- [ ] Consider ORKY MCP server for native Claude integration

---

## Completed (Sessions 1-2, Feb 5-6 2026)

### Session 1 - Critical Fixes
- [x] Fixed Vite base path (was `/wetcat-librarian/`, now `/`)
- [x] Fixed player collision detection
- [x] Removed debug overlays blocking gameplay
- [x] Fixed audio loading paths
- [x] Deployed to Vercel production

### Session 2 - Gameplay Evolution
- [x] Added FUD decay above 50% to prevent softlock
- [x] Fixed weapon unlocking at level milestones (3/5/7)
- [x] Fixed boss damage - all 4 weapons now work against bosses
- [x] Added scammersRepelled stat tracking
- [x] Added $WETCAT earnings formula + HUD display
- [x] Scaled spawn difficulty with game progression
- [x] Fixed FUDDragon minion summon spam
- [x] Improved screen shake (exponential decay, stronger feel)
- [x] Removed 11 debug console.logs

### Session 3 - Boss Stability + Telegram
- [x] Boss setTimeout cleanup system (no ghost attacks on dead bosses)
- [x] RugPullMonster coin orphaning fix (releaseStoredCoins)
- [x] All 3 bosses migrated to safe scheduleTimeout
- [x] Moon Beam + HODL Shield now damage bosses
- [x] Added spawnScammer/spawnCoin methods (boss abilities work)
- [x] On-screen notification system (was console.log only)
- [x] Telegram bot with leaderboard, giveaway, referrals, scheduled messages
- [x] Game over "Share Score" button for Telegram sharing
- [x] Updated .env.example with Telegram config

---

## Architecture Notes

```
Game (Vite + Canvas)     →  wetcat-survivors.vercel.app
Game Server (Express)    →  NOT DEPLOYED (server/gameServer.js)
Telegram Bot (Telegraf)  →  NOT DEPLOYED (bot/wetcat-bot.js)
Smart Contract           →  NOT DEPLOYED (contracts/)
$WETCAT Token            →  0x9e0ddff1a66efcbb697c7a3c513b3c83ace239aa (World Chain)
MetaSpark Engine         →  192.168.1.115 (port 80 frontend, /api/ backend)
ORKY                     →  No dedicated service yet (DB down on MetaSpark)
```
