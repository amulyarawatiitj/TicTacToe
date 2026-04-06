import { useEffect, useState, useCallback } from "react";
import Board    from "../components/Board.jsx";
import TimerBar from "../components/TimerBar.jsx";
import { OpCode } from "../hooks/useNakama.js";

export default function GamePage({ socket, userId, sendMove, onGameOver }) {
  const [gameState, setGameState]   = useState(null);
  const [timerSecs, setTimerSecs]   = useState(30);
  const [rejected,  setRejected]    = useState(null);

  // ── Parse state message ───────────────────────────────────
  const handleMsg = useCallback((msg) => {
    const raw = msg.data;
    let text;
    if (typeof raw === "string") {
      text = raw;
    } else if (raw instanceof Uint8Array || ArrayBuffer.isView(raw)) {
      text = new TextDecoder().decode(raw);
    } else {
      text = String.fromCharCode(...new Uint8Array(raw));
    }

    let data;
    try { data = JSON.parse(text); } catch { return; }

    switch (msg.op_code) {
      case OpCode.STATE:
        setGameState(data);
        setTimerSecs(data.timerSecs ?? 30);
        break;

      case OpCode.GAME_OVER:
        onGameOver(data);
        break;

      case OpCode.TIMER_TICK:
        setTimerSecs(data.timerSecs ?? 30);
        break;

      case OpCode.REJECTED:
        setRejected(data.reason || "invalid move");
        setTimeout(() => setRejected(null), 2000);
        break;

      default:
        break;
    }
  }, [onGameOver]);

  useEffect(() => {
    if (!socket) return;
    socket.onmatchdata = handleMsg;
    return () => { socket.onmatchdata = null; };
  }, [socket, handleMsg]);

  if (!gameState) {
    return (
      <div className="screen">
        <div className="logo">LILA</div>
        <div className="spinner" />
        <div className="subtitle">Waiting for opponent…</div>
      </div>
    );
  }

  const { board, turnIndex, players, phase } = gameState;
  const me       = players.find(p => p.userId === userId);
  const opponent = players.find(p => p.userId !== userId);
  const mySymbol = me?.symbol || "?";

  const currentPlayer = players[turnIndex];
  const isMyTurn      = currentPlayer?.userId === userId;

  return (
    <div className="screen" style={{ gap: 20 }}>
      <div className="logo">LILA</div>

      {/* ── Player bar ── */}
      <div className="player-bar">
        {/* X player */}
        {(() => {
          const xPlayer  = players.find(p => p.symbol === "X");
          const isActive = currentPlayer?.symbol === "X" && phase === "playing";
          const isMe     = xPlayer?.userId === userId;
          return (
            <div className={`player-chip ${isActive ? "active is-x" : ""}`}>
              <div className="chip-symbol x">✕</div>
              <div className="chip-name">{xPlayer?.username || "?"}</div>
              {isMe && <div className="chip-you">you</div>}
            </div>
          );
        })()}

        <div className="vs-badge">VS</div>

        {/* O player */}
        {(() => {
          const oPlayer  = players.find(p => p.symbol === "O");
          const isActive = currentPlayer?.symbol === "O" && phase === "playing";
          const isMe     = oPlayer?.userId === userId;
          return (
            <div className={`player-chip ${isActive ? "active is-o" : ""}`}>
              <div className="chip-symbol o">◯</div>
              <div className="chip-name">{oPlayer?.username || "?"}</div>
              {isMe && <div className="chip-you">you</div>}
            </div>
          );
        })()}
      </div>

      {/* ── Timer ── */}
      {phase === "playing" && (
        <TimerBar seconds={timerSecs} turnLimit={30} isMyTurn={isMyTurn} />
      )}

      {/* ── Status ── */}
      {phase === "waiting" && (
        <div className="status-banner warning">Waiting for opponent to join…</div>
      )}
      {phase === "playing" && (
        <div className="status-banner">
          {isMyTurn ? `Your turn — play ${mySymbol}` : `${opponent?.username || "Opponent"}'s turn…`}
        </div>
      )}

      {/* ── Board ── */}
      <Board
        board={board}
        onMove={sendMove}
        disabled={!isMyTurn || phase !== "playing"}
        mySymbol={mySymbol}
      />

      {rejected && (
        <div className="toast">{rejected}</div>
      )}
    </div>
  );
}
