import type { WsHandlerContext } from "../types.js";

export async function handlePlayerScore({
  ws,
  data,
  broadcast,
  connectionInfo,
}: WsHandlerContext): Promise<void> {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode } = info;
  const { playerId, score, cards } = data as {
    playerId: string;
    score: number;
    cards: unknown[];
  };

  broadcast(roomCode, { type: "playerScore", playerId, score, cards });
}
