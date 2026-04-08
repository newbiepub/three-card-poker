import type { Ws, WsConnectionInfo } from "./types.js";

/** Keyed by roomCode → (ws → playerInfo) */
export const roomConnections = new Map<
  string,
  Map<Ws, { playerId: string; playerName: string }>
>();

/** Keyed by ws → connection metadata */
export const connectionInfo = new Map<Ws, WsConnectionInfo>();

/** Broadcast a message to all open connections in a room, optionally excluding one sender */
export function broadcastToRoom(
  roomCode: string,
  message: unknown,
  excludeWs?: Ws,
): void {
  const connections = roomConnections.get(roomCode);
  if (!connections) return;

  const messageStr = JSON.stringify(message);

  connections.forEach((_playerInfo, ws) => {
    if (ws !== excludeWs && ws.readyState === 1) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  });
}
