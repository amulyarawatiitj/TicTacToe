import React, { useState, useEffect } from 'react';
import { Client } from '@heroiclabs/nakama-js';
import './Auth.css';

interface LoginProps {
  client: Client;
  onLogin: (session: {
    userId: string;
    username: string;
    token: string;
    refreshToken: string;
  }) => void;
}

export default function Login({ client, onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Try to auto-login with stored credentials
    const storedToken = localStorage.getItem('token');
    const storedRefresh = localStorage.getItem('refresh_token');
    const storedUsername = localStorage.getItem('username');
    const storedUserId = localStorage.getItem('user_id');

    if (storedToken && storedUsername && storedUserId) {
      onLogin({
        token: storedToken,
        refreshToken: storedRefresh || '',
        username: storedUsername,
        userId: storedUserId,
      });
    }
  }, [onLogin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const deviceId = localStorage.getItem('device_id') || crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);

      const session = await client.authenticateDevice(deviceId, true, username);

      localStorage.setItem('token', session.token);
      localStorage.setItem('refresh_token', session.refresh_token);
      localStorage.setItem('username', session.username || username);
      localStorage.setItem('user_id', session.user_id!);

      onLogin({
        token: session.token,
        refreshToken: session.refresh_token,
        username: session.username || username,
        userId: session.user_id!,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Tic-Tac-Toe Multiplayer</h1>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              autoFocus
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="info-text">
          Multiplayer Tic-Tac-Toe with server-authoritative game logic
        </p>
      </div>
    </div>
  );
}
