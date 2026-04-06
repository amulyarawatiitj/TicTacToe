/* Tic-Tac-Toe Nakama Backend Modules */

// Game State Interface
interface GameState {
  board: (string | null)[];
  currentPlayer: string;
  winner: string | null;
  moves: number;
  startTime: number;
  players: Record<string, { username: string; symbol: string }>;
  playerOrder: string[];
  mode: 'classic' | 'timed';
  lastMoveTime?: number;
  timeLimit?: number;
}

interface Match {
  matchId: string;
  state: GameState;
}

// Helper Functions
function initializeBoard(): GameState {
  return {
    board: Array(9).fill(null),
    currentPlayer: '',
    winner: null,
    moves: 0,
    startTime: Date.now(),
    players: {},
    playerOrder: [],
    mode: 'classic',
  };
}

function checkWinner(board: (string | null)[]): string | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]!;
    }
  }

  return null;
}

function isBoardFull(board: (string | null)[]): boolean {
  return board.every((cell) => cell !== null);
}

function encodeMatch(match: Match): string {
  return JSON.stringify(match);
}

function decodeMatch(payload: string): Match {
  return JSON.parse(payload);
}

// Nakama Module Initialization
let InitModule: nkruntime.InitModule = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
) {
  logger.info('Tic-Tac-Toe Module Initialized');

  // ========== RPC Functions ==========

  // Create a new match
  initializer.registerRPC('create_match', createMatchRpc);

  // Find available matches
  initializer.registerRPC('find_match', findMatchRpc);

  // Get match state
  initializer.registerRPC('get_match_state', getMatchStateRpc);

  // Get leaderboard
  initializer.registerRPC('get_leaderboard', getLeaderboardRpc);

  // ========== Match Handler ==========
  initializer.registerMatchHandler('matchhandler', {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchTerminate,
  });

  logger.info('Tic-Tac-Toe Module Ready');
};

// ========== RPC Implementations ==========

function createMatchRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  const data = JSON.parse(payload);
  const mode = data.mode || 'classic';

  const matchState: GameState = initializeBoard();
  matchState.mode = mode;
  matchState.timeLimit = mode === 'timed' ? 30000 : undefined;
  matchState.currentPlayer = ctx.userId;
  matchState.playerOrder = [ctx.userId];

  matchState.players[ctx.userId] = {
    username: ctx.username,
    symbol: 'X',
  };

  const match = { matchId: '', state: matchState };
  const initialState = encodeMatch(match);

  try {
    const createResult = nk.matchCreate('matchhandler', {
      state: initialState,
    });

    return JSON.stringify({
      success: true,
      match_id: createResult,
    });
  } catch (err: unknown) {
    logger.error('Error creating match: ' + (err instanceof Error ? err.message : String(err)));
    return JSON.stringify({
      success: false,
      error: 'Failed to create match',
    });
  }
}

function findMatchRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const mode = JSON.parse(payload).mode || 'classic';
    const query = '*';
    const minSize = 1;
    const maxSize = 2;

    let matches = nk.matchList(minSize, maxSize, 100, query);

    // Filter matches by mode and available slots
    const availableMatches = [];
    for (let match of matches) {
      try {
        const matchData = decodeMatch(match.state);
        if (
          matchData.state.mode === mode &&
          matchData.state.winner === null &&
          Object.keys(matchData.state.players).length < 2
        ) {
          availableMatches.push({
            match_id: match.matchId,
            name: `${Object.values(matchData.state.players)[0]?.username || 'Player'}'s Room`,
            player_count: Object.keys(matchData.state.players).length,
            mode: matchData.state.mode,
          });
        }
      } catch (e) {
        // Skip matches that can't be decoded
      }
    }

    return JSON.stringify({
      success: true,
      matches: availableMatches,
    });
  } catch (err: unknown) {
    logger.error('Error finding matches: ' + (err instanceof Error ? err.message : String(err)));
    return JSON.stringify({
      success: false,
      matches: [],
    });
  }
}

function getMatchStateRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const { match_id } = JSON.parse(payload);
    const match = nk.matchGet(match_id);

    if (!match) {
      return JSON.stringify({
        success: false,
        error: 'Match not found',
      });
    }

    const matchData = decodeMatch(match.state);
    return JSON.stringify({
      success: true,
      state: matchData.state,
    });
  } catch (err: unknown) {
    logger.error('Error getting match state: ' + (err instanceof Error ? err.message : String(err)));
    return JSON.stringify({
      success: false,
      error: 'Failed to get match state',
    });
  }
}

function getLeaderboardRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const data = JSON.parse(payload);
    const limit = data.limit || 50;

    const records = nk.leaderboardRecordsList('tictactoe_leaderboard', [], limit, 0, []);

    const leaderboard = records.map((record: any, idx: number) => ({
      rank: idx + 1,
      username: record.username,
      wins: record.metadata?.wins || 0,
      losses: record.metadata?.losses || 0,
      winStreak: record.metadata?.winStreak || 0,
      score: record.score || 0,
    }));

    return JSON.stringify({
      success: true,
      leaderboard,
    });
  } catch (err: unknown) {
    logger.error('Error getting leaderboard: ' + (err instanceof Error ? err.message : String(err)));
    return JSON.stringify({
      success: true,
      leaderboard: [],
    });
  }
}

// ========== Match Handler Functions ==========

function matchInit(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: any }
): {
  state: string;
  tickRate: number;
  label: string;
} {
  logger.info('Match initialized');

  const initialState = params.state || encodeMatch({
    matchId: params.matchId,
    state: initializeBoard(),
  });

  return {
    state: initialState,
    tickRate: 10,
    label: 'tictactoe',
  };
}

function matchJoinAttempt(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: string,
  presence: nkruntime.Presence,
  metadata: { [key: string]: any }
): { state: string; accept: boolean; rejectMessage?: string } {
  const match = decodeMatch(state);

  if (Object.keys(match.state.players).length >= 2) {
    return {
      state,
      accept: false,
      rejectMessage: 'Match is full',
    };
  }

  if (match.state.winner !== null) {
    return {
      state,
      accept: false,
      rejectMessage: 'Match already finished',
    };
  }

  return {
    state,
    accept: true,
  };
}

function matchJoin(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: string,
  presences: nkruntime.Presence[]
): string {
  let match = decodeMatch(state);

  for (let presence of presences) {
    if (!match.state.players[presence.userId]) {
      match.state.players[presence.userId] = {
        username: presence.username,
        symbol: Object.keys(match.state.players).length === 0 ? 'X' : 'O',
      };

      if (match.state.playerOrder.length === 0) {
        match.state.playerOrder = [presence.userId];
        match.state.currentPlayer = presence.userId;
      } else if (match.state.playerOrder.length === 1) {
        match.state.playerOrder.push(presence.userId);
      }
    }
  }

  logger.info(
    'Player joined. Total players: ' + Object.keys(match.state.players).length
  );

  return encodeMatch(match);
}

function matchLeave(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: string,
  presences: nkruntime.Presence[]
): string {
  let match = decodeMatch(state);

  for (let presence of presences) {
    if (match.state.players[presence.userId]) {
      delete match.state.players[presence.userId];
    }
  }

  // If no players left, end match
  if (Object.keys(match.state.players).length === 0) {
    dispatcher.broadcastMessage(2); // Signal match end
  }

  return encodeMatch(match);
}

function matchLoop(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: string,
  messages: nkruntime.MatchMessage[]
): string {
  let match = decodeMatch(state);

  for (let message of messages) {
    if (message.opCode === 1) {
      // Move opcode
      const data = JSON.parse(
        typeof message.data === 'string' ? message.data : new TextDecoder().decode(message.data)
      );

      if (data.playerId !== match.state.currentPlayer) {
        logger.warn('Player trying to move out of turn');
        continue;
      }

      const position = data.position;

      if (match.state.board[position] !== null) {
        logger.warn('Position already occupied');
        continue;
      }

      const playerSymbol = match.state.players[data.playerId].symbol;
      match.state.board[position] = playerSymbol;
      match.state.moves++;
      match.state.lastMoveTime = Date.now();

      // Check for winner
      const winner = checkWinner(match.state.board);
      if (winner) {
        match.state.winner = winner;
        const winnerId = Object.entries(match.state.players).find(
          ([, p]) => p.symbol === winner
        )?.[0];

        // Update leaderboard
        if (winnerId) {
          try {
            nk.leaderboardRecordWrite('tictactoe_leaderboard', winnerId, 1, 0, {
              wins: 1,
              losses: 0,
              winStreak: 1,
            });
          } catch (e) {
            logger.error('Failed to update leaderboard');
          }
        }
      } else if (isBoardFull(match.state.board)) {
        // Draw
        match.state.winner = 'draw';
      } else {
        // Switch player
        const currentIdx = match.state.playerOrder.indexOf(match.state.currentPlayer);
        match.state.currentPlayer = match.state.playerOrder[1 - currentIdx];
      }

      // Broadcast state
      dispatcher.broadcastMessage(0, JSON.stringify(match.state));
    }
  }

  // Check for timeout in timed mode
  if (match.state.mode === 'timed' && match.state.timeLimit && !match.state.winner) {
    const timeSinceMove = Date.now() - (match.state.lastMoveTime || match.state.startTime);
    if (timeSinceMove > match.state.timeLimit) {
      // Current player forfeits
      const winnerId = match.state.playerOrder.find((id) => id !== match.state.currentPlayer);
      if (winnerId) {
        match.state.winner = match.state.players[winnerId].symbol;
      }
    }
  }

  return encodeMatch(match);
}

function matchTerminate(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: string,
  graceSeconds: number
): string {
  logger.info('Match terminated');
  return state;
}

// ========== Export ==========
declare const global: any;
if (
  typeof window === 'undefined' &&
  typeof global !== 'undefined' &&
  (global as any).InitModule
) {
  (global as any).InitModule = InitModule;
}
