import { AutoPilotService } from "../../services/autoPilotService.js";
import { PlayerService } from "../../services/playerService.js";
import { PresenceService } from "../../services/presenceService.js";
import { RoomService } from "../../services/roomService.js";
import { SessionService } from "../../services/sessionService.js";
import type { WsHandlerContext } from "../types.js";

export async function handleJoinRoom({
  ws,
  data,
  broadcast,
  connectionInfo,
  roomConnections,
}: WsHandlerContext): Promise<void> {
  const { roomCode, playerId } = data as { roomCode: string; playerId: string };

  try {
    const room = await RoomService.getRoomByCode(roomCode);
    if (!room) {
      ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
      return;
    }

    const player = await PlayerService.getPlayerById(playerId);
    if (!player) {
      ws.send(JSON.stringify({ type: "error", message: "Player not found" }));
      return;
    }

    let session = null;
    if (room.currentSession?.id) {
      session = await SessionService.getSessionById(room.currentSession.id);

      if (session && session.status === "playing") {
        const presence = await PresenceService.getPresenceMap(room.id);
        if (!(playerId in presence)) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Cannot join room. Game is currently in progress.",
            }),
          );
          return;
        }
      }
    }

    // Register connection
    if (!roomConnections.has(roomCode)) {
      roomConnections.set(roomCode, new Map());
    }

    // Close stale connections for the same player (refresh/reconnect)
    const roomConns = roomConnections.get(roomCode)!;
    for (const [existingWs, existingInfo] of Array.from(roomConns.entries())) {
      if (existingInfo.playerId === playerId) {
        roomConns.delete(existingWs);
        connectionInfo.delete(existingWs);
        try {
          if (existingWs.readyState === 1) existingWs.close();
        } catch (error) {
          console.error("Error closing old WebSocket:", error);
        }
      }
    }

    roomConns.set(ws, { playerId, playerName: player.name });
    connectionInfo.set(ws, {
      roomCode,
      roomId: room.id,
      playerId,
      playerName: player.name,
    });

    // Collect connected players
    const roomConnectionsList = Array.from(roomConns.values());
    const connectedPlayerIds = new Set(
      roomConnectionsList.map((c) => c.playerId),
    );

    let validPlayers = (
      await Promise.all(
        roomConnectionsList.map(async (conn) => {
          const p = await PlayerService.getPlayerById(conn.playerId);
          return p ? { id: p.id, name: p.name } : null;
        }),
      )
    ).filter((p): p is { id: string; name: string } => p !== null);

    // During active games, include offline players from presence
    if (session && session.status === "playing") {
      const presenceMap = await PresenceService.getPresenceMap(room.id);
      const offlinePlayerIds = Object.keys(presenceMap).filter(
        (pid) => !connectedPlayerIds.has(pid),
      );
      const offlinePlayers = (
        await Promise.all(
          offlinePlayerIds.map(async (pid) => {
            const p = await PlayerService.getPlayerById(pid);
            return p ? { id: p.id, name: p.name } : null;
          }),
        )
      ).filter((p): p is { id: string; name: string } => p !== null);

      validPlayers = [...validPlayers, ...offlinePlayers];
    }

    await PresenceService.setOnline(room.id, playerId);
    broadcast(roomCode, { type: "presenceUpdate", playerId, status: "online" });

    if (session) {
      await AutoPilotService.cancelAutoPlay(
        session.id,
        session.currentRound,
        playerId,
      );
    }

    let snapshot = null;
    if (session && session.status === "playing") {
      snapshot = await SessionService.getFullStateSnapshot(
        session.id,
        roomCode,
      );
    }

    ws.send(
      JSON.stringify({
        type: "roomJoined",
        room,
        session,
        snapshot,
        players: validPlayers,
        isHost: room.hostId === playerId,
      }),
    );

    broadcast(
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
