import { create } from "zustand";
import { useRoomStore } from "./roomStore";
import { useGameStore } from "./gameStore";
import type { Room, Session } from "@/types";
import type { Card, Pile, Player } from "@three-card-poker/shared";
import { toast } from "sonner";

interface WebSocketState {
  ws: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (roomCode: string, playerId: string) => void;
  disconnect: () => void;
  send: (data: Record<string, unknown>) => void;
}

// Keep track of reconnect state outside component state to survive unmounts
let reconnectAttempt = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
// Explicit flag so onclose doesn't auto-reconnect after intentional disconnect
let intentionalDisconnect = false;

const startHeartbeat = (ws: WebSocket, playerId: string) => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "heartbeat", playerId }));
    }
  }, 15000);
};

const stopHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

/** Build the WebSocket URL based on env config */
function buildWsUrl(): string {
  const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";

  if (import.meta.env.VITE_API_HOST) {
    // Direct backend connection — replace http(s) with ws(s)
    const base = (import.meta.env.VITE_API_HOST as string).replace(
      /^https?/,
      wsProtocol,
    );
    return base.endsWith("/") ? base : `${base}/`;
  }

  // Via Vite dev proxy at /ws/
  return `${wsProtocol}://${window.location.host}/ws/`;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  ws: null,
  isConnected: false,
  isConnecting: false,
  error: null,

  connect: (roomCode: string, playerId: string) => {
    const { ws, isConnected, isConnecting } = get();

    if (isConnected || isConnecting) return;

    if (ws?.readyState === WebSocket.OPEN) {
      ws.close();
    }

    intentionalDisconnect = false;
    set({ isConnecting: true });

    const newWs = new WebSocket(buildWsUrl());

    newWs.onopen = () => {
      set({ ws: newWs, isConnected: true, isConnecting: false, error: null });
      reconnectAttempt = 0;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      startHeartbeat(newWs, playerId);

      newWs.send(
        JSON.stringify({
          type: "joinRoom",
          roomCode,
          playerId,
        }),
      );
    };

    newWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as Record<string, unknown>;

        const roomStore = useRoomStore.getState();
        const gameStore = useGameStore.getState();

        switch (data.type) {
          // Backend always sends roomJoined (even on reconnect — carries snapshot when in-game)
          case "roomJoined": {
            if (!data.room) break;

            const players = data.players as Player[];
            const snapshot = data.snapshot as Record<string, unknown> | undefined;

            roomStore.setRoom(
              data.room as Room,
              (data.session as Session) || null,
              (data.isHost as boolean) || false,
              playerId,
              players,
              (snapshot?.presence as Record<string, "online" | "offline">) || {},
            );

            gameStore.setPlayers(players);

            const session = data.session as Record<string, unknown> | undefined;
            if (
              session?.status === "playing" ||
              session?.status === "round-end"
            ) {
              gameStore.setTotalRounds((session.totalRounds as number) || 10);
              gameStore.setCurrentRound(session.currentRound as number);
              // session.status is "playing" | "round-end" — matches GameState["gameStatus"]
              gameStore.setGameState(
                session.status as "playing" | "round-end",
              );

              if (snapshot) {
                if (snapshot.scores)
                  gameStore.syncPlayerScores(
                    snapshot.scores as Parameters<
                      typeof gameStore.syncPlayerScores
                    >[0],
                  );
                if (snapshot.allScores)
                  gameStore.syncPlayerCumulativeScores(
                    snapshot.allScores as Parameters<
                      typeof gameStore.syncPlayerCumulativeScores
                    >[0],
                  );
                if (snapshot.piles)
                  gameStore.setPiles(
                    snapshot.piles as Pile[],
                  );
              } else if (session?.scores) {
                gameStore.syncPlayerScores(
                  session.scores as Parameters<
                    typeof gameStore.syncPlayerScores
                  >[0],
                );
              }
            }
            break;
          }

          case "playerJoined": {
            if (!data.player) break;
            const newPlayer = data.player as Player;
            useRoomStore.getState().addPlayer(newPlayer);
            gameStore.setPlayers(useRoomStore.getState().players);
            break;
          }

          case "playerLeft": {
            if (!data.playerId) break;
            // Keep player in game list if game is active (they stay for auto-pilot)
            const isGameActive =
              gameStore.gameStatus === "playing" ||
              gameStore.gameStatus === "round-end";
            if (!isGameActive) {
              useRoomStore.getState().removePlayer(data.playerId as string);
              gameStore.setPlayers(useRoomStore.getState().players);
            }
            break;
          }

          case "presenceUpdate": {
            if (!data.playerId || !data.status) break;
            const status =
              data.status === "online" || data.status === "offline"
                ? data.status
                : "offline";
            useRoomStore
              .getState()
              .updatePlayerPresence(data.playerId as string, status);
            break;
          }

          case "gameStarted": {
            const currentRoomStore = useRoomStore.getState();
            if (!currentRoomStore.session) break;

            currentRoomStore.updateSession({
              ...currentRoomStore.session,
              status: "playing",
              totalRounds: currentRoomStore.players.length,
            });

            gameStore.setPlayers(currentRoomStore.players);
            gameStore.setTotalRounds(currentRoomStore.players.length);
            gameStore.setGameState("playing");
            break;
          }

          case "pilesRevealed": {
            if (data.piles)
              gameStore.setPiles(data.piles as Pile[]);
            break;
          }

          case "pileClaimed": {
            if (data.pileId && data.playerId) {
              gameStore.claimPile(
                data.pileId as string,
                data.playerId as string,
                data.cards as Card[] | undefined,
              );
            }
            break;
          }

          case "stickerSent": {
            if (data.playerId && data.sticker) {
              gameStore.addSticker(
                data.playerId as string,
                data.sticker as string,
              );
            }
            break;
          }

          case "autoPlayed": {
            // Player auto-played by server — no frontend state change needed,
            // the subsequent "playerScore" event carries the actual score.
            console.log("[WS] Player auto-played:", data.playerId);
            break;
          }

          case "playerScore": {
            if (data.playerId && typeof data.score === "number") {
              gameStore.publishPlayerScore(
                data.playerId as string,
                data.score,
                undefined,
                undefined,
                data.cards as Card[] | undefined,
              );
            }
            break;
          }

          case "nextRound": {
            gameStore.nextRound(
              typeof data.round === "number" ? data.round : undefined,
            );
            if (data.allScores) {
              gameStore.syncPlayerCumulativeScores(
                data.allScores as Parameters<
                  typeof gameStore.syncPlayerCumulativeScores
                >[0],
              );
            }
            break;
          }

          case "playerKicked": {
            get().disconnect();
            useRoomStore.getState().clearRoom();
            useGameStore.getState().resetGame();
            window.location.href = "/?kicked=true";
            break;
          }

          case "error": {
            const errorMsg = data.message as string;
            set({ error: errorMsg });
            if (errorMsg.includes("claim") || errorMsg.includes("claimed") || errorMsg.includes("round")) {
              toast.error(errorMsg, { description: "Race condition conflict! Please try again." });
            } else {
              toast.error(errorMsg);
            }
            break;
          }

          // Explicitly ignored — backend sends "connected" on ws.open before joinRoom
          case "connected":
            break;

          default:
            console.warn("[WS] Unhandled event type:", data.type);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    newWs.onclose = () => {
      set({ ws: null, isConnected: false, isConnecting: false });
      stopHeartbeat();

      if (intentionalDisconnect) return;

      if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
        const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        reconnectAttempt++;

        console.log(
          `[WS] Closed. Reconnecting in ${Math.round(delay)}ms... (Attempt ${reconnectAttempt})`,
        );
        reconnectTimer = setTimeout(() => {
          get().connect(roomCode, playerId);
        }, delay);
      } else {
        set({ error: "Connection lost. Please refresh." });
      }
    };

    newWs.onerror = (error) => {
      console.error("[WS] Error:", error);
    };

    set({ ws: newWs });
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      intentionalDisconnect = true;
      stopHeartbeat();
      ws.close();
      set({ ws: null, isConnected: false, isConnecting: false, error: null });
    }
  },

  send: (data) => {
    const { ws } = get();
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.warn("[WS] Not connected, dropping message:", data.type);
    }
  },
}));
