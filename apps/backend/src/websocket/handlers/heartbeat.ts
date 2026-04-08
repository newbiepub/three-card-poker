import { AutoPilotService } from "../../services/autoPilotService.js";
import { PresenceService } from "../../services/presenceService.js";
import { RoomService } from "../../services/roomService.js";
import { SessionService } from "../../services/sessionService.js";
import type { WsHandlerContext } from "../types.js";

export async function handleHeartbeat({
  ws,
  broadcast,
  connectionInfo,
}: WsHandlerContext): Promise<void> {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode, roomId, playerId } = info;

  await PresenceService.setOnline(roomId, playerId);
  broadcast(roomCode, {
    type: "presenceUpdate",
    playerId,
    status: "online",
  });

  const room = await RoomService.getRoomByCode(roomCode);
  if (room?.currentSession) {
    const session = await SessionService.getSessionById(room.currentSession.id);
    if (session?.status === "playing") {
      await AutoPilotService.cancelAutoPlay(
        session.id,
        session.currentRound,
        playerId,
      );
    }
  }
}
