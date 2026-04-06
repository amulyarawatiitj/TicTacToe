// =============================================================
// Multiplayer Tic-Tac-Toe — Nakama Server Module (JavaScript)
// =============================================================

const moduleName = "tictactoe";

// ─── Op Codes ────────────────────────────────────────────────
const OpCode = {
  MOVE:        1,
  STATE:       2,
  GAME_OVER:   3,
  REJECTED:    4,
  TIMER_TICK:  5,
  PLAYER_INFO: 6,
};

// ─── Constants ───────────────────────────────────────────────
const BOARD_SIZE  = 9;
const TURN_LIMIT  = 30;
const TICK_RATE   = 1;
const LEADERBOARD = "global_lb";

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

// ─── Helpers ─────────────────────────────────────────────────
function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every(cell => cell !== "")) return "draw";
  return null;
}

function stateMsg(state) {
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

function broadcast(nk, dispatcher, state, opCode, data) {
  const presences = state.players.map(p => p.presence);
  dispatcher.broadcastMessage(opCode, data, presences, null, true);
}

// ─── Match Handlers ──────────────────────────────────────────
const matchInit = function (ctx, logger, nk, params) {
  const state = {
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

const matchJoinAttempt = function (ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
  if (state.players.length >= 2) {
    return { state, accept: false, rejectMessage: "Match is full" };
  }
  if (state.phase === "finished") {
    return { state, accept: false, rejectMessage: "Match has ended" };
  }
  return { state, accept: true };
};

const matchJoin = function (ctx, logger, nk, dispatcher, tick, state, presences) {
  for (const presence of presences) {
    const symbol = state.players.length === 0 ? "X" : "O";
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
    dispatcher.matchLabelUpdate(JSON.stringify({ open: false }));
    broadcast(nk, dispatcher, state, OpCode.STATE, stateMsg(state));
  } else {
    dispatcher.broadcastMessage(
      OpCode.STATE,
      stateMsg(state),
      [state.players[0].presence],
      null, true,
    );
  }
  return { state };
};

const matchLeave = function (ctx, logger, nk, dispatcher, tick, state, presences) {
  for (const presence of presences) {
    logger.info(`[${moduleName}] Player left: ${presence.username}`);
    state.players = state.players.filter(p => p.userId !== presence.userId);
  }

  if (state.phase === "playing" && state.players.length < 2) {
    state.phase  = "finished";
    state.winner = state.players.length === 1 ? state.players[0].userId : null;

    if (state.players.length === 1) {
      dispatcher.broadcastMessage(
        OpCode.GAME_OVER,
        JSON.stringify({ winner: state.winner, reason: "opponent_left" }),
        [state.players[0].presence],
        null, true,
      );
      recordLeaderboard(nk, logger, state, "opponent_left");
    }
    return null;
  }
  return { state };
};

const matchLoop = function (ctx, logger, nk, dispatcher, tick, state, messages) {
  for (const msg of messages) {
    if (state.phase !== "playing") continue;

    const sender = state.players.find(p => p.userId === msg.sender.userId);
    if (!sender) continue;

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
      let data;
      try { data = JSON.parse(nk.binaryToString(msg.data)); }
      catch { continue; }

      const idx = data.index;
      if (idx < 0 || idx >= BOARD_SIZE || state.board[idx] !== "") {
        dispatcher.broadcastMessage(
          OpCode.REJECTED,
          JSON.stringify({ reason: "invalid_move", index: idx }),
          [sender.presence], null, true,
        );
        continue;
      }

      state.board[idx]    = currentPlayer.symbol;
      state.moveCount    += 1;
      state.ticksSinceMove = 0;
      state.timerSecs     = TURN_LIMIT;

      const result = checkWinner(state.board);
      if (result) {
        state.phase  = "finished";
        state.winner = result === "draw"
          ? "draw"
          : state.players.find(p => p.symbol === result).userId;

        broadcast(nk, dispatcher, state, OpCode.GAME_OVER,
          JSON.stringify({ winner: state.winner, board: state.board, reason: "normal" }));

        recordLeaderboard(nk, logger, state, "normal");
        return null;
      }

      state.turnIndex = state.turnIndex === 0 ? 1 : 0;
      broadcast(nk, dispatcher, state, OpCode.STATE, stateMsg(state));
    }
  }

  if (state.phase === "playing") {
    state.ticksSinceMove += 1;
    state.timerSecs = Math.max(0, TURN_LIMIT - state.ticksSinceMove);

    broadcast(nk, dispatcher, state, OpCode.TIMER_TICK,
      JSON.stringify({ timerSecs: state.timerSecs, turnIndex: state.turnIndex }));

    if (state.timerSecs <= 0) {
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

const matchTerminate = function (ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  logger.info(`[${moduleName}] Match terminated`);
  return { state };
};

const matchSignal = function (ctx, logger, nk, dispatcher, tick, state) {
  return { state, data: "" };
};

// ─── Leaderboard ─────────────────────────────────────────────
function recordLeaderboard(nk, logger, state, reason) {
  if (state.players.length < 2 && reason !== "opponent_left") return;
  try {
    nk.leaderboardCreate(LEADERBOARD, false, "desc", "incr", "", false);
  } catch (_) {}

  for (const player of state.players) {
    let score = 0;
    if (state.winner === player.userId)       score = 200;
    else if (state.winner === "draw")         score = 50;
    else                                      score = 0;

    try {
      nk.leaderboardRecordWrite(
        LEADERBOARD, player.userId, player.username, score, 0,
        { wins:   state.winner === player.userId ? 1 : 0,
          losses: state.winner !== player.userId && state.winner !== "draw" ? 1 : 0,
          draws:  state.winner === "draw" ? 1 : 0,
        },
      );
    } catch (e) {
      logger.error(`Leaderboard write failed: ${e.message}`);
    }
  }
}

// ─── RPC: Get Leaderboard ─────────────────────────────────────
const rpcGetLeaderboard = function (ctx, logger, nk, payload) {
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
  } catch (e) {
    logger.error(`rpcGetLeaderboard error: ${e.message}`);
    return JSON.stringify({ records: [] });
  }
};

// ─── RPC: Find or Create Match ────────────────────────────────
const rpcFindMatch = function (ctx, logger, nk, payload) {
  const matches = nk.matchList(10, true, null, 0, 1, "");
  if (matches.length > 0) {
    return JSON.stringify({ matchId: matches[0].matchId });
  }
  const matchId = nk.matchCreate(moduleName, {});
  return JSON.stringify({ matchId });
};

// ─── Module Initialization ────────────────────────────────────
function InitModule(ctx, logger, nk, initializer) {
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

// Export InitModule
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InitModule };
}
