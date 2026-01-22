import { create } from 'zustand';
import type { Room, Session, Player } from '@/types';

interface RoomState {
  room: Room | null;
  session: Session | null;
  players: Player[];
  isHost: boolean;
  currentUserId: string | null;
  setRoom: (room: Room, session: Session | null, isHost: boolean, currentUserId: string, players?: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updateSession: (session: Session) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  session: null,
  players: [],
  isHost: false,
  currentUserId: null,
  
  setRoom: (room, session, isHost, currentUserId, players) => {
    set({ room, session, isHost, currentUserId, players: players || [] });
  },
  
  addPlayer: (player) => 
    set((state) => ({
      players: state.players.some(p => p.id === player.id) 
        ? state.players 
        : [...state.players, player]
    })),
  
  removePlayer: (playerId) => 
    set((state) => ({
      players: state.players.filter(p => p.id !== playerId)
    })),
  
  updateSession: (session) => 
    set({ session }),
  
  clearRoom: () => 
    set({ room: null, session: null, players: [], isHost: false, currentUserId: null }),
}));
