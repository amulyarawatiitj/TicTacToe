import Leaderboard from "../components/Leaderboard.jsx";

export default function ResultPage({ result, userId, username, getLeaderboard, onPlayAgain }) {
  const { winner, reason } = result;

  const isWin  = winner === userId;
  const isDraw = winner === "draw";
  const isLose = !isWin && !isDraw;

  const icon   = isWin ? "🏆" : isDraw ? "🤝" : "😤";
  const label  = isWin ? "WINNER!" : isDraw ? "DRAW" : "DEFEAT";
  const cls    = isWin ? "win"     : isDraw ? "draw" : "lose";
  const pts    = isWin ? "+200 pts" : isDraw ? "+50 pts" : "+0 pts";
  const reasonMsg = {
    "opponent_left": "Opponent disconnected — you win by forfeit!",
    "timeout":       result.timedOut === userId ? "You ran out of time." : "Opponent timed out!",
  }[reason] || null;

  return (
    <div className="screen" style={{ gap: 20 }}>
      <div className="logo">LILA</div>

      <div className="card" style={{ textAlign: "center" }}>
        <div className="result-icon">{icon}</div>
        <div className={`result-label ${cls}`}>{label}</div>
        {!isDraw && !isLose && <div className="score-badge">{pts}</div>}
        {isDraw && <div className="score-badge" style={{ color: "var(--accent)", borderColor: "var(--accent)", background: "rgba(0,229,255,0.08)" }}>{pts}</div>}

        {reasonMsg && (
          <div className="subtitle" style={{ marginTop: 12 }}>{reasonMsg}</div>
        )}
      </div>

      <div className="card">
        <div className="title" style={{ marginBottom: 16 }}>🏅 Leaderboard</div>
        <Leaderboard getLeaderboard={getLeaderboard} myUserId={userId} />
      </div>

      <button className="btn-primary" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
}
