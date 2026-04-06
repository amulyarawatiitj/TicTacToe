// Minimal type stubs for Nakama TypeScript runtime.
// The real implementations are provided by the Nakama server at runtime.
// esbuild strips all types — this file is only needed for the compiler to be happy.

declare namespace nkruntime {
  interface Context {
    env: { [key: string]: string };
    executionMode: number;
    headers: { [key: string]: string[] };
    queryParams: { [key: string]: string[] };
    userId: string;
    username: string;
    vars: { [key: string]: string };
    clientIp: string;
    clientPort: string;
    matchId: string;
    matchNode: string;
    matchLabel: string;
    matchTickRate: number;
  }

  interface Logger {
    debug(format: string, ...params: any[]): void;
    info(format: string, ...params: any[]): void;
    warn(format: string, ...params: any[]): void;
    error(format: string, ...params: any[]): void;
  }

  interface Presence {
    userId: string;
    sessionId: string;
    username: string;
    node: string;
    status: string;
  }

  interface MatchDispatcher {
    broadcastMessage(opCode: number, data: string | Uint8Array, presences?: Presence[] | null, sender?: Presence | null, reliable?: boolean): void;
    matchLabelUpdate(label: string): void;
    matchKick(presences: Presence[]): void;
  }

  interface MatchMessage {
    sender: Presence;
    persistence: boolean;
    status: string;
    opCode: number;
    data: Uint8Array;
    reliable: boolean;
    receiveTimeMs: number;
  }

  interface LeaderboardRecord {
    leaderboardId: string;
    ownerId: string;
    username: string;
    score: number;
    subscore: number;
    numScore: number;
    metadata: { [key: string]: any };
    createTime: number;
    updateTime: number;
    expiryTime: number;
    rank: number;
  }

  interface LeaderboardRecordList {
    records: LeaderboardRecord[];
    ownerRecords: LeaderboardRecord[];
    nextCursor: string;
    prevCursor: string;
  }

  interface Match {
    matchId: string;
    authoritative: boolean;
    label: string;
    size: number;
    tickRate: number;
    handlerName: string;
  }

  interface Nakama {
    // Match
    matchCreate(module: string, params?: { [key: string]: string }): string;
    matchList(limit: number, authoritative?: boolean | null, label?: string | null, minSize?: number | null, maxSize?: number | null, query?: string | null): Match[];

    // Leaderboard
    leaderboardCreate(id: string, authoritative: boolean, sortOrder?: string, operator?: string, resetSchedule?: string, metadata?: { [key: string]: any }, enableRanks?: boolean): void;
    leaderboardRecordWrite(id: string, ownerId: string, username?: string, score?: number, subscore?: number, metadata?: { [key: string]: any }, operator?: string): LeaderboardRecord;
    leaderboardRecordsList(id: string, ownerIds?: string[], limit?: number, cursor?: string | null, expiry?: number | null): LeaderboardRecordList;

    // RPC / util
    rpcRun(id: string, payload: string): string;
    binaryToString(data: Uint8Array): string;
    stringToBinary(str: string): Uint8Array;
  }

  interface Initializer {
    registerMatch(name: string, handlers: {
      matchInit: MatchInitFunction;
      matchJoinAttempt: MatchJoinAttemptFunction;
      matchJoin: MatchJoinFunction;
      matchLeave: MatchLeaveFunction;
      matchLoop: MatchLoopFunction;
      matchTerminate: MatchTerminateFunction;
      matchSignal: MatchSignalFunction;
    }): void;
    registerRpc(id: string, fn: RpcFunction): void;
  }

  type MatchInitFunction = (
    ctx: Context, logger: Logger, nk: Nakama, params: { [key: string]: string }
  ) => { state: any; tickRate: number; label: string };

  type MatchJoinAttemptFunction = (
    ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher,
    tick: number, state: any, presence: Presence, metadata: { [key: string]: any }
  ) => { state: any; accept: boolean; rejectMessage?: string } | null;

  type MatchJoinFunction = (
    ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher,
    tick: number, state: any, presences: Presence[]
  ) => { state: any } | null;

  type MatchLeaveFunction = (
    ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher,
    tick: number, state: any, presences: Presence[]
  ) => { state: any } | null;

  type MatchLoopFunction = (
    ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher,
    tick: number, state: any, messages: MatchMessage[]
  ) => { state: any } | null;

  type MatchTerminateFunction = (
    ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher,
    tick: number, state: any, graceSeconds: number
  ) => { state: any } | null;

  type MatchSignalFunction = (
    ctx: Context, logger: Logger, nk: Nakama, dispatcher: MatchDispatcher,
    tick: number, state: any
  ) => { state: any; data: string };

  type RpcFunction = (
    ctx: Context, logger: Logger, nk: Nakama, payload: string
  ) => string;
}
