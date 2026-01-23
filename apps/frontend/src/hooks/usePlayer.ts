import { useState } from "react";
import type { PlayerProfile, PlayerStats } from "@/types";

const API_BASE = "http://localhost:3001/api";

export function usePlayer() {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerPlayer = async (name: string): Promise<PlayerProfile> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/players/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Failed to register player");
      }

      const data = await response.json();
      setPlayer(data.player);
      setStats(data.stats);

      return data.player;
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      setError(error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getPlayer = async (
    name: string,
  ): Promise<{ player: PlayerProfile; stats: PlayerStats; rank: number }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/players/${encodeURIComponent(name)}`,
      );

      if (!response.ok) {
        throw new Error("Failed to get player");
      }

      const data = await response.json();
      setPlayer(data.player);
      setStats(data.stats);

      return data;
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      setError(error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getPlayerHistory = async (playerId: string, limit = 20) => {
    try {
      const response = await fetch(
        `${API_BASE}/players/${playerId}/history?limit=${limit}`,
      );

      if (!response.ok) {
        throw new Error("Failed to get player history");
      }

      return await response.json();
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      setError(error);
      throw err;
    }
  };

  return {
    player,
    stats,
    isLoading,
    error,
    registerPlayer,
    getPlayer,
    getPlayerHistory,
  };
}
