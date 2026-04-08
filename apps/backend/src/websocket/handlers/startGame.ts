import { SessionService } from "../../services/sessionService.js";
import type { WsHandlerContext } from "../types.js";

export async function handleStartGame({
  ws,
  data,
  broadcast,
  connectionInfo,
  roomConnections,
}: WsHandlerContext): Promise<void> {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode } = info;
  const { sessionId, hostId } = data as { sessionId: string; hostId: string };

  try {
    const isHost = await SessionService.isHost(sessionId, hostId);
    if (!isHost) {
      ws.send(
        JSON.stringify({ type: "error", message: "Only host can start game" }),
      );
      return;
    }

    const roomConnectionsList = Array.from(
      roomConnections.get(roomCode)?.values() ?? [],
    );
    const playerIds = roomConnectionsList.map((c) => c.playerId);
    await SessionService.startSession(sessionId, playerIds.length, playerIds);

    broadcast(roomCode, {
      type: "gameStarted",
      sessionId,
      gameId: "game-" + Math.random().toString(36).substring(2, 9),
    });

    const sessionItems = await SessionService.getFullStateSnapshot(
      sessionId,
      roomCode,
    );
    if (sessionItems?.piles) {
      broadcast(roomCode, { type: "pilesRevealed", piles: sessionItems.piles });
    }
  } catch (error) {
    console.error("Failed to start game:", error);
    ws.send(JSON.stringify({ type: "error", message: "Failed to start game" }));
  }
}
