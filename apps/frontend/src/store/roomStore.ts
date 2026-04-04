import { create } from "zustand";
import type { Room, Session } from "@/types";
import type { Player } from "@three-card-poker/shared";

interface RoomState {
  room: Room | null;
  session: Session | null;
  players: Player[];
  presence: Record<string, "online" | "offline">;
  isHost: boolean;
  currentUserId: string | null;
  setRoom: (
    room: Room,
    session: Session | null,
    isHost: boolean,
    currentUserId: string,
    players?: Player[],
    presence?: Record<string, "online" | "offline">,
  ) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  setPresence: (presence: Record<string, "online" | "offline">) => void;
  updatePlayerPresence: (
    playerId: string,
    status: "online" | "offline",
  ) => void;
  updateSession: (session: Session) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  session: null,
  players: [],
  presence: {},
  isHost: false,
  currentUserId: null,

  setRoom: (room, session, isHost, currentUserId, players, presence) => {
    set({
      room,
      session,
      isHost,
      currentUserId,
      players: players || [],
      presence: presence || {},
    });
  },

  addPlayer: (player) =>
    set((state) => ({
      players: state.players.some((p) => p.id === player.id)
        ? state.players
        : [...state.players, player],
    })),

  removePlayer: (playerId) =>
    set((state) => {
      const newPresence = { ...state.presence };
      delete newPresence[playerId];
      return {
        players: state.players.filter((p) => p.id !== playerId),
        presence: newPresence,
      };
    }),

  setPresence: (presence) => set({ presence }),

  updatePlayerPresence: (playerId, status) =>
    set((state) => ({
      presence: { ...state.presence, [playerId]: status },
    })),

  updateSession: (session) => set({ session }),

  clearRoom: () =>
    set({
      room: null,
      session: null,
      players: [],
      presence: {},
      isHost: false,
      currentUserId: null,
    }),
}));
