import React, { useState, useEffect } from 'react';
import { Client } from '@heroiclabs/nakama-js';
import './Leaderboard.css';

interface LeaderboardProps {
  client: Client;
  session: {
    userId: string;
    username: string;
    token: string;
    refreshToken: string;
  };
  onBack: () => void;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  wins: number;
  losses: number;
  winStreak: number;
  score: number;
}

export default function Leaderboard({ client, session, onBack }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const result = await client.rpc(session as any, 'get_leaderboard', {
          limit: 50,
        });
        const data = JSON.parse(result.payload as unknown as string);
        setLeaderboard(data.leaderboard || []);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load leaderboard';
        setError(errorMsg);
        console.error('Leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [client, session]);

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-card">
        <button onClick={onBack} className="back-button">
          ← Back
        </button>

        <h1>🏆 Global Leaderboard</h1>

        {loading && <div className="loading">Loading leaderboard...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && leaderboard.length === 0 && (
          <p className="no-data">No players yet. Be the first to play!</p>
        )}

        {!loading && leaderboard.length > 0 && (
          <div className="leaderboard-table">
            <div className="table-header">
              <div className="col-rank">Rank</div>
              <div className="col-name">Player</div>
              <div className="col-wins">Wins</div>
              <div className="col-losses">Losses</div>
              <div className="col-streak">Win Streak</div>
              <div className="col-score">Score</div>
            </div>
            {leaderboard.map((entry, idx) => (
              <div
                key={idx}
                className={`table-row ${
                  entry.username === session.username ? 'current-player' : ''
                }`}
              >
                <div className="col-rank">
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                </div>
                <div className="col-name">
                  {entry.username}
                  {entry.username === session.username && ' (You)'}
                </div>
                <div className="col-wins">{entry.wins}</div>
                <div className="col-losses">{entry.losses}</div>
                <div className="col-streak">{entry.winStreak}</div>
                <div className="col-score">{entry.score}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
