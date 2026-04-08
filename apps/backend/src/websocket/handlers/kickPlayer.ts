import { RoomService } from "../../services/roomService.js";
import type { Ws, WsHandlerContext } from "../types.js";

export async function handleKickPlayer({
  ws,
  data,
  broadcast,
  connectionInfo,
  roomConnections,
}: WsHandlerContext): Promise<void> {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode, playerId: callerId } = info;
  const { targetPlayerId } = data as { targetPlayerId: string };

  try {
    const room = await RoomService.getRoomByCode(roomCode);
    if (!room) {
      ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
      return;
    }

    if (room.hostId !== callerId) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Only host can kick players",
        }),
      );
      return;
    }

    if (targetPlayerId === callerId) {
      ws.send(
        JSON.stringify({ type: "error", message: "Cannot kick yourself" }),
      );
      return;
    }

    const connections = roomConnections.get(roomCode);
    if (!connections) return;

    let targetWs: Ws | null = null;
    let targetPlayerName = "";

    for (const [clientWs, playerInfo] of connections.entries()) {
      if (playerInfo.playerId === targetPlayerId) {
        targetWs = clientWs;
        targetPlayerName = playerInfo.playerName;
        break;
      }
    }

    if (!targetWs) {
      ws.send(
        JSON.stringify({ type: "error", message: "Player not found in room" }),
      );
      return;
    }

    targetWs.send(
      JSON.stringify({
        type: "playerKicked",
        reason: "You have been kicked by the host",
      }),
    );

    connections.delete(targetWs);
    connectionInfo.delete(targetWs);

    try {
      targetWs.close();
    } catch (error) {
      console.error("Error closing kicked player WebSocket:", error);
    }

    broadcast(roomCode, {
      type: "playerLeft",
      playerId: targetPlayerId,
      playerName: targetPlayerName,
      totalPlayers: connections.size,
    });
  } catch (error) {
    console.error("Error kicking player:", error);
    ws.send(
      JSON.stringify({ type: "error", message: "Failed to kick player" }),
    );
  }
}
