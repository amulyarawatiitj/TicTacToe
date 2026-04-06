// =============================================================
// Multiplayer Tic-Tac-Toe — Nakama Server Module (TypeScript)
// =============================================================

const moduleName = "tictactoe";

// ─── Op Codes ────────────────────────────────────────────────
enum OpCode {
  MOVE        = 1,  // client → server
  STATE       = 2,  // server → client (full state broadcast)
  GAME_OVER   = 3,  // server → client
  REJECTED    = 4,  // server → client (invalid move / error)
  TIMER_TICK  = 5,  // server → client (countdown)
  PLAYER_INFO = 6,  // server → client (player metadata)
}

// ─── Constants ───────────────────────────────────────────────
const BOARD_SIZE  = 9;
const TURN_LIMIT  = 30;           // seconds per turn
const TICK_RATE   = 1;            // match loop ticks per second
const LEADERBOARD = "global_lb";

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],        // rows
  [0,3,6],[1,4,7],[2,5,8],        // cols
  [0,4,8],[2,4,6],                // diagonals
];

// ─── Types ───────────────────────────────────────────────────
interface PlayerInfo {
  userId:   string;
  username: string;
  symbol:   "X" | "O";
  presence: nkruntime.Presence;
}

interface MatchState {
  phase:       "waiting" | "playing" | "finished";
  board:       string[];           // 9 cells: "", "X", or "O"
  players:     PlayerInfo[];       // [0]=X, [1]=O
  turnIndex:   number;             // 0 or 1 — whose turn
  moveCount:   number;
  winner:      string | null;      // userId of winner, or "draw"
  timerSecs:   number;             // countdown for current turn
  ticksSinceMove: number;
}

// ─── Helpers ─────────────────────────────────────────────────
function checkWinner(board: string[]): string | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // "X" or "O"
    }
  }
  if (board.every(cell => cell !== "")) return "draw";
  return null;
}

function stateMsg(state: MatchState) {
  return JSON.stringify({
    board:      state.board,
    turnIndex:  state.turnIndex,
    moveCount:  state.moveCount,
    winner:     state.winner,
    phase:      state.phase,
    timerSecs:  state.timerSecs,
    players: state.players.map(p => ({
      userId:   p.userId,
      username: p.username,
      symbol:   p.symbol,
    })),
  });
}

function broadcast(
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  state: MatchState,
  opCode: number,
  data: string,
) {
  const presences = state.players.map(p => p.presence);
  dispatcher.broadcastMessage(opCode, data, presences, null, true);
}

// ─── Match Handlers ──────────────────────────────────────────
const matchInit: nkruntime.MatchInitFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string },
): { state: MatchState; tickRate: number; label: string } {
  const state: MatchState = {
    phase:          "waiting",
    board:          Array(BOARD_SIZE).fill(""),
    players:        [],
    turnIndex:      0,
    moveCount:      0,
    winner:         null,
    timerSecs:      TURN_LIMIT,
    ticksSinceMove: 0,
  };
  return {
    state,
    tickRate: TICK_RATE,
    label:    JSON.stringify({ open: true }),
  };
};

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (
  ctx, logger, nk, dispatcher, tick, state: MatchState, presence, metadata,
): { state: MatchState; accept: boolean; rejectMessage?: string } {
  if (state.players.length >= 2) {
    return { state, accept: false, rejectMessage: "Match is full" };
  }
  if (state.phase === "finished") {
    return { state, accept: false, rejectMessage: "Match has ended" };
  }
  return { state, accept: true };
};

const matchJoin: nkruntime.MatchJoinFunction = function (
  ctx, logger, nk, dispatcher, tick, state: MatchState, presences,
): { state: MatchState } | null {
  for (const presence of presences) {
    const symbol: "X" | "O" = state.players.length === 0 ? "X" : "O";
    state.players.push({
      userId:   presence.userId,
      username: presence.username,
      symbol,
      presence,
    });
    logger.info(`[${moduleName}] Player joined: ${presence.username} as ${symbol}`);
  }

  if (state.players.length === 2) {
    state.phase    = "playing";
    state.timerSecs = TURN_LIMIT;
    // Update label so matchmaking knows it's full
    dispatcher.matchLabelUpdate(JSON.stringify({ open: false }));
    // Broadcast initial state to both players
    broadcast(nk, dispatcher, state, OpCode.STATE, stateMsg(state));
  } else {
    // Notify the first player they're waiting
    dispatcher.broadcastMessage(
      OpCode.STATE,
      stateMsg(state),
      [state.players[0].presence],
      null, true,
    );
  }
  return { state };
};

const matchLeave: nkruntime.MatchLeaveFunction = function (
  ctx, logger, nk, dispatcher, tick, state: MatchState, presences,
): { state: MatchState } | null {
  for (const presence of presences) {
    logger.info(`[${moduleName}] Player left: ${presence.username}`);
    state.players = state.players.filter(p => p.userId !== presence.userId);
  }

  if (state.phase === "playing" && state.players.length < 2) {
    // Remaining player wins by forfeit
    state.phase  = "finished";
    state.winner = state.players.length === 1 ? state.players[0].userId : null;

    if (state.players.length === 1) {
      dispatcher.broadcastMessage(
        OpCode.GAME_OVER,
        JSON.stringify({ winner: state.winner, reason: "opponent_left" }),
        [state.players[0].presence],
        null, true,
      );
      // Record leaderboard
      recordLeaderboard(nk, logger, state, "opponent_left");
    }
    return null; // Terminate match
  }
  return { state };
};

const matchLoop: nkruntime.MatchLoopFunction = function (
  ctx, logger, nk, dispatcher, tick, state: MatchState, messages,
): { state: MatchState } | null {

  // ── Process incoming messages ──────────────────────────────
  for (const msg of messages) {
    if (state.phase !== "playing") continue;

    const sender = state.players.find(p => p.userId === msg.sender.userId);
    if (!sender) continue;

    // Only the current turn player may move
    const currentPlayer = state.players[state.turnIndex];
    if (sender.userId !== currentPlayer.userId) {
      dispatcher.broadcastMessage(
        OpCode.REJECTED,
        JSON.stringify({ reason: "not_your_turn" }),
        [sender.presence], null, true,
      );
      continue;
    }

    if (msg.opCode === OpCode.MOVE) {
      let data: { index: number };
      try { data = JSON.parse(nk.binaryToString(msg.data)); }
      catch { continue; }

      const idx = data.index;
      // Validate move
      if (idx < 0 || idx >= BOARD_SIZE || state.board[idx] !== "") {
        dispatcher.broadcastMessage(
          OpCode.REJECTED,
          JSON.stringify({ reason: "invalid_move", index: idx }),
          [sender.presence], null, true,
        );
        continue;
      }

      // Apply move
      state.board[idx]    = currentPlayer.symbol;
      state.moveCount    += 1;
      state.ticksSinceMove = 0;
      state.timerSecs     = TURN_LIMIT;

      const result = checkWinner(state.board);
      if (result) {
        // Game over
        state.phase  = "finished";
        state.winner = result === "draw"
          ? "draw"
          : state.players.find(p => p.symbol === result)!.userId;

        broadcast(nk, dispatcher, state, OpCode.GAME_OVER,
          JSON.stringify({ winner: state.winner, board: state.board, reason: "normal" }));

        recordLeaderboard(nk, logger, state, "normal");
        return null; // Terminate match
      }

      // Switch turns
      state.turnIndex = state.turnIndex === 0 ? 1 : 0;
      broadcast(nk, dispatcher, state, OpCode.STATE, stateMsg(state));
    }
  }

  // ── Timer logic ───────────────────────────────────────────
  if (state.phase === "playing") {
    state.ticksSinceMove += 1;
    state.timerSecs = Math.max(0, TURN_LIMIT - state.ticksSinceMove);

    // Broadcast timer every second
    broadcast(nk, dispatcher, state, OpCode.TIMER_TICK,
      JSON.stringify({ timerSecs: state.timerSecs, turnIndex: state.turnIndex }));

    if (state.timerSecs <= 0) {
      // Auto-forfeit: current player loses
      const loser  = state.players[state.turnIndex];
      const winner = state.players[state.turnIndex === 0 ? 1 : 0];
      state.phase  = "finished";
      state.winner = winner.userId;

      broadcast(nk, dispatcher, state, OpCode.GAME_OVER,
        JSON.stringify({ winner: state.winner, reason: "timeout", timedOut: loser.userId }));

      recordLeaderboard(nk, logger, state, "timeout");
      return null;
    }
  }

  return { state };
};

const matchTerminate: nkruntime.MatchTerminateFunction = function (
  ctx, logger, nk, dispatcher, tick, state, graceSeconds,
): { state: MatchState } | null {
  logger.info(`[${moduleName}] Match terminated`);
  return { state };
};

const matchSignal: nkruntime.MatchSignalFunction = function (
  ctx, logger, nk, dispatcher, tick, state,
): { state: MatchState; data: string } {
  return { state, data: "" };
};

// ─── Leaderboard ─────────────────────────────────────────────
function recordLeaderboard(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  state: MatchState,
  reason: string,
) {
  if (state.players.length < 2 && reason !== "opponent_left") return;
  try {
    nk.leaderboardCreate(LEADERBOARD, false, "desc", "incr", "", false);
  } catch (_) {}

  for (const player of state.players) {
    let score = 0;
    if (state.winner === player.userId)       score = 200;  // win
    else if (state.winner === "draw")         score = 50;   // draw
    else                                      score = 0;    // loss

    try {
      nk.leaderboardRecordWrite(
        LEADERBOARD, player.userId, player.username, score, 0,
        { wins:   state.winner === player.userId ? 1 : 0,
          losses: state.winner !== player.userId && state.winner !== "draw" ? 1 : 0,
          draws:  state.winner === "draw" ? 1 : 0,
        },
      );
    } catch (e: any) {
      logger.error(`Leaderboard write failed: ${e.message}`);
    }
  }
}

// ─── RPC: Get Leaderboard ─────────────────────────────────────
const rpcGetLeaderboard: nkruntime.RpcFunction = function (
  ctx, logger, nk, payload,
): string {
  try {
    const records = nk.leaderboardRecordsList(LEADERBOARD, [], 20, null, null);
    return JSON.stringify({
      records: (records.records || []).map(r => ({
        username:  r.username,
        score:     r.score,
        subscore:  r.subscore,
        rank:      r.rank,
        metadata:  r.metadata,
      })),
    });
  } catch (e: any) {
    logger.error(`rpcGetLeaderboard error: ${e.message}`);
    return JSON.stringify({ records: [] });
  }
};

// ─── RPC: Find or Create Match ────────────────────────────────
const rpcFindMatch: nkruntime.RpcFunction = function (
  ctx, logger, nk, payload,
): string {
  // List open matches
  const matches = nk.matchList(10, true, null, 0, 1, "");
  if (matches.length > 0) {
    return JSON.stringify({ matchId: matches[0].matchId });
  }
  // No open match — create one
  const matchId = nk.matchCreate(moduleName, {});
  return JSON.stringify({ matchId });
};

// ─── Register ────────────────────────────────────────────────
function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer,
) {
  logger.info(`[${moduleName}] Initializing...`);
  initializer.registerMatch(moduleName, {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchTerminate,
    matchSignal,
  });

  initializer.registerRpc("find_match",     rpcFindMatch);
  initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);

  logger.info(`[${moduleName}] Module loaded ✓`);
}

// Make InitModule globally available for Nakama runtime
if (typeof globalThis !== 'undefined') {
  (globalThis as any).InitModule = InitModule;
}

// Also export for bundler
export { InitModule };
