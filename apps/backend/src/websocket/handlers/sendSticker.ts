import type { WsHandlerContext } from "../types.js";

export async function handleSendSticker({
  ws,
  data,
  broadcast,
  connectionInfo,
}: WsHandlerContext): Promise<void> {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode } = info;
  const { playerId, stickerId } = data as {
    playerId: string;
    stickerId: string;
  };

  broadcast(roomCode, { type: "stickerSent", playerId, sticker: stickerId });
}
