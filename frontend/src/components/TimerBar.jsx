export default function TimerBar({ seconds, turnLimit = 30, isMyTurn }) {
  const pct     = Math.max(0, Math.min(100, (seconds / turnLimit) * 100));
  const urgent  = seconds <= 10;

  return (
    <div className="timer-bar-wrap">
      <div className="timer-label">
        <span>{isMyTurn ? "Your turn" : "Opponent's turn"}</span>
        <span className={`timer-secs ${urgent ? "urgent" : ""}`}>
          {seconds}s
        </span>
      </div>
      <div className="timer-track">
        <div
          className={`timer-fill ${urgent ? "urgent" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
