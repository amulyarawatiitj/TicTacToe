declare namespace nkruntime {
  interface Context {
    userId: string;
    username: string;
  }

  interface Logger {
    info(message: string): void;
    error(message: string): void;
    warn(message: string): void;
    debug(message: string): void;
  }

  interface Nakama {
    rpcInvoked(id: string, fn: Function): void;
    matchCreate(handler: string, params?: { [key: string]: any }): string;
    matchGet(id: string): any;
    matchList(min: number, max: number, limit: number, query: string): any[];
    leaderboardRecordsList(
      leaderboard: string,
      ownerIds: string[],
      limit: number,
      cursor: number,
      expiry: string[]
    ): any[];
    leaderboardRecordWrite(
      leaderboard: string,
      owner: string,
      score: number,
      subscore: number,
      metadata?: { [key: string]: any }
    ): void;
  }

  interface Initializer {
    registerRPC(name: string, fn: Function): void;
    registerMatchHandler(name: string, handler: MatchHandler): void;
  }

  interface MatchHandler {
    matchInit: Function;
    matchJoinAttempt: Function;
    matchJoin: Function;
    matchLeave: Function;
    matchLoop: Function;
    matchTerminate: Function;
  }

  interface MatchDispatcher {
    broadcastMessage(opCode: number, data?: string | any, presences?: Presence[]): void;
  }

  interface Presence {
    userId: string;
    username: string;
    sessionId?: string;
  }

  interface MatchMessage {
    opCode: number;
    data: string | Uint8Array;
    sender?: Presence;
  }

  type InitModule = (
    ctx: Context,
    logger: Logger,
    nk: Nakama,
    initializer: Initializer
  ) => void;
}
