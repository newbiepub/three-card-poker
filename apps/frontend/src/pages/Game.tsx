import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MultiplayerGameBoard } from '@/components/MultiplayerGameBoard';
import { ConnectionStatus } from '@/components/ui/connection-status';
import { usePlayerStore, useRoomStore, useWebSocketStore, useGameStore } from '@/store';
import { useSessionState } from '@/api/sessions';

export function GamePage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  
  const { player } = usePlayerStore();
  const { room, session } = useRoomStore();
  const { disconnect } = useWebSocketStore();
  const { setTotalRounds, setGameState, setCurrentRound, resetGame } = useGameStore();

  const { data: sessionState } = useSessionState(session?.id, !!session?.id);
  
  useEffect(() => {
    if (sessionState) {
      setTotalRounds(sessionState.session.totalRounds);
      setCurrentRound(sessionState.currentRound);
      setGameState(sessionState.session.status === 'finished' ? 'game-end' : 'playing');
    } else if (session) {
      setTotalRounds(session.totalRounds || 10);
      setGameState('playing');
    }
  }, [sessionState, session, setTotalRounds, setGameState, setCurrentRound]);
  useEffect(() => {
    if (!session || session.status !== 'playing') {
      navigate(`/room/${roomCode}`);
    }
  }, [session, roomCode, navigate]);

  const handleLeaveGame = () => {
    resetGame();
    disconnect();
    navigate('/');
  };

  if (!room || !session || !player) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground font-body">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background crt-scanlines">
      <ConnectionStatus />
      <div className="container mx-auto p-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold font-heading">{room.name}</h1>
            <p className="text-muted-foreground font-body">Room Code: {room.roomCode}</p>
          </div>
          <button 
            onClick={handleLeaveGame}
            className="px-4 py-2 border border-border rounded-md hover:bg-accent font-body"
          >
            Leave Game
          </button>
        </div>
        
        <MultiplayerGameBoard />
      </div>
    </div>
  );
}
