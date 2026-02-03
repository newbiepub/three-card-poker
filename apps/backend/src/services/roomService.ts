import { eq, and, sql } from "drizzle-orm";
import { db, rooms, games, type Room, type NewRoom } from "../db";
import { generateRoomId } from "@three-card-poker/shared";
import { RoomCodeService } from "./roomCodeService";

export class RoomService {
  // Create a new room with 6-digit code
  static async createRoom(
    name: string,
    hostId: string,
    maxPlayers: number = 12,
  ): Promise<Room & { roomCode: string }> {
    // Generate unique room code
    const roomCode = await RoomCodeService.generateRoomCode();

    const newRoom: NewRoom = {
      id: generateRoomId(),
      name,
      maxPlayers,
      roomCode,
      hostId,
      status: "waiting",
    };

    const [room] = await db.insert(rooms).values(newRoom).returning();
    if (!room) throw new Error("Room not created");

    return { ...room, roomCode };
  }

  // Get room by ID
  static async getRoomById(id: string): Promise<Room | null> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room || null;
  }

  // Get room by code
  static async getRoomByCode(code: string) {
    return await RoomCodeService.findRoomByCode(code);
  }

  // Update room status
  static async updateRoomStatus(
    id: string,
    status: Room["status"],
  ): Promise<void> {
    await db.update(rooms).set({ status }).where(eq(rooms.id, id));
  }

  // Set current session for room
  static async setCurrentSession(
    roomId: string,
    sessionId: string | null,
  ): Promise<void> {
    await db
      .update(rooms)
      .set({ currentSessionId: sessionId })
      .where(eq(rooms.id, roomId));
  }

  // Get active rooms (waiting or playing)
  static async getActiveRooms(): Promise<Room[]> {
    const activeRooms = await db
      .select()
      .from(rooms)
      .where(sql`${rooms.status} IN ('waiting', 'playing')`)
      .orderBy(rooms.createdAt);

    return activeRooms;
  }

  // Check if user is host of room
  static async isHost(roomId: string, playerId: string): Promise<boolean> {
    const [room] = await db
      .select({ hostId: rooms.hostId })
      .from(rooms)
      .where(eq(rooms.id, roomId));

    return room?.hostId === playerId;
  }

  // Clean up old finished rooms
  static async cleanupOldRooms(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = db
      .delete(rooms)
      .where(
        and(
          eq(rooms.status, "finished"),
          sql`${rooms.finishedAt} < ${cutoffDate.getTime()}`,
        ),
      );

    // Execute and get count
    const roomsToDelete = await db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.status, "finished"),
          sql`${rooms.finishedAt} < ${cutoffDate.getTime()}`,
        ),
      );

    if (roomsToDelete.length > 0) {
      await result.run();
    }

    return roomsToDelete.length;
  }

  // Get room statistics
  static async getRoomStats(roomId: string) {
    const stats = await db
      .select({
        totalGames: sql<number>`COUNT(DISTINCT ${games.id})`,
        totalPlayers: sql<number>`COUNT(DISTINCT ${gamePlayers.playerId})`,
        avgScore: sql<number>`AVG(${gamePlayers.score})`,
      })
      .from(games)
      .leftJoin(gamePlayers, eq(games.id, gamePlayers.gameId))
      .where(eq(games.roomId, roomId));

    return (
      stats[0] || {
        totalGames: 0,
        totalPlayers: 0,
        avgScore: 0,
      }
    );
  }
}

// Import at the bottom to avoid circular dependency
import { gamePlayers } from "../db";
