import { useState, useCallback } from "react";
import { useNakama } from "./hooks/useNakama.js";
import LoginPage  from "./pages/LoginPage.jsx";
import LobbyPage  from "./pages/LobbyPage.jsx";
import GamePage   from "./pages/GamePage.jsx";
import ResultPage from "./pages/ResultPage.jsx";

// App phases
const Phase = {
  LOGIN:    "login",
  LOBBY:    "lobby",
  GAME:     "game",
  RESULT:   "result",
};

export default function App() {
  const [phase,    setPhase]    = useState(Phase.LOGIN);
  const [loginErr, setLoginErr] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [socket,   setSocket]   = useState(null);
  const [result,   setResult]   = useState(null);

  const nakama = useNakama();

  // ── LOGIN → LOBBY ────────────────────────────────────────
  const handleLogin = useCallback(async (name) => {
    setLoading(true);
    setLoginErr(null);
    try {
      await nakama.authenticate(name);
      const sock = await nakama.openSocket();
      setSocket(sock);
      setPhase(Phase.LOBBY);

      // Immediately start matchmaking
      startMatchmaking(sock);
    } catch (e) {
      setLoginErr(e.message || "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [nakama]);

  // ── MATCHMAKING ─────────────────────────────────────────
  const startMatchmaking = useCallback(async (sock) => {
    try {
      const matchId = await nakama.findMatch();
      await nakama.joinMatch(matchId);
      setPhase(Phase.GAME);
    } catch (e) {
      setLoginErr(e.message || "Matchmaking failed");
      setPhase(Phase.LOGIN);
    }
  }, [nakama]);

  // ── CANCEL LOBBY ────────────────────────────────────────
  const handleCancel = useCallback(async () => {
    await nakama.leaveMatch();
    nakama.disconnect();
    setSocket(null);
    setPhase(Phase.LOGIN);
  }, [nakama]);

  // ── GAME OVER ───────────────────────────────────────────
  const handleGameOver = useCallback((data) => {
    setResult(data);
    setPhase(Phase.RESULT);
  }, []);

  // ── PLAY AGAIN ──────────────────────────────────────────
  const handlePlayAgain = useCallback(async () => {
    setResult(null);
    setPhase(Phase.LOBBY);
    // Reopen socket and re-matchmake
    try {
      const sock = await nakama.openSocket();
      setSocket(sock);
      startMatchmaking(sock);
    } catch (e) {
      setLoginErr(e.message);
      setPhase(Phase.LOGIN);
    }
  }, [nakama, startMatchmaking]);

  // ── Render ───────────────────────────────────────────────
  switch (phase) {
    case Phase.LOGIN:
      return <LoginPage onLogin={handleLogin} loading={loading} error={loginErr} />;

    case Phase.LOBBY:
      return <LobbyPage username={nakama.username} onCancel={handleCancel} />;

    case Phase.GAME:
      return (
        <GamePage
          socket={socket}
          userId={nakama.userId}
          sendMove={nakama.sendMove}
          onGameOver={handleGameOver}
        />
      );

    case Phase.RESULT:
      return (
        <ResultPage
          result={result}
          userId={nakama.userId}
          username={nakama.username}
          getLeaderboard={nakama.getLeaderboard}
          onPlayAgain={handlePlayAgain}
        />
      );

    default:
      return null;
  }
}
