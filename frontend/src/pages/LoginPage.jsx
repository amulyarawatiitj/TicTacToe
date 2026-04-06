import { useState } from "react";

export default function LoginPage({ onLogin, loading, error }) {
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    onLogin(trimmed);
  };

  return (
    <div className="screen">
      <div className="logo">LILA</div>

      <div className="card" style={{ textAlign: "center" }}>
        <div className="title">Multiplayer Tic-Tac-Toe</div>
        <div className="subtitle" style={{ marginBottom: 28 }}>
          Enter your nickname to get matched with a random player
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            type="text"
            placeholder="Your nickname…"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || name.trim().length < 2}
          >
            {loading ? "Connecting…" : "Play Now"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 16, color: "var(--accent2)", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.8rem" }}>
        Server-authoritative · Real-time · Global leaderboard
      </div>
    </div>
  );
}
