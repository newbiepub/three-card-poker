import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CreateRoomRequest, JoinRoomRequest } from '@/types';

const API_BASE = 'http://localhost:3001/api';

export function useRoom() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const createRoom = async (request: CreateRoomRequest): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create room');
      }

      const data = await response.json();
      
      // Store room data in localStorage for the room page
      localStorage.setItem('current-room', JSON.stringify({
        room: data.room,
        session: data.session,
        isHost: true,
      }));
      
      // Navigate to room page
      navigate(`/room/${data.room.roomCode}`);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      setError(error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async (request: JoinRoomRequest): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join room');
      }

      const data = await response.json();
      
      // Store room data in localStorage for the room page
      localStorage.setItem('current-room', JSON.stringify({
        room: data.room,
        session: data.session,
        isHost: data.isHost,
      }));
      
      // Navigate to room page
      navigate(`/room/${request.roomCode}`);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      setError(error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getRoom = async (roomCode: string) => {
    try {
      const response = await fetch(`${API_BASE}/rooms/${roomCode}`);
      
      if (!response.ok) {
        throw new Error('Room not found');
      }

      return await response.json();
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      setError(error);
      throw err;
    }
  };

  const leaveRoom = () => {
    localStorage.removeItem('current-room');
    navigate('/');
  };

  return {
    isLoading,
    error,
    createRoom,
    joinRoom,
    getRoom,
    leaveRoom,
  };
}
