import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlayerProfile } from "@/types";

interface PlayerState {
  player: PlayerProfile | null;
  isAuthenticated: boolean;
  setPlayer: (player: PlayerProfile) => void;
  logout: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      player: null,
      isAuthenticated: false,
      setPlayer: (player) => set({ player, isAuthenticated: true }),
      logout: () => set({ player: null, isAuthenticated: false }),
    }),
    {
      name: "three-card-poker-player",
    },
  ),
);
