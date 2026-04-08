import { RoomService } from "../../services/roomService.js";
import { SessionService } from "../../services/sessionService.js";
import type { WsHandlerContext } from "../types.js";

export async function handleNextRound({
  ws,
  data,
  broadcast,
  connectionInfo,
}: WsHandlerContext): Promise<void> {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode } = info;

  const payload: Record<string, unknown> = {
    type: "nextRound",
    round: data.round,
  };
  if (data.allScores) {
    payload.allScores = data.allScores;
  }
  broadcast(roomCode, payload);

  const room = await RoomService.getRoomByCode(roomCode);
  if (room?.currentSessionId) {
    const sessionItems = await SessionService.getFullStateSnapshot(
      room.currentSessionId,
      roomCode,
    );
    if (sessionItems?.piles) {
      broadcast(roomCode, { type: "pilesRevealed", piles: sessionItems.piles });
    }
  }
}
