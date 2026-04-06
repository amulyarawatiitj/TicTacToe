import React, { useState, useEffect } from 'react';
import { Client } from '@heroiclabs/nakama-js';
import './MainMenu.css';

interface MainMenuProps {
  session: {
    userId: string;
    username: string;
    token: string;
    refreshToken: string;
  };
  client: Client;
  onPlayGame: (matchId: string) => void;
  onViewLeaderboard: () => void;
  onLogout: () => void;
}

interface CreateRoomRequest {
  numPlayers?: number;
  open?: boolean;
  name?: string;
}

export default function MainMenu({
  session,
  client,
  onPlayGame,
  onViewLeaderboard,
  onLogout,
}: MainMenuProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [gameMode, setGameMode] = useState<'classic' | 'timed'>('classic');

  const loadMatches = async () => {
    setLoading(true);
    try {
      const result = await client.rpc(session as any, 'find_match', {
        mode: gameMode,
      });
      const data = JSON.parse(result.payload as unknown as string);
      setMatches(data.matches || []);
    } catch (err) {
      console.error('Failed to load matches:', err);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const createNewMatch = async () => {
    setCreating(true);
    setError('');
    try {
      const payload: CreateRoomRequest = {
        numPlayers: 2,
        open: true,
        name: `${session.username}'s Room`,
      };

      const result = await client.rpc(session as any, 'create_match', {
        ...payload,
        mode: gameMode,
      });

      const data = JSON.parse(result.payload as unknown as string);
      onPlayGame(data.match_id);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create match';
      setError(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  const joinMatch = (matchId: string) => {
    onPlayGame(matchId);
  };

  useEffect(() => {
    loadMatches();
  }, [gameMode]);

  return (
    <div className="menu-container">
      <div className="menu-card">
        <div className="menu-header">
          <h1>Tic-Tac-Toe</h1>
          <div className="user-info">
            <span className="username">👤 {session.username}</span>
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        <div className="game-mode-selector">
          <label>Game Mode:</label>
          <select value={gameMode} onChange={(e) => setGameMode(e.target.value as any)}>
            <option value="classic">Classic</option>
            <option value="timed">Timed (30s per turn)</option>
          </select>
        </div>

        <div className="menu-actions">
          <button
            onClick={createNewMatch}
            disabled={creating}
            className="action-button primary"
          >
            {creating ? 'Creating...' : '➕ Create Game Room'}
          </button>
          <button
            onClick={loadMatches}
            disabled={loading}
            className="action-button secondary"
          >
            {loading ? 'Loading...' : '🔄 Refresh Available Games'}
          </button>
          <button onClick={onViewLeaderboard} className="action-button secondary">
            🏆 Leaderboard
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="matches-list">
          <h2>Available Games ({matches.length})</h2>
          {matches.length === 0 ? (
            <p className="no-matches">
              No games available. Create one or wait for others to join!
            </p>
          ) : (
            <div className="matches-grid">
              {matches.map((match: any) => (
                <div key={match.match_id} className="match-card">
                  <h3>{match.name || 'Game Room'}</h3>
                  <p className="match-info">Players: {match.player_count}/2</p>
                  <p className="match-info">Mode: {match.mode === 'timed' ? '⏱️ Timed' : '⚔️ Classic'}</p>
                  <button
                    onClick={() => joinMatch(match.match_id)}
                    className="join-button"
                  >
                    Join Game
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
