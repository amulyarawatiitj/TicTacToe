import { useEffect, useState } from "react";

export default function Leaderboard({ getLeaderboard, myUserId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(r => setRecords(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="lb-empty">Loading leaderboard…</div>;
  if (!records.length) return <div className="lb-empty">No records yet. Be the first to play!</div>;

  return (
    <div>
      {records.map((r, i) => {
        const isTop = i < 3;
        const isMe  = r.userId === myUserId;
        const meta  = r.metadata || {};
        return (
          <div className="lb-row" key={r.userId || i}>
            <div className={`lb-rank ${isTop ? "top" : ""}`}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
            </div>
            <div style={{ flex: 1 }}>
              <div className={`lb-name ${isMe ? "you" : ""}`}>
                {r.username}{isMe ? " (you)" : ""}
              </div>
              <div className="lb-meta">
                W:{meta.wins||0} L:{meta.losses||0} D:{meta.draws||0}
              </div>
            </div>
            <div className="lb-score">{r.score} pts</div>
          </div>
        );
      })}
    </div>
  );
}
