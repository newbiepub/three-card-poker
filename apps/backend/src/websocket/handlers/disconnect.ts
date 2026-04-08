import { AutoPilotService } from "../../services/autoPilotService.js";
import { PresenceService } from "../../services/presenceService.js";
import { RoomService } from "../../services/roomService.js";
import { SessionService } from "../../services/sessionService.js";
import type { Ws, WsHandlerContext } from "../types.js";

export function handleDisconnect(
  ws: Ws,
  broadcast: WsHandlerContext["broadcast"],
  connectionInfo: WsHandlerContext["connectionInfo"],
  roomConnections: WsHandlerContext["roomConnections"],
): void {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode, playerId, playerName, roomId } = info;

  const connections = roomConnections.get(roomCode);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) roomConnections.delete(roomCode);
  }
  connectionInfo.delete(ws);

  broadcast(roomCode, {
    type: "playerLeft",
    playerId,
    playerName,
    totalPlayers: connections?.size ?? 0,
  });

  PresenceService.setOffline(roomId, playerId);
  broadcast(roomCode, {
    type: "presenceUpdate",
    playerId,
    status: "offline",
  });

  // Schedule AutoPilot if a game is in progress
  RoomService.getRoomByCode(roomCode).then((room) => {
    if (room?.currentSessionId) {
      SessionService.getSessionById(room.currentSessionId).then((session) => {
        if (session?.status === "playing") {
          AutoPilotService.scheduleAutoPlay(
            session.id,
            session.currentRound,
            playerId,
          );
        }
      });
    }
  });
}
