import { create } from "zustand";
import { useRoomStore } from "./roomStore";
import { useGameStore } from "./gameStore";
import type { Room, Session } from "@/types";
import type { Player } from "@three-card-poker/shared";

interface WebSocketState {
  ws: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (roomCode: string, playerId: string) => void;
  disconnect: () => void;
  send: (data: Record<string, unknown>) => void;
}

// Keep track of reconnect attempts outside component state to survive unmounts
let reconnectAttempt = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let reconnectTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;

const startHeartbeat = (ws: WebSocket, playerId: string) => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "heartbeat", playerId }));
    }
  }, 15000); // 15 seconds
};

const stopHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  ws: null,
  isConnected: false,
  isConnecting: false,
  error: null,

  connect: (roomCode: string, playerId: string) => {
    const { ws, isConnected, isConnecting } = get();

    if (isConnected || isConnecting) {
      return;
    }

    if (ws?.readyState === WebSocket.OPEN) {
      ws.close();
    }

    set({ isConnecting: true });

    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    let wsUrl = "";
    if (import.meta.env.VITE_API_HOST) {
      // Ensure we replace http with ws correctly
      wsUrl = import.meta.env.VITE_API_HOST.replace(/^http/, "ws");
    } else {
      wsUrl = `${wsProtocol}://${window.location.host}`;
    }
    // Also we MUST append / to match backend URL pathname === "/"
    // BUT the backend proxy in vite uses /ws. Actually let's just make the backend accept /ws/ instead to be robust!
    // But since backend accepts "/", let's just use "/" if connecting directly, or "/ws/" if proxy. 
    // Wait, let's just make the backend accept /ws/ AND /, and fix URL here:
    wsUrl = wsUrl.endsWith("/") ? wsUrl : `${wsUrl}/`;
    
    // In dev, the direct hit is ws://localhost:3001/
    // If going through proxy, we use current host /ws/
    // VITE_API_HOST bypassing proxy goes straight to backend. Backend expects /. 
    const finalUrl = import.meta.env.VITE_API_HOST ? wsUrl : `${wsProtocol}://${window.location.host}/ws/`;
    
    const newWs = new WebSocket(finalUrl);

    newWs.onopen = () => {
      set({ ws: newWs, isConnected: true, isConnecting: false, error: null });
      reconnectAttempt = 0; // reset on successful connection
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
        const data = JSON.parse(event.data) as Record<string, unknown>;

        const roomStore = useRoomStore.getState();
        const gameStore = useGameStore.getState();

        switch (data.type) {
          case "roomJoined":
          case "reconnectState":
            if (data.room) {
              const players = data.players as Player[];
              const snapshot = data.snapshot as
                | Record<string, unknown>
                | undefined;

              roomStore.setRoom(
                data.room as Room,
                (data.session as Session) || null,
                (data.isHost as boolean) || false,
                playerId,
                players,
                snapshot?.presence || {},
              );

              // Always set players in gameStore
              gameStore.setPlayers(players);

              // Initialize game state if session is playing
              const session = data.session as
                | Record<string, unknown>
                | undefined;
              if (
                session?.status === "playing" ||
                session?.status === "round-end"
              ) {
                gameStore.setTotalRounds(session.totalRounds || 10);
                gameStore.setCurrentRound(session.currentRound);
                gameStore.setGameState(session.status);

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
                      snapshot.piles as Parameters<
                        typeof gameStore.setPiles
                      >[0],
                    );
                } else if (session?.scores) {
                  gameStore.syncPlayerScores(
                    session.scores as Parameters<
                      typeof gameStore.syncPlayerScores
                    >[0],
                  );
                }
              }
            }
            break;

          case "playerJoined":
            if (data.player) {
              const newPlayer = data.player as Player;
              useRoomStore.getState().addPlayer(newPlayer);
              gameStore.setPlayers(useRoomStore.getState().players);
            }
            break;

          case "playerLeft":
            if (data.playerId) {
              // Don't remove player if game is in progress - they stay for auto-pilot
              const isGameActive = gameStore.gameStatus === "playing" || gameStore.gameStatus === "round-end";

              if (!isGameActive) {
                // Only remove player if game hasn't started or has ended
                useRoomStore.getState().removePlayer(data.playerId as string);
                gameStore.setPlayers(useRoomStore.getState().players);
              }
              // If game is active, player stays in list but presence is already set to "offline"
            }
            break;

          case "sessionUpdated":
            if (data.session) {
              useRoomStore.getState().updateSession(data.session as Session);
            }
            break;

          case "gameStarted": {
            const currentRoomStore = useRoomStore.getState();
            if (currentRoomStore.session) {
              currentRoomStore.updateSession({
                ...currentRoomStore.session,
                status: "playing",
                totalRounds: currentRoomStore.players.length,
              });

              gameStore.setPlayers(currentRoomStore.players);
              gameStore.setTotalRounds(
                currentRoomStore.players.length,
              );
              gameStore.setGameState("playing");
            }
            break;
          }

          case "pilesRevealed":
            if (data.piles)
              gameStore.setPiles(
                data.piles as Parameters<typeof gameStore.setPiles>[0],
              );
            break;

          case "pileClaimed":
            if (data.pileId && data.playerId) {
              gameStore.claimPile(
                data.pileId as string,
                data.playerId as string,
                data.cards as Parameters<typeof gameStore.claimPile>[2],
              );
            }
            break;

          case "stickerSent":
            if (data.playerId && data.sticker) {
              gameStore.addSticker(
                data.playerId as string,
                data.sticker as string,
              );
            }
            break;

          case "presenceUpdate":
            if (data.playerId && data.status) {
              useRoomStore
                .getState()
                .updatePlayerPresence(
                  data.playerId as string,
                  data.status as Parameters<
                    typeof useRoomStore.getState
                  >[0]["updatePlayerPresence"] extends (
                    id: string,
                    s: infer T,
                  ) => void
                    ? T
                    : "online" | "offline",
                );
            }
            break;

          case "autoPlayed":
            // Not strictly needed if `playerScore` behaves correctly but is useful if we want to add an annotation later.
            console.log("Player auto-played:", data.playerId);
            break;

          case "playerScore":
            if (data.playerId && typeof data.score === "number") {
              gameStore.publishPlayerScore(
                data.playerId as string,
                data.score,
                undefined,
                undefined,
                data.cards as Parameters<
                  typeof gameStore.publishPlayerScore
                >[4],
              );
            }
            break;

          case "nextRound":
            if (data.allScores) {
              gameStore.syncPlayerCumulativeScores(
                (data.allScores as Array<Record<string, unknown>>).map((score) => ({
                  playerId: score.playerId as string,
                  cumulatedScore: score.cumulativeScore as number,
                }))
              );
            }
            gameStore.nextRound(
              typeof data.round === "number" ? data.round : undefined,
            );
            break;

          case "roundEnd": {
            const winner = gameStore.players.find(
              (p) => p.id === data.winnerId,
            );
            if (winner) gameStore.setRoundWinner(winner);
            break;
          }

          case "gameEnd": {
            const gameWinner = gameStore.players.find(
              (p) => p.id === data.winnerId,
            );
            if (gameWinner) gameStore.setGameWinner(gameWinner);
            break;
          }

          case "error":
            set({ error: data.message as string });
            break;

          case "playerKicked":
            get().disconnect();
            useRoomStore.getState().clearRoom();
            useGameStore.getState().resetGame();
            window.location.href = "/?kicked=true";
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    newWs.onclose = () => {
      set({ ws: null, isConnected: false, isConnecting: false });
      stopHeartbeat();

      // Auto-reconnect with exponential backoff if intended (error null means it wasn't a deliberate disconnect)
      const currentError = get().error;
      if (currentError === null) {
        if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
          const baseDelay = Math.min(
            1000 * Math.pow(2, reconnectAttempt),
            30000,
          );
          const jitter = Math.random() * 1000;
          const delay = baseDelay + jitter;
          reconnectAttempt++;

          console.log(
            `WebSocket closed. Reconnecting in ${Math.round(delay)}ms... (Attempt ${reconnectAttempt})`,
          );
          reconnectTimer = setTimeout(() => {
            get().connect(roomCode, playerId);
          }, delay);
        } else {
          set({ error: "Connection lost. Please refresh." });
        }
      }
    };

    newWs.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    set({ ws: newWs });
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      stopHeartbeat();
      // Set a strict error string or flag to prevent auto-reconnect
      set({ error: "Disconnected manually" });
      ws.close();
      set({ ws: null, isConnected: false, isConnecting: false });
    }
  },

  send: (data) => {
    const { ws } = get();
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket is not connected");
    }
  },
}));
