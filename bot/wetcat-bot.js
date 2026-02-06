// WETCAT Survivors Telegram Bot
// Drives community engagement, tracks leaderboards, runs giveaways
//
// Setup:
//   1. Create bot via @BotFather on Telegram
//   2. Set TELEGRAM_BOT_TOKEN in .env
//   3. Set TELEGRAM_CHAT_ID to your community group ID
//   4. npm install telegraf node-cron
//   5. node bot/wetcat-bot.js

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const COMMUNITY_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GAME_URL = 'https://wetcat-survivors.vercel.app';
const TOKEN_ADDRESS = '0x9e0ddff1a66efcbb697c7a3c513b3c83ace239aa';
const GIVEAWAY_POOL = 1_000_000; // 1M $WETCAT giveaway pool

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN not set. Get one from @BotFather');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// --- Data Store (JSON file, swap for Redis/DB in production) ---
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {
      leaderboard: [],
      players: {},       // telegramId -> { username, wallet, totalWetcat, gamesPlayed, lastPlayed }
      giveaway: {
        pool: GIVEAWAY_POOL,
        distributed: 0,
        entries: [],       // { telegramId, username, action, amount, timestamp }
        isActive: true
      },
      dailyStats: {
        gamesPlayed: 0,
        newPlayers: 0,
        date: new Date().toISOString().split('T')[0]
      }
    };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let data = loadData();

// Reset daily stats if new day
function checkDailyReset() {
  const today = new Date().toISOString().split('T')[0];
  if (data.dailyStats.date !== today) {
    data.dailyStats = { gamesPlayed: 0, newPlayers: 0, date: today };
    saveData(data);
  }
}

// --- Bot Commands ---

bot.start((ctx) => {
  const username = ctx.from.username || ctx.from.first_name;
  ctx.replyWithHTML(
    `<b>Welcome to WETCAT Survivors, ${username}!</b> 🐱💧\n\n` +
    `You're a librarian defending your library from scammers, FUD dragons, and rug pull monsters - all while earning <b>$WETCAT</b> tokens!\n\n` +
    `<b>Commands:</b>\n` +
    `/play - Launch the game\n` +
    `/leaderboard - Top players\n` +
    `/stats - Your stats\n` +
    `/giveaway - 1M $WETCAT giveaway info\n` +
    `/earn - How to earn $WETCAT\n` +
    `/link [wallet] - Link your wallet\n` +
    `/refer [username] - Refer a friend\n\n` +
    `🎮 <b>Play now and earn your share of 1,000,000 $WETCAT!</b>`,
    Markup.inlineKeyboard([
      [Markup.button.url('🎮 Play Now', GAME_URL)],
      [Markup.button.callback('📊 Leaderboard', 'leaderboard'),
       Markup.button.callback('🎁 Giveaway', 'giveaway')]
    ])
  );

  // Track new player
  const telegramId = ctx.from.id.toString();
  if (!data.players[telegramId]) {
    data.players[telegramId] = {
      username,
      wallet: null,
      totalWetcat: 0,
      gamesPlayed: 0,
      lastPlayed: null,
      referredBy: null,
      referrals: 0,
      joinDate: new Date().toISOString()
    };
    data.dailyStats.newPlayers++;
    saveData(data);
  }
});

bot.command('play', (ctx) => {
  ctx.replyWithHTML(
    `🎮 <b>WETCAT Survivors</b>\n\n` +
    `Defend the library from scammers!\n` +
    `Collect coins, deposit them in wallets, and survive 30 minutes to win!\n\n` +
    `<b>Controls:</b>\n` +
    `WASD/Arrows - Move\n` +
    `Shift - Sprint\n` +
    `1-4 - Weapons\n` +
    `P/Esc - Pause\n\n` +
    `🏆 Submit your score after each game for the leaderboard!`,
    Markup.inlineKeyboard([
      [Markup.button.url('🎮 Play Now', GAME_URL)]
    ])
  );

  // Track play intent
  const telegramId = ctx.from.id.toString();
  if (data.players[telegramId]) {
    data.players[telegramId].gamesPlayed++;
    data.players[telegramId].lastPlayed = new Date().toISOString();
    data.dailyStats.gamesPlayed++;
    saveData(data);
  }
});

bot.command('leaderboard', (ctx) => sendLeaderboard(ctx));
bot.action('leaderboard', (ctx) => { ctx.answerCbQuery(); sendLeaderboard(ctx); });

function sendLeaderboard(ctx) {
  const top10 = data.leaderboard.slice(0, 10);

  if (top10.length === 0) {
    return ctx.replyWithHTML(
      `📊 <b>Leaderboard</b>\n\n` +
      `No scores yet! Be the first to play!\n\n` +
      `Submit your score with /score [wetcat_earned] after each game.`,
      Markup.inlineKeyboard([
        [Markup.button.url('🎮 Play & Submit Score', GAME_URL)]
      ])
    );
  }

  const medals = ['🥇', '🥈', '🥉'];
  let board = `📊 <b>WETCAT Survivors Leaderboard</b>\n\n`;

  top10.forEach((entry, i) => {
    const medal = medals[i] || `${i + 1}.`;
    board += `${medal} <b>${entry.username}</b> - ${entry.wetcatEarned} $WETCAT\n`;
    board += `   Level ${entry.level} | ${formatTime(entry.timeSurvived)} survived\n`;
  });

  board += `\n🏆 Top 3 split bonus rewards from the 1M giveaway pool!`;

  ctx.replyWithHTML(board);
}

bot.command('score', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1) {
    return ctx.reply('Usage: /score [wetcat_earned]\nOptional: /score [wetcat_earned] [level] [time_seconds]');
  }

  const telegramId = ctx.from.id.toString();
  const username = ctx.from.username || ctx.from.first_name;
  const wetcatEarned = parseInt(args[0]) || 0;
  const level = parseInt(args[1]) || 1;
  const timeSurvived = parseInt(args[2]) || 0;

  // Anti-cheat: reasonable limits
  if (wetcatEarned > 5000 || level > 50) {
    return ctx.reply('Those numbers look suspicious... Play fair! 🐱');
  }

  // Update leaderboard
  const entry = {
    telegramId,
    username,
    wetcatEarned,
    level,
    timeSurvived,
    timestamp: new Date().toISOString()
  };

  // Check if player already has an entry, keep best
  const existingIdx = data.leaderboard.findIndex(e => e.telegramId === telegramId);
  if (existingIdx >= 0) {
    if (wetcatEarned > data.leaderboard[existingIdx].wetcatEarned) {
      data.leaderboard[existingIdx] = entry;
    }
  } else {
    data.leaderboard.push(entry);
  }

  // Sort by wetcatEarned descending
  data.leaderboard.sort((a, b) => b.wetcatEarned - a.wetcatEarned);

  // Update player stats
  if (!data.players[telegramId]) {
    data.players[telegramId] = {
      username, wallet: null, totalWetcat: 0, gamesPlayed: 0,
      lastPlayed: null, referredBy: null, referrals: 0, joinDate: new Date().toISOString()
    };
  }
  data.players[telegramId].totalWetcat += wetcatEarned;
  data.players[telegramId].gamesPlayed++;
  data.players[telegramId].lastPlayed = new Date().toISOString();

  saveData(data);

  const rank = data.leaderboard.findIndex(e => e.telegramId === telegramId) + 1;
  ctx.replyWithHTML(
    `✅ <b>Score submitted!</b>\n\n` +
    `$WETCAT Earned: <b>${wetcatEarned}</b>\n` +
    `Level: ${level}\n` +
    `Leaderboard Rank: #${rank} of ${data.leaderboard.length}\n\n` +
    `Keep playing to climb the ranks! 🚀`
  );
});

bot.command('stats', (ctx) => {
  const telegramId = ctx.from.id.toString();
  const player = data.players[telegramId];

  if (!player) {
    return ctx.reply('No stats yet! Play the game first: /play');
  }

  const rank = data.leaderboard.findIndex(e => e.telegramId === telegramId) + 1;
  const bestScore = data.leaderboard.find(e => e.telegramId === telegramId);

  ctx.replyWithHTML(
    `📊 <b>Your Stats</b>\n\n` +
    `Username: ${player.username}\n` +
    `Wallet: ${player.wallet ? shortenAddress(player.wallet) : 'Not linked (/link)'}\n` +
    `Games Played: ${player.gamesPlayed}\n` +
    `Total $WETCAT Earned: ${player.totalWetcat}\n` +
    `Best Score: ${bestScore ? bestScore.wetcatEarned : 0} $WETCAT\n` +
    `Leaderboard Rank: ${rank > 0 ? `#${rank}` : 'Unranked'}\n` +
    `Referrals: ${player.referrals}\n` +
    `Last Played: ${player.lastPlayed ? timeAgo(player.lastPlayed) : 'Never'}`
  );
});

bot.command('link', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1 || !args[0].startsWith('0x') || args[0].length !== 42) {
    return ctx.reply('Usage: /link 0xYourWalletAddress\n\nThis links your Telegram to your wallet for $WETCAT rewards.');
  }

  const telegramId = ctx.from.id.toString();
  if (!data.players[telegramId]) {
    data.players[telegramId] = {
      username: ctx.from.username || ctx.from.first_name,
      wallet: null, totalWetcat: 0, gamesPlayed: 0,
      lastPlayed: null, referredBy: null, referrals: 0, joinDate: new Date().toISOString()
    };
  }

  data.players[telegramId].wallet = args[0].toLowerCase();
  saveData(data);

  ctx.replyWithHTML(
    `✅ <b>Wallet linked!</b>\n\n` +
    `Address: <code>${args[0]}</code>\n\n` +
    `Your $WETCAT rewards will be sent to this address. Play the game to earn! 🎮`
  );
});

bot.command('refer', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1) {
    const username = ctx.from.username || ctx.from.first_name;
    return ctx.replyWithHTML(
      `🤝 <b>Referral Program</b>\n\n` +
      `Share your referral link:\n` +
      `<code>https://t.me/WETCATSurvivorsBot?start=ref_${ctx.from.id}</code>\n\n` +
      `Each referral earns you both <b>500 $WETCAT</b> from the giveaway pool!\n\n` +
      `Your referrals: ${data.players[ctx.from.id.toString()]?.referrals || 0}`
    );
  }
});

// Handle referral deep links
bot.use((ctx, next) => {
  if (ctx.startPayload && ctx.startPayload.startsWith('ref_')) {
    const referrerId = ctx.startPayload.replace('ref_', '');
    const telegramId = ctx.from.id.toString();

    if (referrerId !== telegramId && data.players[referrerId] && !data.players[telegramId]?.referredBy) {
      // Credit referral
      data.players[referrerId].referrals++;

      // Award both parties from giveaway pool
      if (data.giveaway.isActive && data.giveaway.pool - data.giveaway.distributed >= 1000) {
        data.giveaway.distributed += 1000;
        data.players[referrerId].totalWetcat += 500;

        if (!data.players[telegramId]) {
          data.players[telegramId] = {
            username: ctx.from.username || ctx.from.first_name,
            wallet: null, totalWetcat: 500, gamesPlayed: 0,
            lastPlayed: null, referredBy: referrerId, referrals: 0, joinDate: new Date().toISOString()
          };
        } else {
          data.players[telegramId].totalWetcat += 500;
          data.players[telegramId].referredBy = referrerId;
        }

        data.giveaway.entries.push({
          telegramId: referrerId,
          username: data.players[referrerId].username,
          action: 'referral_bonus',
          amount: 500,
          timestamp: new Date().toISOString()
        });
        data.giveaway.entries.push({
          telegramId,
          username: ctx.from.username || ctx.from.first_name,
          action: 'referred_bonus',
          amount: 500,
          timestamp: new Date().toISOString()
        });

        saveData(data);

        // Notify referrer
        bot.telegram.sendMessage(referrerId,
          `🎉 ${ctx.from.username || ctx.from.first_name} joined via your referral! You both earned 500 $WETCAT!`
        ).catch(() => {});
      }
    }
  }
  return next();
});

bot.command('giveaway', (ctx) => sendGiveawayInfo(ctx));
bot.action('giveaway', (ctx) => { ctx.answerCbQuery(); sendGiveawayInfo(ctx); });

function sendGiveawayInfo(ctx) {
  const remaining = data.giveaway.pool - data.giveaway.distributed;
  const percent = ((data.giveaway.distributed / data.giveaway.pool) * 100).toFixed(1);

  ctx.replyWithHTML(
    `🎁 <b>1,000,000 $WETCAT GIVEAWAY</b> 🎁\n\n` +
    `We're giving away <b>1 MILLION $WETCAT</b> tokens to our community!\n\n` +
    `<b>How to earn your share:</b>\n` +
    `🎮 Play the game - earn $WETCAT per session\n` +
    `🤝 Refer friends - 500 $WETCAT each (you + them)\n` +
    `🏆 Top leaderboard - weekly bonus rewards\n` +
    `📣 Share on social media - tag @WETCAT for bonus\n\n` +
    `<b>Pool Status:</b>\n` +
    `Distributed: ${data.giveaway.distributed.toLocaleString()} / ${data.giveaway.pool.toLocaleString()} (${percent}%)\n` +
    `Remaining: ${remaining.toLocaleString()} $WETCAT\n` +
    `Players: ${Object.keys(data.players).length}\n\n` +
    `<b>Don't miss out - pool is limited!</b> 🚀`,
    Markup.inlineKeyboard([
      [Markup.button.url('🎮 Play Now', GAME_URL)],
      [Markup.button.callback('🤝 My Referral Link', 'my_referral')]
    ])
  );
}

bot.action('my_referral', (ctx) => {
  ctx.answerCbQuery();
  ctx.replyWithHTML(
    `🤝 Your referral link:\n\n` +
    `<code>https://t.me/WETCATSurvivorsBot?start=ref_${ctx.from.id}</code>\n\n` +
    `Share this link! Each signup earns you both 500 $WETCAT! 🐱`
  );
});

bot.command('earn', (ctx) => {
  ctx.replyWithHTML(
    `💰 <b>How to Earn $WETCAT</b>\n\n` +
    `<b>In-Game Rewards:</b>\n` +
    `📦 Deposit coins in wallets: 10 $WETCAT each\n` +
    `🔫 Repel scammers: 5 $WETCAT each\n` +
    `⏱ Survival time: 2 $WETCAT per minute\n` +
    `🐉 Defeat bosses: 100-500 $WETCAT bonus\n\n` +
    `<b>Community Rewards:</b>\n` +
    `🤝 Refer a friend: 500 $WETCAT (from giveaway pool)\n` +
    `🏆 Weekly #1 leaderboard: 10,000 $WETCAT\n` +
    `🥈 Weekly #2: 5,000 $WETCAT\n` +
    `🥉 Weekly #3: 2,500 $WETCAT\n\n` +
    `<b>Multipliers:</b>\n` +
    `🌍 World ID verified: 2x all rewards\n` +
    `💎 Diamond Hands achievement: permanent 1.5x\n\n` +
    `Token: <code>${TOKEN_ADDRESS}</code>\n` +
    `Chain: World Chain (ID: 480)`,
    Markup.inlineKeyboard([
      [Markup.button.url('🎮 Start Earning', GAME_URL)]
    ])
  );
});

// --- Scheduled Community Messages ---

if (COMMUNITY_CHAT_ID) {
  // Daily morning hype (9 AM UTC)
  cron.schedule('0 9 * * *', () => {
    checkDailyReset();
    const messages = [
      `🌅 <b>GM WETCAT fam!</b>\n\nNew day, new chance to climb the leaderboard! 🎮\n\nYesterday: ${data.dailyStats.gamesPlayed} games played, ${data.dailyStats.newPlayers} new players\n\n${formatGiveawayRemaining()}\n\nWho's grinding today? 💪`,
      `☀️ <b>Rise and grind, WETCATs!</b>\n\nThe library needs defending and those scammers won't repel themselves! 🐱\n\n🏆 Current #1: ${data.leaderboard[0]?.username || 'Unclaimed!'}\n\nCan you beat them? ${GAME_URL}`,
      `🎮 <b>Daily Challenge:</b>\n\nCan you survive 30 minutes and defeat the FUD Dragon? 🐉\n\nFirst to post a screenshot gets 1,000 bonus $WETCAT from the pool!\n\n${formatGiveawayRemaining()}`,
      `💧 <b>Stay Soaked, Stay Stacking!</b>\n\nEvery game session earns you $WETCAT tokens. The more you play, the more you earn!\n\n🤝 Don't forget to refer friends - 500 $WETCAT each!\n\nPlay now: ${GAME_URL}`
    ];

    const msg = messages[Math.floor(Math.random() * messages.length)];
    bot.telegram.sendMessage(COMMUNITY_CHAT_ID, msg, { parse_mode: 'HTML' }).catch(console.error);
  });

  // Afternoon engagement (3 PM UTC)
  cron.schedule('0 15 * * *', () => {
    const messages = [
      `🔥 <b>Afternoon Check-in!</b>\n\nHow's everyone's runs going today?\n\nDrop your best score in chat! 📊\n\n/leaderboard to see the rankings`,
      `⚡ <b>Pro Tip:</b>\n\nUse the Diamond Hand Slap (key 2) at level 3 - it knocks scammers back AND pulls nearby coins to you at higher levels! 💎\n\nWhat's your favorite weapon? 🎮`,
      `🐉 <b>Boss Guide:</b>\n\n• Wave 5: FUD Dragon - dodge fire breath, watch for minion spawns\n• Wave 10: Rug Pull Monster - stay away from the vacuum!\n• Wave 15: Whale Manipulator - avoid the pump & dump shockwave\n\nWhich boss is hardest? 🤔`,
      `🏆 <b>Leaderboard Update!</b>\n\n${getTopThreeText()}\n\nThink you can take the top spot? 💪\n${GAME_URL}`
    ];

    const msg = messages[Math.floor(Math.random() * messages.length)];
    bot.telegram.sendMessage(COMMUNITY_CHAT_ID, msg, { parse_mode: 'HTML' }).catch(console.error);
  });

  // Evening reminder (9 PM UTC)
  cron.schedule('0 21 * * *', () => {
    const messages = [
      `🌙 <b>Evening Session!</b>\n\nPerfect time for a few runs before bed. 🎮\n\nRemember: 2 $WETCAT per minute survived!\n\n${formatGiveawayRemaining()}`,
      `🎯 <b>Don't forget to submit your scores!</b>\n\nUse /score [amount] to get on the leaderboard and qualify for weekly bonus rewards!\n\n🏆 Top 3 get extra $WETCAT every week!`
    ];

    const msg = messages[Math.floor(Math.random() * messages.length)];
    bot.telegram.sendMessage(COMMUNITY_CHAT_ID, msg, { parse_mode: 'HTML' }).catch(console.error);
  });

  // Weekly leaderboard reset & rewards (Sunday midnight UTC)
  cron.schedule('0 0 * * 0', () => {
    if (data.leaderboard.length === 0) return;

    const top3 = data.leaderboard.slice(0, 3);
    const rewards = [10000, 5000, 2500];

    let announcement = `🏆 <b>WEEKLY LEADERBOARD RESULTS!</b> 🏆\n\n`;

    top3.forEach((entry, i) => {
      const medal = ['🥇', '🥈', '🥉'][i];
      announcement += `${medal} <b>${entry.username}</b> - ${entry.wetcatEarned} $WETCAT earned\n`;
      announcement += `   🎁 Bonus reward: ${rewards[i].toLocaleString()} $WETCAT!\n\n`;

      // Credit bonus from giveaway pool
      if (data.giveaway.isActive && data.giveaway.pool - data.giveaway.distributed >= rewards[i]) {
        data.giveaway.distributed += rewards[i];
        if (data.players[entry.telegramId]) {
          data.players[entry.telegramId].totalWetcat += rewards[i];
        }
        data.giveaway.entries.push({
          telegramId: entry.telegramId,
          username: entry.username,
          action: `weekly_rank_${i + 1}`,
          amount: rewards[i],
          timestamp: new Date().toISOString()
        });
      }
    });

    announcement += `Total players this week: ${data.leaderboard.length}\n\n`;
    announcement += formatGiveawayRemaining() + '\n\n';
    announcement += `<b>New week starts NOW! Leaderboard reset! 🚀</b>\n\nPlay: ${GAME_URL}`;

    bot.telegram.sendMessage(COMMUNITY_CHAT_ID, announcement, { parse_mode: 'HTML' }).catch(console.error);

    // Reset weekly leaderboard (keep all-time in player stats)
    data.leaderboard = [];
    saveData(data);
  });
}

// --- Helper Functions ---

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function shortenAddress(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Not linked';
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatGiveawayRemaining() {
  const remaining = data.giveaway.pool - data.giveaway.distributed;
  return `🎁 Giveaway pool: ${remaining.toLocaleString()} / ${data.giveaway.pool.toLocaleString()} $WETCAT remaining`;
}

function getTopThreeText() {
  const top3 = data.leaderboard.slice(0, 3);
  if (top3.length === 0) return 'No scores yet - be the first!';

  const medals = ['🥇', '🥈', '🥉'];
  return top3.map((e, i) => `${medals[i]} ${e.username}: ${e.wetcatEarned} $WETCAT`).join('\n');
}

// --- Error Handling ---

bot.catch((err) => {
  console.error('Bot error:', err);
});

// --- Launch ---

bot.launch().then(() => {
  console.log('🐱 WETCAT Survivors Bot is running!');
  console.log(`Game URL: ${GAME_URL}`);
  console.log(`Community chat: ${COMMUNITY_CHAT_ID || 'Not set (scheduled messages disabled)'}`);
  console.log(`Giveaway pool: ${GIVEAWAY_POOL.toLocaleString()} $WETCAT`);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
