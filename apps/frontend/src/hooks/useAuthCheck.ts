import { useState, useEffect } from "react";
import { usePlayerStore, useWebSocketStore } from "@/store";
import { verifyPlayer } from "@/api/players";

export function useAuthCheck() {
  const [isChecking, setIsChecking] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const { player, logout } = usePlayerStore();
  const { disconnect } = useWebSocketStore();

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      if (!player) {
        if (mounted) {
          setIsChecking(false);
          setNetworkError(false);
        }
        return;
      }

      try {
        const response = await verifyPlayer(player.id);

        if (mounted) {
          if (!response.exists) {
            // Player no longer exists in DB (deleted)
            disconnect();
            logout();
          }
          setNetworkError(false);
          setIsChecking(false);
        }
      } catch (error: unknown) {
        if (!mounted) return;

        // Safely check error status
        const err = error as { status?: number };

        // If it's a 404, the player was not found
        if (err?.status === 404) {
          disconnect();
          logout();
          setNetworkError(false);
        }
        // If there's no status, it's likely a network error (server down, no internet)
        else if (!err?.status || err.status >= 500) {
          setNetworkError(true);
        }

        setIsChecking(false);
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [player, logout, disconnect]);

  return { isChecking, networkError };
}
