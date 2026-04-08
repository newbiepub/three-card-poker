import {
  broadcastToRoom,
  connectionInfo,
  roomConnections,
} from "./connectionManager.js";
import { handleClaimPile } from "./handlers/claimPile.js";
import { handleDisconnect } from "./handlers/disconnect.js";
import { handleHeartbeat } from "./handlers/heartbeat.js";
import { handleJoinRoom } from "./handlers/joinRoom.js";
import { handleKickPlayer } from "./handlers/kickPlayer.js";
import { handleNextRound } from "./handlers/nextRound.js";
import { handlePlayerScore } from "./handlers/playerScore.js";
import { handleSendSticker } from "./handlers/sendSticker.js";
import { handleStartGame } from "./handlers/startGame.js";
import type { Ws, WsHandlerContext } from "./types.js";

function buildContext(ws: Ws, data: Record<string, unknown>): WsHandlerContext {
  return {
    ws,
    data,
    broadcast: broadcastToRoom,
    connectionInfo,
    roomConnections,
  };
}

export async function routeMessage(
  ws: Ws,
  raw: string | Buffer,
): Promise<void> {
  let data: Record<string, unknown>;

  try {
    data = JSON.parse(raw.toString());
  } catch {
    console.error("WS: failed to parse message");
    return;
  }

  const ctx = buildContext(ws, data);

  try {
    switch (data.type) {
      case "joinRoom":
        await handleJoinRoom(ctx);
        break;
      case "startGame":
        await handleStartGame(ctx);
        break;
      case "claimPile":
        await handleClaimPile(ctx);
        break;
      case "playerScore":
        await handlePlayerScore(ctx);
        break;
      case "nextRound":
        await handleNextRound(ctx);
        break;
      case "kickPlayer":
        await handleKickPlayer(ctx);
        break;
      case "sendSticker":
        await handleSendSticker(ctx);
        break;
      case "heartbeat":
        await handleHeartbeat(ctx);
        break;
      default:
        console.log("WS: unknown message type:", data.type);
    }
  } catch (error) {
    console.error("WS: unhandled error in handler:", error);
  }
}

export function onDisconnect(ws: Ws): void {
  handleDisconnect(ws, broadcastToRoom, connectionInfo, roomConnections);
}
