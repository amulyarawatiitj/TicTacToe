import { useState, useEffect, useRef, useCallback } from "react";
import { Client } from "@heroiclabs/nakama-js";
import cfg from "../config.js";

// Op codes must mirror the server
export const OpCode = {
  MOVE:        1,
  STATE:       2,
  GAME_OVER:   3,
  REJECTED:    4,
  TIMER_TICK:  5,
  PLAYER_INFO: 6,
};

// ─────────────────────────────────────────────────────────────
export function useNakama() {
  const clientRef  = useRef(null);
  const sessionRef = useRef(null);
  const socketRef  = useRef(null);
  const matchIdRef = useRef(null);

  const [ready,     setReady]     = useState(false);
  const [userId,    setUserId]    = useState(null);
  const [username,  setUsername]  = useState(null);
  const [error,     setError]     = useState(null);

  // ── Init client on mount ──────────────────────────────────
  useEffect(() => {
    clientRef.current = new Client(
      cfg.serverKey,
      cfg.host,
      cfg.port,
      cfg.useSSL,
    );
    setReady(true);
  }, []);

  // ── Authenticate (device ID stored in localStorage) ───────
  const authenticate = useCallback(async (name) => {
    const client = clientRef.current;
    if (!client) throw new Error("Client not initialised");

    // Persist device ID so the same user reconnects correctly
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("deviceId", deviceId);
    }

    const session = await client.authenticateDevice(deviceId, true, name);
    sessionRef.current = session;
    setUserId(session.user_id);
    setUsername(name);

    // Update display name
    await client.updateAccount(session, { displayName: name, username: name });
    return session;
  }, []);

  // ── Open real-time socket ─────────────────────────────────
  const openSocket = useCallback(async () => {
    const client  = clientRef.current;
    const session = sessionRef.current;
    if (!client || !session) throw new Error("Not authenticated");

    if (socketRef.current) {
      socketRef.current.disconnect(false);
    }

    const socket = client.createSocket(cfg.useSSL, false);
    await socket.connect(session, true);
    socketRef.current = socket;
    return socket;
  }, []);

  // ── Find or create a match via RPC ───────────────────────
  const findMatch = useCallback(async () => {
    const client  = clientRef.current;
    const session = sessionRef.current;
    if (!client || !session) throw new Error("Not authenticated");

    const res  = await client.rpc(session, "find_match", "");
    const body = JSON.parse(res.payload);
    return body.matchId;
  }, []);

  // ── Join match on the socket ──────────────────────────────
  const joinMatch = useCallback(async (matchId) => {
    const socket = socketRef.current;
    if (!socket) throw new Error("Socket not open");
    const match = await socket.joinMatch(matchId);
    matchIdRef.current = match.match_id;
    return match;
  }, []);

  // ── Send a move ───────────────────────────────────────────
  const sendMove = useCallback((cellIndex) => {
    const socket  = socketRef.current;
    const matchId = matchIdRef.current;
    if (!socket || !matchId) return;
    const data = JSON.stringify({ index: cellIndex });
    socket.sendMatchState(matchId, OpCode.MOVE, data);
  }, []);

  // ── Get leaderboard via RPC ───────────────────────────────
  const getLeaderboard = useCallback(async () => {
    const client  = clientRef.current;
    const session = sessionRef.current;
    if (!client || !session) return [];
    const res  = await client.rpc(session, "get_leaderboard", "");
    return JSON.parse(res.payload).records || [];
  }, []);

  // ── Leave match ───────────────────────────────────────────
  const leaveMatch = useCallback(async () => {
    const socket  = socketRef.current;
    const matchId = matchIdRef.current;
    if (socket && matchId) {
      await socket.leaveMatch(matchId);
      matchIdRef.current = null;
    }
  }, []);

  // ── Disconnect everything ─────────────────────────────────
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect(false);
      socketRef.current = null;
    }
  }, []);

  return {
    ready,
    userId,
    username,
    error,
    setError,
    authenticate,
    openSocket,
    findMatch,
    joinMatch,
    sendMove,
    getLeaderboard,
    leaveMatch,
    disconnect,
    getSocket: () => socketRef.current,
  };
}
