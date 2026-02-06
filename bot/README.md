# WETCAT Survivors Telegram Bot

Community engagement bot for the $WETCAT Survivors game.

## Features

- **Leaderboard tracking** - Players submit scores, compete weekly
- **1M $WETCAT Giveaway** - Pool distributed via gameplay, referrals, and weekly rewards
- **Referral system** - 500 $WETCAT for both referrer and referred
- **Scheduled community messages** - 3x daily engagement posts (9AM, 3PM, 9PM UTC)
- **Weekly rewards** - Top 3 leaderboard get 10K/5K/2.5K $WETCAT bonus
- **Wallet linking** - Connect Telegram ID to World Chain wallet for rewards

## Setup

### 1. Create the bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow prompts
3. Name it `WETCAT Survivors Bot` (or similar)
4. Copy the bot token

### 2. Get your community chat ID

1. Add the bot to your WETCAT community group
2. Send a message in the group
3. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Find the `chat.id` in the response (negative number for groups)

### 3. Configure environment

```bash
export TELEGRAM_BOT_TOKEN="your-bot-token-here"
export TELEGRAM_CHAT_ID="-1001234567890"  # Your community group ID
```

### 4. Install and run

```bash
cd bot/
npm install telegraf node-cron
node wetcat-bot.js
```

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message + onboarding |
| `/play` | Game link + controls guide |
| `/score [amount]` | Submit game score to leaderboard |
| `/leaderboard` | View top 10 players |
| `/stats` | Your personal stats |
| `/giveaway` | 1M giveaway pool status |
| `/earn` | How to earn $WETCAT |
| `/link [wallet]` | Link wallet for on-chain rewards |
| `/refer` | Get your referral link |

## Giveaway Distribution

The 1,000,000 $WETCAT pool is distributed through:

- **Referrals**: 500 $WETCAT each (referrer + referred) = 1,000 per referral
- **Weekly leaderboard**: #1 gets 10,000, #2 gets 5,000, #3 gets 2,500
- **Community challenges**: Ad-hoc rewards for engagement

## Production Deployment

For production, consider:
- Replace JSON file storage with Redis or PostgreSQL
- Deploy on a VPS or use Vercel serverless functions
- Set up webhook mode instead of polling for better performance
- Add rate limiting to prevent command spam
- Connect to the game server API for verified score submission
