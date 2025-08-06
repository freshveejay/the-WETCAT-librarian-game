# WETCAT Librarian API Documentation

This document provides detailed information about the WETCAT Librarian game server API endpoints, authentication, and integration guidelines.

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Game Session Management](#game-session-management)
  - [Rewards System](#rewards-system)
  - [World ID Verification](#world-id-verification)
  - [Statistics](#statistics)
- [WebSocket Events](#websocket-events)
- [Rate Limiting](#rate-limiting)
- [Security](#security)

## Overview

The WETCAT Librarian API provides endpoints for managing game sessions, claiming rewards, and verifying player identity through World ID. All game progress is validated server-side to prevent cheating.

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Tokens are issued when starting a game session and must be included in subsequent requests.

### Token Format
```
Authorization: Bearer <jwt_token>
```

### Token Payload
```json
{
  "sessionId": "0x...",
  "playerAddress": "0x...",
  "iat": 1234567890,
  "exp": 1234571490
}
```

Tokens expire after 2 hours.

## Base URL

```
Production: https://api.wetcatgame.com
Staging: https://api-staging.wetcatgame.com
Local: http://localhost:3002
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional information
}
```

### Common Error Codes
- `INVALID_ADDRESS`: Invalid Ethereum address format
- `SESSION_NOT_FOUND`: Game session doesn't exist
- `TOKEN_EXPIRED`: JWT token has expired
- `INVALID_TOKEN`: JWT token is invalid
- `CHEAT_DETECTED`: Abnormal game behavior detected
- `COOLDOWN_ACTIVE`: Action is on cooldown
- `INSUFFICIENT_PLAY_TIME`: Minimum play time not met

## Endpoints

### Game Session Management

#### Start Game Session
```http
POST /api/game/start
```

Creates a new game session for a player.

**Request Body:**
```json
{
  "playerAddress": "0x1234567890123456789012345678901234567890",
  "worldIdHash": "0x..." // Optional: World ID nullifier hash
}
```

**Response:**
```json
{
  "sessionId": "0xf47ac10b58cc4372...",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": 1234571490,
  "rewardMultiplier": 1.0
}
```

**Error Responses:**
- `400 Bad Request`: Invalid address format
- `429 Too Many Requests`: Rate limit exceeded

---

#### Update Game Progress
```http
POST /api/game/update
```

Updates the current game session with progress data. Called periodically during gameplay.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "score": 1500,
  "coinsCollected": 75,
  "booksShelved": 60,
  "kidsRepelled": 25,
  "chaosLevel": 45,
  "playerLevel": 3,
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "success": true,
  "warnings": [] // Optional: suspicious activity warnings
}
```

**Anti-Cheat Validation:**
- Score cannot exceed reasonable limits based on time played
- Progress must be incremental (no backwards movement)
- Timestamp must be within acceptable range

**Error Responses:**
- `400 Bad Request`: Invalid game data or cheat detected
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: Session not found

---

#### End Game Session
```http
POST /api/game/end
```

Ends the current game session and calculates final rewards.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "reason": "completed" // "completed", "game_over", "quit"
}
```

**Response:**
```json
{
  "finalScore": 2500,
  "timePlayed": 1820, // seconds
  "eligibleForDailyReward": true,
  "achievements": ["first_win", "chaos_master"],
  "statistics": {
    "totalCoinsCollected": 120,
    "totalBooksShelved": 95,
    "totalKidsRepelled": 45,
    "averageChaosLevel": 35.5
  }
}
```

---

### Rewards System

#### Claim Daily Reward
```http
POST /api/game/claim-daily
```

Claims daily reward after completing a 30-minute game session.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "signature": "0x..." // Optional: signature for on-chain claiming
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "rewardAmount": "100000000000000000000", // 100 WETCAT in wei
  "nextClaimTime": 1234654290,
  "bonusMultiplier": 2.0 // Based on World ID verification
}
```

**Validation:**
- Minimum 30 minutes play time required
- 24-hour cooldown between claims
- Valid game completion required

**Error Responses:**
- `400 Bad Request`: Requirements not met
- `403 Forbidden`: Daily reward on cooldown

---

#### Claim Achievement
```http
POST /api/game/claim-achievement
```

Claims a one-time achievement reward.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "achievementId": "chaos_master",
  "signature": "0x..." // Optional: signature for on-chain claiming
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "rewardAmount": "300000000000000000000", // 300 WETCAT
  "achievement": {
    "id": "chaos_master",
    "name": "Chaos Master",
    "description": "Keep chaos below 20% for entire game",
    "rarity": "epic"
  }
}
```

**Available Achievements:**
```json
{
  "first_moon": {
    "requirement": "Complete 30-minute session",
    "reward": 100,
    "rarity": "common"
  },
  "whale_alert": {
    "requirement": "Collect 1000 coins in one session",
    "reward": 300,
    "rarity": "rare"
  },
  "scammer_slayer": {
    "requirement": "Repel 100 kids in one session",
    "reward": 150,
    "rarity": "uncommon"
  },
  "chaos_master": {
    "requirement": "Keep chaos below 20% for 30 minutes",
    "reward": 500,
    "rarity": "epic"
  },
  "speed_demon": {
    "requirement": "Shelf 500 books in under 10 minutes",
    "reward": 200,
    "rarity": "rare"
  }
}
```

---

### World ID Verification

#### Verify World ID Proof
```http
POST /api/verify-worldid
```

Verifies a World ID proof for enhanced rewards.

**Request Body:**
```json
{
  "proof": "0x...",
  "merkle_root": "0x...",
  "nullifier_hash": "0x...",
  "verification_level": "orb", // "orb" or "device"
  "action": "play_wetcat_game",
  "signal": "wetcat_game_session"
}
```

**Response:**
```json
{
  "verified": true,
  "nullifierHash": "0x...",
  "rewardMultiplier": 2.0,
  "benefits": [
    "2x daily rewards",
    "Exclusive achievements",
    "Priority support"
  ]
}
```

**Verification Levels:**
- `orb`: 2x reward multiplier, access to all features
- `device`: 1.5x reward multiplier, limited features

**Error Responses:**
- `400 Bad Request`: Invalid proof format
- `403 Forbidden`: Proof already used or invalid

---

### Statistics

#### Get Player Statistics
```http
GET /api/stats/player/:address
```

Retrieves lifetime statistics for a player.

**Response:**
```json
{
  "address": "0x...",
  "statistics": {
    "totalGamesPlayed": 142,
    "totalTimePlayed": 256800, // seconds
    "totalScore": 354200,
    "totalRewardsClaimed": "5420000000000000000000", // wei
    "averageGameDuration": 1808,
    "bestScore": 4250,
    "achievements": ["first_moon", "whale_alert"],
    "currentStreak": 7,
    "longestStreak": 15,
    "worldIdVerified": true,
    "verificationLevel": "orb"
  },
  "recentGames": [
    {
      "timestamp": 1234567890,
      "score": 2100,
      "duration": 1825,
      "rewarded": true
    }
  ]
}
```

---

#### Get Global Leaderboard
```http
GET /api/stats/leaderboard
```

Retrieves the global leaderboard.

**Query Parameters:**
- `period`: "daily", "weekly", "monthly", "all-time" (default: "daily")
- `limit`: Number of results (default: 100, max: 1000)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "period": "daily",
  "lastUpdated": 1234567890,
  "totalPlayers": 5420,
  "leaderboard": [
    {
      "rank": 1,
      "address": "0x...",
      "ensName": "wetcat.eth", // Optional
      "score": 8420,
      "gamesPlayed": 3,
      "worldIdVerified": true
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## WebSocket Events

For real-time features, connect to the WebSocket endpoint:

```javascript
const ws = new WebSocket('wss://api.wetcatgame.com/ws');
```

### Events

#### Player Connected
```json
{
  "type": "player_connected",
  "data": {
    "playersOnline": 342,
    "activeGames": 128
  }
}
```

#### Leaderboard Update
```json
{
  "type": "leaderboard_update",
  "data": {
    "address": "0x...",
    "newRank": 42,
    "score": 3200
  }
}
```

#### Achievement Unlocked
```json
{
  "type": "achievement_unlocked",
  "data": {
    "player": "0x...",
    "achievement": "chaos_master",
    "rarity": "epic"
  }
}
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Game Start**: 10 requests per hour per IP
- **Game Update**: 60 requests per minute per token
- **Reward Claims**: 5 requests per hour per address
- **Statistics**: 100 requests per minute per IP

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1234567890
```

## Security

### Best Practices

1. **Always validate addresses**: Use ethers.js `isAddress()` function
2. **Verify signatures**: For on-chain transactions, verify signatures server-side
3. **Use HTTPS**: Never send sensitive data over unencrypted connections
4. **Validate timestamps**: Reject requests with timestamps too far from server time
5. **Monitor for anomalies**: Log suspicious patterns for review

### Anti-Cheat Measures

The API implements several anti-cheat mechanisms:

- **Score validation**: Scores must be achievable within time constraints
- **Progress tracking**: All progress must be incremental
- **Time validation**: Client timestamps must match server expectations
- **Pattern detection**: Unusual patterns trigger manual review
- **Proof of play**: Random challenges during gameplay

### Reporting Issues

To report security vulnerabilities:
- Email: security@wetcatgame.com
- Use responsible disclosure
- Do not exploit vulnerabilities

---

## Changelog

### v1.0.0 (Current)
- Initial API release
- Basic game session management
- World ID integration
- Daily rewards system
- Achievement system
- Leaderboard functionality

### Planned Features
- Multiplayer sessions
- Tournament mode
- NFT achievements
- Social features
- Advanced analytics

---

For additional support or questions, contact: dev@wetcatgame.com