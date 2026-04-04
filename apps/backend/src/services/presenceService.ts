import { db } from "../db";
import { playerPresence, type PlayerPresenceModel } from "../db/schema";
import { eq, and } from "drizzle-orm";

export class PresenceService {
  static async setOnline(roomId: string, playerId: string): Promise<void> {
    await db
      .insert(playerPresence)
      .values({
        id: `${roomId}-${playerId}`,
        roomId,
        playerId,
        status: "online",
        lastHeartbeat: new Date(),
        disconnectedAt: null,
      })
      .onConflictDoUpdate({
        target: playerPresence.id,
        set: {
          status: "online",
          lastHeartbeat: new Date(),
          disconnectedAt: null,
        },
      });
  }

  static async setOffline(roomId: string, playerId: string): Promise<void> {
    await db
      .update(playerPresence)
      .set({
        status: "offline",
        disconnectedAt: new Date(),
      })
      .where(
        and(
          eq(playerPresence.roomId, roomId),
          eq(playerPresence.playerId, playerId),
        ),
      );
  }

  static async updateHeartbeat(
    roomId: string,
    playerId: string,
  ): Promise<void> {
    await db
      .update(playerPresence)
      .set({ lastHeartbeat: new Date(), status: "online" })
      .where(
        and(
          eq(playerPresence.roomId, roomId),
          eq(playerPresence.playerId, playerId),
        ),
      );
  }

  static async getOfflinePlayers(roomId: string): Promise<string[]> {
    const offlineRecords = await db
      .select({ playerId: playerPresence.playerId })
      .from(playerPresence)
      .where(
        and(
          eq(playerPresence.roomId, roomId),
          eq(playerPresence.status, "offline"),
        ),
      );

    return offlineRecords.map((record) => record.playerId);
  }

  static async isOnline(roomId: string, playerId: string): Promise<boolean> {
    const records = await db
      .select({ status: playerPresence.status })
      .from(playerPresence)
      .where(
        and(
          eq(playerPresence.roomId, roomId),
          eq(playerPresence.playerId, playerId),
        ),
      )
      .limit(1);

    const record = records[0];
    if (!record) return false;
    return record.status === "online";
  }

  static async getPresenceMap(
    roomId: string,
  ): Promise<Record<string, PlayerPresenceModel["status"]>> {
    const records = await db
      .select()
      .from(playerPresence)
      .where(eq(playerPresence.roomId, roomId));

    const map: Record<string, PlayerPresenceModel["status"]> = {};
    for (const record of records) {
      map[record.playerId] = record.status;
    }
    return map;
  }
}
