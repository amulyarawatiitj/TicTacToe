import React, { useEffect, useState } from 'react';
import { Client } from '@nakama/js';
import './App.css';
import Login from './components/Login';
import MainMenu from './components/MainMenu';
import GameRoom from './components/GameRoom';
import Leaderboard from './components/Leaderboard';

type AppScreen = 'login' | 'menu' | 'game' | 'leaderboard';

interface GameSession {
  userId: string;
  username: string;
  token: string;
  refreshToken: string;
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [session, setSession] = useState<GameSession | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [matchId, setMatchId] = useState<string>('');

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:7350';
    const newClient = new Client('defaultkey', backendUrl);
    setClient(newClient);
  }, []);

  const handleLogin = (gameSession: GameSession) => {
    setSession(gameSession);
    setScreen('menu');
  };

  const handlePlayGame = (mid: string) => {
    setMatchId(mid);
    setScreen('game');
  };

  const handleBackToMenu = () => {
    setScreen('menu');
    setMatchId('');
  };

  const handleLogout = () => {
    setSession(null);
    setScreen('login');
    setMatchId('');
  };

  return (
    <div className="app-container">
      {screen === 'login' && client && <Login client={client} onLogin={handleLogin} />}
      {screen === 'menu' && session && client && (
        <MainMenu
          session={session}
          client={client}
          onPlayGame={handlePlayGame}
          onViewLeaderboard={() => setScreen('leaderboard')}
          onLogout={handleLogout}
        />
      )}
      {screen === 'game' && session && client && matchId && (
        <GameRoom
          session={session}
          client={client}
          matchId={matchId}
          onBack={handleBackToMenu}
        />
      )}
      {screen === 'leaderboard' && session && client && (
        <Leaderboard
          client={client}
          session={session}
          onBack={() => setScreen('menu')}
        />
      )}
    </div>
  );
}
