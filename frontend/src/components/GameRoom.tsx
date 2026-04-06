import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@nakama/js';
import './GameRoom.css';

interface GameRoomProps {
  session: {
    userId: string;
    username: string;
    token: string;
    refreshToken: string;
  };
  client: Client;
  matchId: string;
  onBack: () => void;
}

interface GameState {
  board: (string | null)[];
  currentPlayer: string;
  winner: string | null;
  moves: number;
  isTimed?: boolean;
  timeRemaining?: number;
  players: Record<string, { username: string; symbol: string }>;
}

export default function GameRoom({
  session,
  client,
  matchId,
  onBack,
}: GameRoomProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const socketRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeMatch = async () => {
      try {
        // Get initial game state
        try {
          const result = await client.rpc(session.token, 'get_match_state', {
            match_id: matchId,
          });
          const state = JSON.parse(result.payload);
          setGameState(state);
        } catch (e) {
          // Initialize fresh game state
          setGameState({
            board: Array(9).fill(null),
            currentPlayer: session.userId,
            winner: null,
            moves: 0,
            players: {
              [session.userId]: { username: session.username, symbol: 'X' },
            },
          });
        }

        // Connect to real-time updates
        const newSocket = client.createSocket();
        socketRef.current = newSocket;
        setSocket(newSocket);

        await newSocket.connect(session.token);
        await newSocket.joinMatch(matchId);

        newSocket.onmatchpresence = (matchPresence: any) => {
          console.log('Match presence update:', matchPresence);
        };

        newSocket.onmatchdata = (matchData: any) => {
          try {
            const data = JSON.parse(matchData.data);
            if (data.type === 'move') {
              setGameState((prev) =>
                prev
                  ? {
                      ...prev,
                      board: data.board,
                      currentPlayer: data.currentPlayer,
                      winner: data.winner,
                      moves: data.moves,
                      timeRemaining: data.timeRemaining,
                    }
                  : null
              );
            }
          } catch (err) {
            console.error('Failed to parse match data:', err);
          }
        };

        setLoading(false);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize match';
        setError(errorMsg);
        setLoading(false);
      }
    };

    initializeMatch();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [matchId, session, client]);

  const makeMove = async (index: number) => {
    if (!gameState || !socket) return;

    if (gameState.board[index] !== null) {
      setError('Square already played!');
      return;
    }

    if (gameState.currentPlayer !== session.userId) {
      setError('Not your turn!');
      return;
    }

    if (gameState.winner) {
      setError('Game already finished!');
      return;
    }

    try {
      await socket.sendMatchState(matchId, 1, {
        type: 'move',
        position: index,
        playerId: session.userId,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to make move';
      setError(errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="game-room-container">
        <div className="loading">Loading game...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="game-room-container">
        <div className="error">{error || 'Failed to load game'}</div>
        <button onClick={onBack} className="back-button">
          Back to Menu
        </button>
      </div>
    );
  }

  const isCurrentPlayerTurn = gameState.currentPlayer === session.userId;
  const playerSymbol = gameState.players[session.userId]?.symbol || 'X';
  const opponentId = Object.keys(gameState.players).find((id) => id !== session.userId);
  const opponentUsername = opponentId
    ? gameState.players[opponentId]?.username
    : 'Waiting for opponent...';

  return (
    <div className="game-room-container">
      <div className="game-card">
        <button onClick={onBack} className="back-button">
          ← Back to Menu
        </button>

        <div className="game-header">
          <h1>Tic-Tac-Toe</h1>
          <div className="player-status">
            <div className={`player ${isCurrentPlayerTurn ? 'active' : ''}`}>
              <strong>You ({playerSymbol})</strong>
              <p>{session.username}</p>
            </div>
            <span className="vs">VS</span>
            <div className={`player ${!isCurrentPlayerTurn && opponentId ? 'active' : ''}`}>
              <strong>Opponent ({gameState.players[opponentId!]?.symbol || 'O'})</strong>
              <p>{opponentUsername}</p>
            </div>
          </div>
        </div>

        {gameState.isTimed && gameState.timeRemaining && (
          <div className="timer">
            ⏱️ Time Remaining: {Math.ceil(gameState.timeRemaining / 1000)}s
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="board-container">
          <div className="board">
            {gameState.board.map((cell, index) => (
              <button
                key={index}
                onClick={() => makeMove(index)}
                className={`cell ${cell === 'X' ? 'x' : cell === 'O' ? 'o' : ''}`}
                disabled={
                  !isCurrentPlayerTurn ||
                  gameState.board[index] !== null ||
                  gameState.winner !== null
                }
              >
                {cell}
              </button>
            ))}
          </div>
        </div>

        <div className="game-info">
          {gameState.winner ? (
            <div className="winner-message">
              🎉{' '}
              {gameState.winner === session.userId
                ? 'You Won!'
                : 'Opponent Won!'}{' '}
              🎉
            </div>
          ) : (
            <div className="turn-message">
              {isCurrentPlayerTurn ? '👉 Your Turn' : '⏳ Opponent\'s Turn'}
            </div>
          )}
          <p className="moves-count">Moves: {gameState.moves}</p>
        </div>

        {gameState.winner && (
          <button onClick={onBack} className="finish-button">
            Back to Menu
          </button>
        )}
      </div>
    </div>
  );
}
