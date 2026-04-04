import { db, rooms } from "../db";

export class RoomCodeService {
  // Generate a unique 6-digit room code
  static async generateRoomCode(): Promise<string> {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Check if code already exists
      const existing = await db.query.rooms.findFirst({
        where: (rooms, { eq }) => eq(rooms.roomCode, code),
      });

      if (!existing) {
        return code;
      }
    }

    // If we couldn't find a unique code (very unlikely), throw error
    throw new Error(
      "Could not generate unique room code after multiple attempts",
    );
  }

  // Validate room code format
  static isValidRoomCode(code: string): boolean {
    // Must be exactly 6 digits
    return /^\d{6}$/.test(code);
  }

  // Find room by code
  static async findRoomByCode(code: string) {
    if (!this.isValidRoomCode(code)) {
      return null;
    }

    const room = await db.query.rooms.findFirst({
      where: (rooms, { eq }) => eq(rooms.roomCode, code),
      with: {
        host: true,
        currentSession: true,
      },
    });

    return room;
  }

  // Check if room is joinable
  static async canJoinRoom(
    code: string,
  ): Promise<{ canJoin: boolean; reason?: string }> {
    const room = await this.findRoomByCode(code);

    if (!room) {
      return { canJoin: false, reason: "Room not found" };
    }

    if (room.status === "finished") {
      return { canJoin: false, reason: "Room has finished" };
    }

    // TODO: Check if room is full when we implement player count tracking

    return { canJoin: true };
  }
}
