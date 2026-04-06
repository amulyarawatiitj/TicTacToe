# Multiplayer Tic-Tac-Toe Game

A production-ready multiplayer Tic-Tac-Toe game built with React frontend and Nakama backend, featuring server-authoritative game logic, real-time matchmaking, and a leaderboard system.

## 🎮 Features

### Core Features
- ✅ **Server-Authoritative Game Logic** - All moves validated on the server
- ✅ **Real-Time Multiplayer** - Live game updates via WebSocket
- ✅ **Matchmaking System** - Create rooms or join available games
- ✅ **Device Authentication** - Simple device-based login system
- ✅ **Responsive UI** - Optimized for desktop and mobile

### Advanced Features
- ⏱️ **Timed Mode** - 30 seconds per turn with automatic forfeit
- 🏆 **Global Leaderboard** - Track wins, losses, and win streaks
- 🎯 **Concurrent Game Support** - Multiple simultaneous matches
- 💾 **Persistent Storage** - Player stats and match history

## 🏗️ Architecture

```
frontend/
├── src/
│   ├── components/
│   │   ├── Login.tsx          # Authentication screen
│   │   ├── MainMenu.tsx       # Game lobby
│   │   ├── GameRoom.tsx       # Game board and play area
│   │   └── Leaderboard.tsx    # Rankings display
│   ├── App.tsx                # Main app component
│   ├── index.tsx              # React entry point
│   └── *.css                  # Styling
│
backend/
├── src/
│   └── index.ts               # Nakama modules and RPC handlers
├── nakama.yml                 # Nakama configuration
├── Dockerfile                 # Container build
└── package.json               # Dependencies

docker-compose.yml             # Local development setup
vercel.json                    # Frontend deployment config
railway.toml                   # Backend deployment config
```

## 🚀 Quick Start

### Local Development

#### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- npm or yarn

#### Setup & Run

```bash
# Clone the repository
git clone <repo-url>
cd TicTacToe

# Start backend and database with Docker Compose
docker-compose up -d

# Wait for services to be healthy (30 seconds)
# Check: docker-compose ps

# Install and run frontend in another terminal
cd frontend
npm install
npm run dev

# Navigate to http://localhost:3000
```

The backend will be available at `http://localhost:7350`

### Stopping Development Environment

```bash
# Stop all containers
docker-compose down

# Remove volumes (optional)
docker-compose down -v
```

## 📦 Deployment

### Backend Deployment (Railway)

1. **Create Railway Project**
   ```bash
   railway login
   railway init  # Select the TicTacToe repo
   ```

2. **Configure Variables**
   In Railway dashboard, set:
   - `DB_DRIVER`: `postgres`
   - `DB_URL`: (Railway auto-generates via PostgreSQL plugin)

3. **Link PostgreSQL**
   - Add PostgreSQL plugin in Railway project
   - Railway auto-injects `DATABASE_URL`

4. **Deploy**
   ```bash
   railway up
   ```

   Your backend URL: `https://<project>.up.railway.app`

### Frontend Deployment (Vercel)

1. **Push to GitHub** (if not already)
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create Vercel Project**
   - Go to vercel.com → Import project
   - Select this repository
   - Framework: Vite
   - Root directory: `frontend`

3. **Configure Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Set Environment Variables**
   - `VITE_BACKEND_URL`: Your Railway backend URL
     (e.g., `https://tictactoe-production.up.railway.app`)

5. **Deploy**
   - Click "Deploy"
   - Vercel auto-deploys on every push to main

Your frontend URL: `https://<project>.vercel.app`

## 🎮 How to Play

### Login
1. Enter any username (device ID created automatically)
2. Authenticate with device credentials
3. Join the game lobby

### Play
1. **Create Game**: Click "Create Game Room" to start a new game
2. **Join Game**: Click "Join Game" to join an available match
3. **Make moves**: Click any empty square to place your mark
4. **Win Condition**: Get 3 in a row (horizontal, vertical, diagonal)

### Leaderboard
- View global rankings
- See your position and stats
- Filter by game mode

## 🔌 API Reference

### RPC Endpoints

#### `create_match`
Creates a new game room.

**Request:**
```json
{
  "mode": "classic|timed"
}
```

**Response:**
```json
{
  "success": true,
  "match_id": "uuid"
}
```

#### `find_match`
Finds available games to join.

**Request:**
```json
{
  "mode": "classic|timed"
}
```

**Response:**
```json
{
  "success": true,
  "matches": [
    {
      "match_id": "uuid",
      "name": "Player's Room",
      "player_count": 1,
      "mode": "classic"
    }
  ]
}
```

#### `get_match_state`
Gets current game state.

**Request:**
```json
{
  "match_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "state": {
    "board": [null, "X", "O", ...],
    "currentPlayer": "user-id",
    "winner": null,
    "moves": 3,
    "players": {
      "user-id": { "username": "player1", "symbol": "X" }
    }
  }
}
```

#### `get_leaderboard`
Retrieves global leaderboard.

**Request:**
```json
{
  "limit": 50
}
```

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "username": "TopPlayer",
      "wins": 42,
      "losses": 5,
      "winStreak": 8,
      "score": 4200
    }
  ]
}
```

### Match Messages

#### Move Action (OpCode 1)
Send a move to the server.

```json
{
  "type": "move",
  "position": 0-8,
  "playerId": "user-id"
}
```

#### Game State Update (Broadcast)
Server broadcasts updated game state to all players.

```json
{
  "board": ["X", null, "O", ...],
  "currentPlayer": "user-id",
  "winner": null,
  "moves": 4
}
```

## 🛠️ Development Guide

### Adding Features

#### New RPC Endpoint

1. **Add handler in backend/src/index.ts:**
```typescript
initializer.registerRPC('my_rpc', myRpcHandler);

function myRpcHandler(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  // Implementation
  return JSON.stringify({ success: true });
}
```

2. **Build and test:**
```bash
cd backend
npm run build
docker-compose up -d
```

#### New Frontend Component

1. **Create component file** in `frontend/src/components/`
2. **Import in App.tsx**
3. **Add routing logic**
4. **Test with `npm run dev`**

### Testing

#### Backend Testing
```bash
# Test RPC endpoints
curl -X POST http://localhost:7350/v2/rpc/create_match \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"mode":"classic"}'
```

#### Frontend Testing
```bash
cd frontend
npm run dev
# Unit tests
npm test
```

## 📊 Performance Considerations

- **Match Isolation**: Each match runs independently
- **Real-Time Updates**: WebSocket-based communication (15 ms latency)
- **Scalability**: Nakama supports 1000s of concurrent matches
- **Database**: PostgreSQL configured for connection pooling

## 🔒 Security Features

- ✅ Server-side move validation
- ✅ User authentication via device ID
- ✅ Input sanitization
- ✅ Rate limiting (built-in Nakama)
- ✅ CORS properly configured
- ✅ HTTPS in production

## 📝 Environment Variables

### Frontend (.env.local)
```
VITE_BACKEND_URL=http://localhost:7350
```

### Backend (.env.backend)
```
DB_DRIVER=postgres
DB_URL=postgres://user:pass@host:5432/db
NAKAMA_HTTP_KEY=httpkey
NAKAMA_RUNTIME_JS_ENTRYPOINT=tictactoe.js
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs nakama

# Common issues:
# - PostgreSQL not ready: wait 30 seconds
# - Module build errors: run `npm run build`
# - Port 7350 in use: change in docker-compose.yml
```

### Frontend can't connect to backend
```bash
# Check backend URL
# Verify backend is running: curl http://localhost:7350/

# For production:
# Ensure VITE_BACKEND_URL is set correctly in Vercel
# Check CORS headers in railway logs
```

### Leaderboard returns empty
```bash
# Create a leaderboard in Nakama console
# Or manually trigger: nk.leaderboardRecordList()
```

## 📱 Mobile Support

- Responsive design optimized for all screen sizes
- Touch-friendly UI in GameRoom component
- Tested on iOS Safari and Android Chrome
- PWA-ready (can be added)

## 📄 License

MIT License - feel free to use this for personal or commercial projects

## 👥 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📧 Support

For issues or questions:
- Create a GitHub issue
- Check existing issues for solutions
- Review code comments in modules

## 🎯 Future Enhancements

- [ ] Private games with invite codes
- [ ] Spectator mode
- [ ] Chat system
- [ ] Game replays
- [ ] Mobile app (React Native)
- [ ] AI opponent
- [ ] Tournament system
- [ ] Daily challenges

## 📈 Metrics

Track these in production:
- Active concurrent matches
- Average game duration
- Player win/loss ratio
- Leaderboard activity
- API response times
- Error rates
