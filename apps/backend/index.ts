import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import gameRoutes from "./src/routes/gameRoutes.ts";
import { db } from "./src/db/index.ts";
import { RoomService } from "./src/services/roomService.js";
import { PlayerService } from "./src/services/playerService.js";
import { SessionService } from "./src/services/sessionService.js";
import { PresenceService } from "./src/services/presenceService.js";
import { AutoPilotService } from "./src/services/autoPilotService.js";
import { PileService } from "./src/services/pileService.js";

// Initialize AutoPilotService polling with broadcast callback
AutoPilotService.startPolling(
  async (sessionId, roundNumber, playerId, cards, score) => {
    // Need roomCode. SessionId has it.
    const session = await SessionService.getSessionById(sessionId);
    if (!session) return;
    const room = await RoomService.getRoomById(session.roomId);
    if (!room) return;

    // Emit autoPlayed
    broadcastToRoom(room.roomCode, {
      type: "autoPlayed",
      playerId,
    });

    // Emit playerScore
    broadcastToRoom(room.roomCode, {
      type: "playerScore",
      playerId,
      score,
      cards,
    });
  },
);

// Initialize database connection

// Store connections by room
const roomConnections = new Map<
  string,
  Map<any, { playerId: string; playerName: string }>
>();
// Store connection info
const connectionInfo = new Map<
  any,
  { roomCode: string; roomId: string; playerId: string; playerName: string }
>();

// Broadcast to all players in a room
function broadcastToRoom(roomCode: string, message: any, excludeWs?: any) {
  const connections = roomConnections.get(roomCode);
  if (!connections) {
    return;
  }

  const messageStr = JSON.stringify(message);

  connections.forEach((playerInfo, ws) => {
    if (ws !== excludeWs && ws.readyState === 1) {
      // WebSocket.OPEN = 1
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  });
}

const app = new Hono();

// Manual CORS middleware
app.use("/*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (c.req.method === "OPTIONS") {
    return c.text("", 200);
  }

  await next();
});

// Logger middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
});

// Routes
app.route("/api", gameRoutes);

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: "connected",
  });
});

// Serve static files for production
app.use("/*", serveStatic({ root: "./public" }));

const port = process.env.PORT || 3001;

export default {
  fetch(req: Request, server: any) {
    // Check if this is a WebSocket upgrade request
    const url = new URL(req.url);
    if (req.headers.get("upgrade") === "websocket" && (url.pathname === "/" || url.pathname === "/ws/")) {
      // Upgrade to WebSocket
      const upgraded = server.upgrade(req);
      if (upgraded) {
        return undefined; // Return undefined to indicate upgrade was successful
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Otherwise, handle with Hono
    return app.fetch(req, server);
  },
  port,
  websocket: {
    message: async (ws: any, message: any) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case "joinRoom":
            await handleJoinRoom(ws, data);
            break;
          case "leaveRoom":
            await handleLeaveRoom(ws, data);
            break;
          case "startGame":
            await handleStartGame(ws, data);
            break;
          case "playerScore":
            await handlePlayerScore(ws, data);
            break;
          case "nextRound":
            await handleNextRound(ws, data);
            break;
          case "kickPlayer":
            await handleKickPlayer(ws, data);
            break;
          case "claimPile":
            await handleClaimPile(ws, data);
            break;
          case "sendSticker":
            await handleSendSticker(ws, data);
            break;
          case "heartbeat":
            await handleHeartbeat(ws, data);
            break;
          default:
            ws.send(
              JSON.stringify({ type: "error", message: "Unknown event type" }),
            );
        }
      } catch (error) {
        console.error("WebSocket error:", error);
        ws.send(
          JSON.stringify({ type: "error", message: "Invalid message format" }),
        );
      }
    },
    open: async (ws: any) => {
      ws.send(
        JSON.stringify({
          type: "connected",
          message: "Connected to game server",
        }),
      );
    },
    close: (ws: any, code: any, message: any) => {
      handleDisconnect(ws);
    },
    error: (ws: any, error: any) => {
      console.error("WebSocket error:", error);
    },
  },
};

async function handleJoinRoom(ws: any, data: any) {
  const { roomCode, playerId } = data;

  try {
    // Get room info
    const room = await RoomService.getRoomByCode(roomCode);
    if (!room) {
      ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
      return;
    }

    // Get player info
    const player = await PlayerService.getPlayerById(playerId);
    if (!player) {
      ws.send(JSON.stringify({ type: "error", message: "Player not found" }));
      return;
    }

    // Get session if exists
    let session = null;
    if (room.currentSession?.id) {
      session = await SessionService.getSessionById(room.currentSession.id);
      
      if (session && session.status === "playing") {
        const presence = await PresenceService.getPresenceMap(room.id);
        if (!(playerId in presence)) {
          ws.send(JSON.stringify({ type: "error", message: "Cannot join room. Game is currently in progress." }));
          return;
        }
      }
    }

    // Store connection
    if (!roomConnections.has(roomCode)) {
      roomConnections.set(roomCode, new Map());
    }

    // Remove any existing connections for this player (in case of refresh/reconnect)
    const roomConns = roomConnections.get(roomCode)!;
    const existingConnections = Array.from(roomConns.entries());
    for (const [existingWs, existingInfo] of existingConnections) {
      if (existingInfo.playerId === playerId) {
        roomConns.delete(existingWs);
        connectionInfo.delete(existingWs);
        // Close the old WebSocket
        try {
          if (existingWs.readyState === 1) {
            // OPEN
            existingWs.close();
          }
        } catch (error) {
          console.error("Error closing old WebSocket:", error);
        }
      }
    }

    // Add new connection
    roomConns.set(ws, { playerId, playerName: player.name });
    connectionInfo.set(ws, { roomCode, roomId: room.id, playerId, playerName: player.name });

    // Get connected players
    const roomConnectionsList = Array.from(
      roomConnections.get(roomCode)!.values(),
    );
    const connectedPlayerIds = new Set(roomConnectionsList.map((c) => c.playerId));

    // Get all connected players
    const connectedPlayers = await Promise.all(
      roomConnectionsList.map(async (conn) => {
        const p = await PlayerService.getPlayerById(conn.playerId);
        return p ? { id: p.id, name: p.name } : null;
      }),
    );
    
    let validPlayers: { id: string; name: string }[] = connectedPlayers.filter(
      (p): p is { id: string; name: string } => p !== null
    );

    // During active games, include offline players from presence
    if (session && session.status === "playing") {
      const presenceMap = await PresenceService.getPresenceMap(room.id);
      const offlinePlayerIds = Object.keys(presenceMap).filter(
        (pid) => !connectedPlayerIds.has(pid)
      );
      
      const offlinePlayers = await Promise.all(
        offlinePlayerIds.map(async (pid) => {
          const p = await PlayerService.getPlayerById(pid);
          return p ? { id: p.id, name: p.name } : null;
        })
      );
      
      validPlayers = [
        ...validPlayers,
        ...offlinePlayers.filter((p): p is { id: string; name: string } => p !== null)
      ];
    }

    // Call presence set online
    await PresenceService.setOnline(room.id, playerId);
    broadcastToRoom(roomCode, {
      type: "presenceUpdate",
      playerId,
      status: "online",
    });

    // Clear auto play if there was any
    if (session) {
      await AutoPilotService.cancelAutoPlay(
        session.id,
        session.currentRound,
        playerId,
      );
    }

    // Get snapshot for reconnect
    let snapshot = null;
    if (session && session.status === "playing") {
      snapshot = await SessionService.getFullStateSnapshot(
        session.id,
        roomCode,
      );
    }

    // Send current room state to the joining player
    const response = {
      type: "roomJoined",
      room,
      session,
      snapshot,
      players: validPlayers,
      isHost: room.hostId === playerId,
    };
    ws.send(JSON.stringify(response));

    // Notify other players in the room
    broadcastToRoom(
      roomCode,
      {
        type: "playerJoined",
        player: { id: player.id, name: player.name },
        totalPlayers: validPlayers.length,
      },
      ws,
    );
  } catch (error) {
    console.error("Error joining room:", error);
    ws.send(JSON.stringify({ type: "error", message: "Failed to join room" }));
  }
}

async function handleLeaveRoom(ws: any, data: any) {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode, roomId, playerId, playerName } = info;

  // Remove from room connections
  const connections = roomConnections.get(roomCode);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      roomConnections.delete(roomCode);
    }
  }
  connectionInfo.delete(ws);

  // Notify other players
  broadcastToRoom(roomCode, {
    type: "playerLeft",
    playerId,
    playerName,
    totalPlayers: connections?.size || 0,
  });

  ws.send(
    JSON.stringify({
      type: "leftRoom",
      roomCode,
    }),
  );
}

async function handleStartGame(ws: any, data: any) {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode } = info;
  const { sessionId, hostId } = data;

  try {
    // Verify host and start session
    const isHost = await SessionService.isHost(sessionId, hostId);
    if (!isHost) {
      ws.send(
        JSON.stringify({ type: "error", message: "Only host can start game" }),
      );
      return;
    }

    // Get room players to pass to startSession
    const room = await RoomService.getRoomById(roomCode);

    // Instead of querying players table, we should query room_players or connections.
    // wait, we can just get from roomConnections! We did that above:
    const roomConnectionsList = Array.from(
      roomConnections.get(roomCode)?.values() || [],
    );

    const playerIds = roomConnectionsList.map((c) => c.playerId);

    await SessionService.startSession(sessionId, playerIds.length, playerIds);

    // Broadcast game start to all players in room
    broadcastToRoom(roomCode, {
      type: "gameStarted",
      sessionId,
      gameId: "game-" + Math.random().toString(36).substr(2, 9),
    });

    // We can also let clients know piles are ready
    const sessionItems = await SessionService.getFullStateSnapshot(
      sessionId,
      roomCode,
    );
    if (sessionItems && sessionItems.piles) {
      broadcastToRoom(roomCode, {
        type: "pilesRevealed",
        piles: sessionItems.piles,
      });
    }
  } catch (error) {
    console.error("Failed to start game:", error);
    ws.send(JSON.stringify({ type: "error", message: "Failed to start game" }));
  }
}

async function handlePlayerScore(ws: any, data: any) {
  const info = connectionInfo.get(ws);
  if (!info) {
    return;
  }

  const { roomCode } = info;
  const { playerId, score, cards } = data;

  // Broadcast player score to all players in room
  broadcastToRoom(roomCode, {
    type: "playerScore",
    playerId,
    score,
    cards,
  });
}

async function handleNextRound(ws: any, data: any) {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode } = info;

  // Broadcast next round to all players
  broadcastToRoom(roomCode, {
    type: "nextRound",
    round: data.round,
  });

  const room = await RoomService.getRoomByCode(roomCode);
  if (room && room.currentSessionId) {
    const sessionItems = await SessionService.getFullStateSnapshot(
      room.currentSessionId,
      roomCode,
    );
    if (sessionItems && sessionItems.piles) {
      broadcastToRoom(roomCode, {
        type: "pilesRevealed",
        piles: sessionItems.piles,
      });
    }
  }
}

function handleDisconnect(ws: any) {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode, playerId, playerName, roomId } = info;

  // Remove from room connections
  const connections = roomConnections.get(roomCode);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      roomConnections.delete(roomCode);
    }
  }
  connectionInfo.delete(ws);

  // Notify other players
  broadcastToRoom(roomCode, {
    type: "playerLeft",
    playerId,
    playerName,
    totalPlayers: connections?.size || 0,
  });

  PresenceService.setOffline(roomId, playerId);
  broadcastToRoom(roomCode, {
    type: "presenceUpdate",
    playerId,
    status: "offline",
  });

  // Provide auto playlist if a game is going on
  RoomService.getRoomByCode(roomCode).then((room) => {
    if (room && room.currentSessionId) {
      SessionService.getSessionById(room.currentSessionId).then((session) => {
        if (session && session.status === "playing") {
          AutoPilotService.scheduleAutoPlay(
            session.id,
            session.currentRound,
            playerId!,
          );
        }
      });
    }
  });
}

async function handleKickPlayer(ws: any, data: any) {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode, playerId: callerId } = info;
  const { targetPlayerId } = data;

  try {
    // Get room to verify host
    const room = await RoomService.getRoomByCode(roomCode);
    if (!room) {
      ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
      return;
    }

    // Only host can kick players
    if (room.hostId !== callerId) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Only host can kick players",
        }),
      );
      return;
    }

    // Cannot kick yourself (the host)
    if (targetPlayerId === callerId) {
      ws.send(
        JSON.stringify({ type: "error", message: "Cannot kick yourself" }),
      );
      return;
    }

    // Find the target player's WebSocket connection
    const connections = roomConnections.get(roomCode);
    if (!connections) return;

    let targetWs: any = null;
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

    // Send kick notification to the target player
    targetWs.send(
      JSON.stringify({
        type: "playerKicked",
        reason: "You have been kicked by the host",
      }),
    );

    // Remove from connections
    connections.delete(targetWs);
    connectionInfo.delete(targetWs);

    // Close the target's WebSocket
    try {
      targetWs.close();
    } catch (error) {
      console.error("Error closing kicked player WebSocket:", error);
    }

    // Broadcast player left to remaining players
    broadcastToRoom(roomCode, {
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

async function handleClaimPile(ws: any, data: any) {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode, playerId } = info;
  const { sessionId, roundNumber, pileId } = data;

  try {
    const pile = await PileService.claimPile(
      sessionId,
      roundNumber,
      pileId,
      playerId,
    );
    await AutoPilotService.cancelAutoPlay(sessionId, roundNumber, playerId);

    broadcastToRoom(roomCode, {
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

async function handleSendSticker(ws: any, data: any) {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode, playerId } = info;
  const { sticker } = data;

  broadcastToRoom(roomCode, {
    type: "stickerSent",
    playerId,
    sticker,
  });
}

async function handleHeartbeat(ws: any, data: any) {
  const info = connectionInfo.get(ws);
  if (!info) return;

  const { roomCode, roomId, playerId } = info;
  await PresenceService.setOnline(roomId, playerId);
  broadcastToRoom(roomCode, {
    type: "presenceUpdate",
    playerId,
    status: "online",
  });

  // Maybe also reset auto play
  const room = await RoomService.getRoomByCode(roomCode);
  if (room && room.currentSession) {
    const session = await SessionService.getSessionById(room.currentSession.id);
    if (session && session.status === "playing") {
      await AutoPilotService.cancelAutoPlay(
        session.id,
        session.currentRound,
        playerId,
      );
    }
  }
}
