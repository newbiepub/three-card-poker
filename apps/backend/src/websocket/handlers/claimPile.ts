import { AutoPilotService } from "../../services/autoPilotService.js";
import { PileService } from "../../services/pileService.js";
import type { WsHandlerContext } from "../types.js";

export async function handleClaimPile({
  ws,
  data,
  broadcast,
  connectionInfo,
}: WsHandlerContext): Promise<void> {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode } = info;
  const { sessionId, roundNumber, pileId, playerId } = data as {
    sessionId: string;
    roundNumber: number;
    pileId: string;
    playerId: string;
  };

  try {
    const pile = await PileService.claimPile(
      sessionId,
      roundNumber,
      pileId,
      playerId,
    );
    await AutoPilotService.cancelAutoPlay(sessionId, roundNumber, playerId);

    broadcast(roomCode, {
      type: "pileClaimed",
      pileId,
      playerId,
      cards: JSON.parse(pile.cards),
    });
  } catch (error) {
    ws.send(
      JSON.stringify({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to claim pile",
      }),
    );
  }
}
