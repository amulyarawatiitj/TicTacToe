# 🎮 Multiplayer Tic-Tac-Toe — LILA Assignment

A production-ready multiplayer Tic-Tac-Toe game with **server-authoritative architecture** built on [Nakama](https://heroiclabs.com/nakama/) (open-source game server).

## ✨ Features

| Feature | Status |
|---|---|
| Server-authoritative game logic | ✅ |
| Real-time moves via WebSocket | ✅ |
| Automatic matchmaking | ✅ |
| Graceful disconnect / forfeit | ✅ |
| Timer-based game mode (30s/turn) | ✅ |
| Auto-forfeit on timeout | ✅ |
| Global leaderboard (W/L/D + score) | ✅ |
| Concurrent game sessions | ✅ (Nakama handles natively) |
| Mobile-optimised responsive UI | ✅ |
| Netlify deployment | ✅ |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│  LoginPage → LobbyPage → GamePage → ResultPage              │
│  @heroiclabs/nakama-js  ←→  WebSocket                       │
└─────────────────────────┬────────────────────────────────────┘
                          │  HTTP (REST RPC) + WebSocket
┌─────────────────────────▼────────────────────────────────────┐
│                    NAKAMA SERVER (Go)                         │
│                                                              │
│  ┌─────────────────────────────────────┐                     │
│  │  TypeScript Runtime Module           │                     │
│  │  tictactoe.ts                        │                     │
│  │                                      │                     │
│  │  matchInit        – create state     │                     │
│  │  matchJoinAttempt – validate join    │                     │
│  │  matchJoin        – 2-player start   │                     │
│  │  matchLoop        – moves + timer    │                     │
│  │  matchLeave       – forfeit logic    │                     │
│  │                                      │                     │
│  │  RPC: find_match      (matchmaking)  │                     │
│  │  RPC: get_leaderboard               │                     │
│  └─────────────────────────────────────┘                     │
│                                                              │
└─────────────────────────┬────────────────────────────────────┘
                          │  SQL
┌─────────────────────────▼────────────────────────────────────┐
│               CockroachDB (persistent storage)                │
│   users · leaderboards · match history                       │
└──────────────────────────────────────────────────────────────┘
```

### Message Flow (Op Codes)

| Code | Direction | Description |
|------|-----------|-------------|
| `1` MOVE | Client → Server | Player places mark at cell index |
| `2` STATE | Server → Client | Full game state broadcast after each move |
| `3` GAME_OVER | Server → Client | Winner, reason, final board |
| `4` REJECTED | Server → Client | Invalid move or not your turn |
| `5` TIMER_TICK | Server → Client | Countdown seconds remaining |

### Design Decisions

- **Server-authoritative**: All game logic runs in `matchLoop` on Nakama. The client only sends move intentions; the server validates and broadcasts the canonical state.
- **TypeScript modules**: Compiled with esbuild to ES5 JS, placed in Nakama's `/data/modules` folder.
- **Matchmaking via RPC**: `find_match` RPC lists open matches first (capacity < 2). If none exist it creates a new one — simple and scales well.
- **Timer in matchLoop**: Since `TICK_RATE = 1`, each loop tick = 1 second. The server counts ticks since last move; when it reaches 30 the current player forfeits automatically.
- **Leaderboard scoring**: Win = +200 pts, Draw = +50 pts, Loss = +0 pts. Scores accumulate using Nakama's `leaderboardRecordWrite` with `operator=incr`.

---

## 📁 Project Structure

```
tictactoe-lila/
├── frontend/                    # React app → deploy to Netlify
│   ├── src/
│   │   ├── App.jsx              # Main state machine (LOGIN/LOBBY/GAME/RESULT)
│   │   ├── config.js            # Nakama connection config (reads env vars)
│   │   ├── hooks/
│   │   │   └── useNakama.js     # Nakama client hook (auth, socket, RPC)
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx    # Nickname entry
│   │   │   ├── LobbyPage.jsx    # Matchmaking spinner
│   │   │   ├── GamePage.jsx     # Live match UI
│   │   │   └── ResultPage.jsx   # Win/lose/draw + leaderboard
│   │   └── components/
│   │       ├── Board.jsx        # 3×3 grid
│   │       ├── TimerBar.jsx     # Countdown bar
│   │       └── Leaderboard.jsx  # Top-player table
│   ├── .env.example
│   ├── vite.config.js
│   └── package.json
│
├── nakama/                      # Server module
│   ├── modules/
│   │   └── tictactoe.ts         # Full match handler + RPCs
│   ├── package.json             # esbuild build script
│   └── tsconfig.json
│
├── docker-compose.yml           # Local dev: Nakama + CockroachDB
├── netlify.toml                 # Netlify build config
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

### 1 — Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/tictactoe-lila.git
cd tictactoe-lila

# Install frontend deps
cd frontend && npm install && cd ..

# Install nakama module build deps
cd nakama && npm install && cd ..
```

### 2 — Build the Nakama module

```bash
cd nakama
npm run build
# ✓ Produces nakama/build/tictactoe.js
cd ..
```

### 3 — Start Nakama + CockroachDB

```bash
docker compose up -d
```

Wait ~20 seconds for Nakama to finish migrations, then verify:

```bash
curl http://localhost:7350/healthcheck
# → {"status":"ok"}
```

Nakama Console (admin UI): http://localhost:7351  
Username: `admin` | Password: `password`

### 4 — Start the frontend

```bash
cd frontend
cp .env.example .env.local    # uses 127.0.0.1:7350 by default
npm run dev
# → http://localhost:3000
```

Open two browser tabs (or two different browsers) at `http://localhost:3000` to test multiplayer.

---

## ☁️ Deployment

### Deploy Nakama to a Cloud Provider

The recommended path is **DigitalOcean App Platform** or any VM with Docker.

#### Option A — DigitalOcean Droplet (simplest)

```bash
# 1. SSH into your droplet
ssh root@YOUR_DROPLET_IP

# 2. Install Docker
curl -fsSL https://get.docker.com | sh

# 3. Clone the repo
git clone https://github.com/YOUR_USERNAME/tictactoe-lila.git
cd tictactoe-lila

# 4. Build the module
cd nakama && npm install && npm run build && cd ..

# 5. Start services
docker compose up -d

# 6. Allow ports in DigitalOcean firewall:
#    TCP 7349 (WebSocket), 7350 (HTTP API), 7351 (Console)
```

Your Nakama endpoint will be: `http://YOUR_DROPLET_IP:7350`

#### Option B — Railway / Render

Railway has a one-click Nakama template. After deploying:
- Set the `NAKAMA_RUNTIME_PATH` env var to your modules directory
- Upload the compiled `tictactoe.js` to the modules folder

#### For HTTPS/WSS (recommended for production)

Put Nginx in front of Nakama and terminate SSL there. Or use a service like Railway that provides automatic TLS.

---

### Deploy Frontend to Netlify

#### Via GitHub (recommended)

1. Push this repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
3. Select your repository
4. Netlify auto-detects `netlify.toml` — build settings are pre-configured
5. Go to **Site settings → Environment variables** and add:

| Variable | Value |
|---|---|
| `VITE_NAKAMA_HOST` | `your-nakama-server.com` |
| `VITE_NAKAMA_PORT` | `7350` (or `443` with SSL) |
| `VITE_NAKAMA_KEY` | `defaultkey` (change in production!) |
| `VITE_NAKAMA_SSL` | `false` (or `true` with SSL) |

6. Click **Deploy site** — Netlify builds and publishes automatically

Every `git push` to `main` will trigger a new deployment.

---

## 🧪 Testing Multiplayer

### Automated: Two-tab test

1. Open your deployed URL in **Tab 1** → enter nickname "Player1" → click Play
2. Open the same URL in **Tab 2** (or incognito) → enter "Player2" → click Play
3. Both should land in the game within seconds
4. Make moves alternately — the board updates in real time on both tabs
5. Let the timer run out to test the auto-forfeit
6. Check the leaderboard after the game

### Nakama Console inspection

Visit `http://YOUR_SERVER:7351` (admin / password):
- **Matches** tab — see live matches, their state JSON, connected presences
- **Leaderboards** tab — verify scores are recorded
- **Accounts** tab — see created player accounts

### cURL RPC test

```bash
# Authenticate
curl -X POST http://localhost:7350/v2/account/authenticate/device \
  -H "Authorization: Basic $(echo -n 'defaultkey:' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"id":"test-device-001","create":true,"username":"TestPlayer"}'

# Copy the token from the response, then call find_match RPC
curl http://localhost:7350/v2/rpc/find_match \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔧 Configuration Reference

### Nakama module constants (`nakama/modules/tictactoe.ts`)

| Constant | Default | Description |
|---|---|---|
| `TURN_LIMIT` | `30` | Seconds per turn before auto-forfeit |
| `TICK_RATE` | `1` | Match loop ticks per second |
| `LEADERBOARD` | `"global_lb"` | Leaderboard ID |

### Frontend env vars (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `VITE_NAKAMA_HOST` | Nakama server hostname/IP |
| `VITE_NAKAMA_PORT` | Nakama HTTP port (7350 or 443) |
| `VITE_NAKAMA_KEY` | Nakama server key |
| `VITE_NAKAMA_SSL` | `true` to use HTTPS/WSS |

---

## 📡 API / Server Details

### Nakama Endpoints Used

| Endpoint | Purpose |
|---|---|
| `POST /v2/account/authenticate/device` | Player authentication |
| `GET /v2/rpc/find_match` | Find open match or create one |
| `GET /v2/rpc/get_leaderboard` | Fetch top 20 players |
| `WS /ws` | Real-time match socket |

### Match State Shape (broadcast on op code `2`)

```json
{
  "board": ["X","","O","","X","","","",""],
  "turnIndex": 1,
  "moveCount": 3,
  "winner": null,
  "phase": "playing",
  "timerSecs": 22,
  "players": [
    { "userId": "abc", "username": "Alice", "symbol": "X" },
    { "userId": "def", "username": "Bob",   "symbol": "O" }
  ]
}
```

### Game Over Payload (op code `3`)

```json
{
  "winner": "abc",          // userId, or "draw", or null
  "reason": "normal",       // "normal" | "timeout" | "opponent_left"
  "timedOut": "def",        // userId who timed out (if reason=timeout)
  "board": ["X","O","X"...]
}
```

---

## 🛠️ Rebuilding After Changes

```bash
# After editing nakama/modules/tictactoe.ts:
cd nakama && npm run build && cd ..
docker compose restart nakama

# After editing frontend:
# Vite hot-reloads automatically in dev mode.
# For production, just git push — Netlify rebuilds.
```
