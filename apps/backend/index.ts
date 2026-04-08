import type { Server, ServerWebSocket } from "bun";
import { app } from "./src/app.js";
import { broadcastToRoom } from "./src/websocket/connectionManager.js";
import { onDisconnect, routeMessage } from "./src/websocket/router.js";
import { AutoPilotService } from "./src/services/autoPilotService.js";
import { RoomService } from "./src/services/roomService.js";
import { SessionService } from "./src/services/sessionService.js";

// ─── AutoPilot callback ─────────────────────────────────────────────────────
AutoPilotService.startPolling(
  async (sessionId, _roundNumber, playerId, cards, score) => {
    const session = await SessionService.getSessionById(sessionId);
    if (!session) return;
    const room = await RoomService.getRoomById(session.roomId);
    if (!room) return;

    broadcastToRoom(room.roomCode, { type: "autoPlayed", playerId });
    broadcastToRoom(room.roomCode, {
      type: "playerScore",
      playerId,
      score,
      cards,
    });
  },
);

// ─── Bun server ─────────────────────────────────────────────────────────────
const port = process.env.PORT ?? 3001;

export default {
  fetch(req: Request, server: Server<undefined>): Response | undefined {
    const url = new URL(req.url);
    const isWsUpgrade =
      req.headers.get("upgrade") === "websocket" &&
      (url.pathname === "/" || url.pathname === "/ws/");

    if (isWsUpgrade) {
      const upgraded = server.upgrade(req);
      return upgraded
        ? undefined
        : new Response("WebSocket upgrade failed", { status: 400 });
    }

    return app.fetch(req, server) as unknown as Response;
  },

  port,

  websocket: {
    message: (ws: ServerWebSocket<undefined>, message: string | Buffer) =>
      routeMessage(ws, message),

    open: () => {
      console.log("[WS] New connection established");
    },

    close: (ws: ServerWebSocket<undefined>) =>
      onDisconnect(ws),

    error: (_ws, error: Error) =>
      console.error("WebSocket error:", error),
  },
};
