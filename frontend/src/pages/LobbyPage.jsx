export default function LobbyPage({ username, onCancel }) {
  return (
    <div className="screen">
      <div className="logo">LILA</div>

      <div className="card" style={{ textAlign: "center", gap: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="title">Finding a match…</div>

        <div className="spinner" />

        <div>
          <div style={{ fontWeight: 600 }}>{username}</div>
          <div className="subtitle" style={{ marginTop: 4 }}>
            Waiting for an opponent — usually takes a few seconds
          </div>
        </div>

        <div className="match-info">
          You&apos;ll be matched automatically with the next available player.
        </div>

        <button className="btn-danger" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
