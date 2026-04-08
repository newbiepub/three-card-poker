import { Hono } from "hono";
import { PlayerService } from "../services/playerService";
import { RoomService } from "../services/roomService";
import { SessionService } from "../services/sessionService";
import { RoomCodeService } from "../services/roomCodeService";
import { PileService } from "../services/pileService";
import { AutoPilotService } from "../services/autoPilotService";
import { PresenceService } from "../services/presenceService";

const app = new Hono();

// Player registration
app.post("/players/register", async (c) => {
  const { name } = await c.req.json();

  try {
    const player = await PlayerService.getOrCreatePlayer(name);
    const stats = await PlayerService.getPlayerStats(player.id);
    const isNewPlayer = player.totalGames === 0;

    return c.json({
      player,
      stats,
      isNewPlayer,
    });
  } catch {
    return c.json({ error: "Failed to register player" }, 500);
  }
});

// Verify player existence
app.get("/players/verify/:playerId", async (c) => {
  const playerId = c.req.param("playerId");

  try {
    const player = await PlayerService.getPlayerById(playerId);

    if (!player) {
      return c.json({ exists: false }, 404);
    }

    return c.json({ exists: true, player });
  } catch {
    return c.json({ error: "Failed to verify player" }, 500);
  }
});

// Create room (host)
app.post("/rooms/create", async (c) => {
  const { hostName, roomName, totalRounds, maxPlayers } = await c.req.json();

  try {
    // Get or create host player
    const host = await PlayerService.getOrCreatePlayer(hostName);

    // Create room
    const room = await RoomService.createRoom(
      roomName || `${host.name}'s Room`,
      host.id,
      maxPlayers,
    );

    // Create initial session
    const session = await SessionService.createSession(
      room.id,
      host.id,
      totalRounds || 10,
    );

    return c.json({
      room,
      roomCode: room.roomCode,
      session,
      host,
    });
  } catch {
    return c.json({ error: "Failed to create room" }, 500);
  }
});

// Join room by code
app.post("/rooms/join", async (c) => {
  const { roomCode, playerName } = await c.req.json();

  try {
    // Validate room code
    if (!RoomCodeService.isValidRoomCode(roomCode)) {
      return c.json({ error: "Invalid room code format" }, 400);
    }

    // Check if can join
    const canJoin = await RoomCodeService.canJoinRoom(roomCode);
    if (!canJoin.canJoin) {
      return c.json({ error: canJoin.reason }, 400);
    }

    // Get or create player
    const player = await PlayerService.getOrCreatePlayer(playerName);

    // Get room with session
    const room = await RoomService.getRoomByCode(roomCode);
    if (!room) {
      return c.json({ error: "Room not found" }, 404);
    }

    const session = room.currentSession
      ? await SessionService.getSessionById(room.currentSession.id)
      : null;

    // Reject if session is already playing and player is not already part of it
    if (session && session.status === "playing") {
      const presence = await PresenceService.getPresenceMap(room.id);
      if (!(player.id in presence)) {
        return c.json({ error: "Cannot join room. Game is currently in progress." }, 403);
      }
    }

    // TODO: Add player to room (need room_players table)

    return c.json({
      room,
      session,
      player,
      isHost: room.hostId === player.id,
    });
  } catch {
    return c.json({ error: "Failed to join room" }, 500);
  }
});

// Get room by code
app.get("/rooms/:roomCode", async (c) => {
  const roomCode = c.req.param("roomCode");

  const room = await RoomService.getRoomByCode(roomCode);
  if (!room) {
    return c.json({ error: "Room not found" }, 404);
  }

  const session = room.currentSession
    ? await SessionService.getSessionById(room.currentSession.id)
    : null;
  const stats = await RoomService.getRoomStats(room.id);

  return c.json({ room, session, stats });
});

// Claim a pile
app.post("/sessions/:sessionId/claim-pile", async (c) => {
  const sessionId = c.req.param("sessionId");
  const { playerId, pileId, roundNumber } = await c.req.json();

  try {
    const pile = await PileService.claimPile(
      sessionId,
      roundNumber,
      pileId,
      playerId,
    );

    // Cancel any scheduled auto plays for this player
    await AutoPilotService.cancelAutoPlay(sessionId, roundNumber, playerId);

    return c.json({ pile });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : "Failed to claim pile",
      },
      400,
    );
  }
});

// Snapshot for reconnect
app.get("/sessions/:sessionId/snapshot/:roomId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const roomId = c.req.param("roomId");
  try {
    const snapshot = await SessionService.getFullStateSnapshot(
      sessionId,
      roomId,
    );
    if (!snapshot) return c.json({ error: "Session not found" }, 404);
    return c.json({ snapshot });
  } catch {
    return c.json({ error: "Failed to create snapshot" }, 500);
  }
});

// Publish score for a player
app.post("/sessions/:sessionId/publish-score", async (c) => {
  const sessionId = c.req.param("sessionId");
  const { playerId, score, roundNumber, cards } = await c.req.json();

  try {
    // Get session
    const session = await SessionService.getSessionById(sessionId);
    if (!session || session.status !== "playing") {
      return c.json({ error: "Session not active" }, 400);
    }

    // Save score to database
    const scoreRecord = await SessionService.savePlayerScore(
      sessionId,
      playerId,
      roundNumber || session.currentRound,
      score,
      cards,
    );

    return c.json({
      success: true,
      scoreRecord,
    });
  } catch {
    return c.json({ error: "Failed to publish score" }, 500);
  }
});

// Track ongoing next round operations to prevent race conditions
const nextRoundLocks = new Map<string, boolean>();

// Update session round
app.post("/sessions/:sessionId/next-round", async (c) => {
  const sessionId = c.req.param("sessionId");
  const { expectedCurrentRound } = await c.req.json();

  try {
    // Check if next round is already being processed
    if (nextRoundLocks.get(sessionId)) {
      return c.json({ error: "Next round already in progress" }, 429);
    }

    // Acquire lock
    nextRoundLocks.set(sessionId, true);

    const session = await SessionService.getSessionById(sessionId);
    if (!session) {
      nextRoundLocks.delete(sessionId);
      return c.json({ error: "Session not found" }, 404);
    }

    // Verify if the client's current round matches the session's current round
    // If expectedCurrentRound is provided and doesn't match, skip increment but return current state
    if (
      expectedCurrentRound !== undefined &&
      session.currentRound !== expectedCurrentRound
    ) {
      nextRoundLocks.delete(sessionId);
      return c.json({
        session,
        message: "Round already updated",
        skipped: true,
      });
    }

    await SessionService.recalculateRoundPoints(
      sessionId,
      session.currentRound,
    );
    const nextRound = session.currentRound + 1;

    const updatedSession = await SessionService.updateSessionRound(
      sessionId,
      nextRound,
    );

    if (updatedSession.status !== "finished") {
      await PileService.generatePiles(
        sessionId,
        nextRound,
        session.totalRounds, // We set totalRounds to equal playerCount when session started
      );

      // Schedule auto-plays for all players in this round
      const presence = await PresenceService.getPresenceMap(session.roomId);
      const playerIds = Object.keys(presence);
      for (const pid of playerIds) {
        await AutoPilotService.scheduleAutoPlay(sessionId, nextRound, pid);
      }
    }

    const allScores = await SessionService.getAllPlayerScores(sessionId);
    const latestScoreByPlayer = new Map<string, (typeof allScores)[number]>();
    for (const score of allScores) {
      const existing = latestScoreByPlayer.get(score.playerId);
      if (!existing || score.roundNumber > existing.roundNumber) {
        latestScoreByPlayer.set(score.playerId, score);
      }
    }

    const latestScoresArray = Array.from(latestScoreByPlayer.values()).sort(
      (a, b) => b.cumulativeScore - a.cumulativeScore,
    );

    // Release lock
    nextRoundLocks.delete(sessionId);

    return c.json({
      session: updatedSession,
      allScores: latestScoresArray,
    });
  } catch (error) {
    console.error("Error updating round:", error);
    // Release lock on error
    nextRoundLocks.delete(sessionId);
    return c.json(
      {
        error: "Failed to update round",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// Get session state (for refresh)
app.get("/sessions/:sessionId/state", async (c) => {
  const sessionId = c.req.param("sessionId");

  try {
    const session = await SessionService.getSessionById(sessionId);
    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const currentRoundScores = await SessionService.getRoundScores(
      sessionId,
      session.currentRound,
    );
    const allScores = await SessionService.getAllPlayerScores(sessionId);
    const latestScoreByPlayer = new Map<string, (typeof allScores)[number]>();
    for (const score of allScores) {
      const existing = latestScoreByPlayer.get(score.playerId);
      if (!existing || score.roundNumber > existing.roundNumber) {
        latestScoreByPlayer.set(score.playerId, score);
      }
    }

    const latestScoresArray = Array.from(latestScoreByPlayer.values()).sort(
      (a, b) => b.cumulativeScore - a.cumulativeScore,
    );

    return c.json({
      session,
      currentRound: session.currentRound,
      scores: currentRoundScores.map((s) => ({
        playerId: s.playerId,
        playerName: s.playerName,
        gameScore: s.gameScore,
        pointsChange: s.pointsChange,
        cumulativeScore:
          latestScoreByPlayer.get(s.playerId)?.cumulativeScore ??
          s.cumulativeScore,
        cards: s.cards ? JSON.parse(s.cards) : null,
      })),
      allScores: latestScoresArray,
    });
  } catch {
    return c.json({ error: "Failed to get session state" }, 500);
  }
});

// ...

export default app;
