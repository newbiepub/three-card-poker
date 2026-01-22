import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RoomLobby } from '@/components/room/RoomLobby';
import { ConnectionStatus } from '@/components/ui/connection-status';
import { usePlayerStore, useRoomStore, useWebSocketStore } from '@/store';

export function RoomLobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  const { player } = usePlayerStore();
  const { room, session, players, isHost, currentUserId, setRoom, clearRoom } = useRoomStore();
  const { connect, disconnect, isConnected, error: wsError } = useWebSocketStore();

  useEffect(() => {
    const storedData = localStorage.getItem('current-room');
    if (!storedData) {
      navigate('/');
      return;
    }

    try {
      const data = JSON.parse(storedData);
      setRoom(data.room, data.session, data.isHost, player?.id || '', []);
      
      if (roomCode && player?.id) {
        connect(roomCode, player.id);
      }
    } catch {
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, roomCode, player, setRoom, connect]);

  useEffect(() => {
    if (session?.status === 'playing') {
      navigate(`/game/${roomCode}`);
    }
  }, [session?.status, roomCode, navigate]);

  const handleStartSession = async () => {
    if (!session || !isHost || !currentUserId) return;
    
    try {
      const { send } = useWebSocketStore.getState();
      send({
        type: 'startGame',
        sessionId: session.id,
        hostId: currentUserId
      });
    } catch {
    }
  };

  const handleLeaveRoom = () => {
    disconnect();
    clearRoom();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground font-body">Loading room...</p>
          {!isConnected && (
            <p className="mt-2 text-sm text-orange-500 font-body">Connecting to room...</p>
          )}
        </div>
      </div>
    );
  }

  if (!room || !currentUserId || !player) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-body">Room not found</p>
          {wsError && (
            <p className="mt-2 text-sm text-orange-500 font-body">{wsError}</p>
          )}
          <button 
            onClick={() => navigate('/')}
            className="mt-4 text-primary hover:underline font-body"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background crt-scanlines">
      <ConnectionStatus />
      <RoomLobby
        room={room}
        session={session}
        players={players}
        currentUserId={currentUserId}
        isHost={isHost}
        onStartSession={handleStartSession}
        onLeaveRoom={handleLeaveRoom}
      />
    </div>
  );
}
