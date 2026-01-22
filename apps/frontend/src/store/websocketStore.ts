import { create } from "zustand";
import { useRoomStore } from "./roomStore";
import { useGameStore } from "./gameStore";
import type { Player, Room, Session } from "@/types";

interface WebSocketState {
  ws: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (roomCode: string, playerId: string) => void;
  disconnect: () => void;
  send: (data: Record<string, unknown>) => void;
}

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
    const wsUrl = import.meta.env.VITE_API_HOST
      ? import.meta.env.VITE_API_HOST
      : `${wsProtocol}://${window.location.host}/ws/`;
    const newWs = new WebSocket(wsUrl);

    newWs.onopen = () => {
      set({ ws: newWs, isConnected: true, isConnecting: false, error: null });
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
            if (data.room) {
              const players = data.players as Player[];

              roomStore.setRoom(
                data.room as Room,
                (data.session as Session) || null,
                (data.isHost as boolean) || false,
                playerId,
                players,
              );

              // Always set players in gameStore
              gameStore.setPlayers(players);

              // Initialize game state if session is playing
              const session = data.session as any;
              if (
                session?.status === "playing" ||
                session?.status === "round-end"
              ) {
                gameStore.setTotalRounds(session.totalRounds || 10);
                gameStore.setCurrentRound(session.currentRound);
                gameStore.setGameState(session.status);

                // Sync existing scores and hands if available
                if (session.scores) {
                  gameStore.syncPlayerScores(session.scores);
                }
              }
            } else {
              console.error("roomJoined message missing room data!");
            }
            break;

          case "playerJoined":
            if (data.player) {
              const newPlayer = data.player as Player;
              useRoomStore.getState().addPlayer(newPlayer);
              // Always fetch the freshest state after adding
              gameStore.setPlayers(useRoomStore.getState().players);
            }
            break;

          case "playerLeft":
            if (data.playerId) {
              useRoomStore.getState().removePlayer(data.playerId as string);
              // Always sync freshest list to gameStore
              gameStore.setPlayers(useRoomStore.getState().players);
            }
            break;

          case "sessionUpdated":
            if (data.session) {
              roomStore.updateSession(data.session as Session);
            }
            break;

          case "gameStarted": {
            const currentRoomStore = useRoomStore.getState();
            if (currentRoomStore.session) {
              currentRoomStore.updateSession({
                ...currentRoomStore.session,
                status: "playing",
              });

              gameStore.setPlayers(currentRoomStore.players);
              gameStore.setTotalRounds(
                currentRoomStore.session.totalRounds || 10,
              );
              gameStore.setGameState("playing");
            }
            break;
          }

          case "playerScore":
            if (data.playerId && typeof data.score === "number") {
              gameStore.publishPlayerScore(
                data.playerId as string,
                data.score,
                undefined,
                undefined,
                data.cards as any,
              );
            }
            break;

          case "nextRound":
            gameStore.nextRound(
              typeof data.round === "number" ? data.round : undefined,
            );
            break;

          case "roundEnd": {
            const winner = gameStore.players.find(
              (p) => p.id === data.winnerId,
            );
            if (winner) {
              gameStore.setRoundWinner(winner);
            }
            break;
          }

          case "gameEnd": {
            // Show final results
            const gameWinner = gameStore.players.find(
              (p) => p.id === data.winnerId,
            );
            if (gameWinner) {
              gameStore.setGameWinner(gameWinner);
            }
            break;
          }

          case "error":
            set({ error: data.message as string });
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    newWs.onclose = () => {
      set({ ws: null, isConnected: false, error: null });
    };

    newWs.onerror = (error) => {
      console.error("WebSocket error:", error); // Debug
      set({ error: "WebSocket connection error" });
    };

    set({ ws: newWs });
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null, isConnected: false, error: null });
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
