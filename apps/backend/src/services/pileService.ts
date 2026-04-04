import { db } from "../db";
import { sessionPiles, type SessionPile } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  createPiles,
  createDeck,
  shuffle,
  type Card,
} from "@three-card-poker/shared";

export class PileService {
  // In-memory mutex per session-round
  private static claimLocks = new Map<string, boolean>();

  static async generatePiles(
    sessionId: string,
    roundNumber: number,
    playerCount: number,
  ): Promise<SessionPile[]> {
    const deck = shuffle(createDeck());
    const newPiles = createPiles(deck, playerCount);

    const pileRecords = newPiles.map((pile, index) => ({
      id: `${sessionId}-${roundNumber}-${index}`,
      sessionId,
      roundNumber,
      pileIndex: index,
      cards: JSON.stringify(pile.cards),
      claimedBy: null,
      claimedAt: null,
      isAutoPlayed: false,
    }));

    await db.insert(sessionPiles).values(pileRecords);

    return db
      .select()
      .from(sessionPiles)
      .where(
        and(
          eq(sessionPiles.sessionId, sessionId),
          eq(sessionPiles.roundNumber, roundNumber),
        ),
      );
  }

  static async claimPile(
    sessionId: string,
    roundNumber: number,
    pileId: string,
    playerId: string,
  ): Promise<SessionPile> {
    const lockKey = `${sessionId}-${roundNumber}`;

    if (this.claimLocks.get(lockKey)) {
      throw new Error("Pile claim condition lock, please try again");
    }

    this.claimLocks.set(lockKey, true);

    try {
      // 1. Check if player has already claimed a pile in this round
      const playerExistingPiles = await db
        .select()
        .from(sessionPiles)
        .where(
          and(
            eq(sessionPiles.sessionId, sessionId),
            eq(sessionPiles.roundNumber, roundNumber),
            eq(sessionPiles.claimedBy, playerId),
          ),
        )
        .limit(1);

      if (playerExistingPiles.length > 0) {
        throw new Error("You have already claimed a pile this round.");
      }

      // 2. Check if the pile exists and is unclaimed
      const pileIndex = parseInt(pileId.replace('pile-', ''), 10);
      
      const targetPiles = await db
        .select()
        .from(sessionPiles)
        .where(
          and(
            eq(sessionPiles.sessionId, sessionId),
            eq(sessionPiles.roundNumber, roundNumber),
            eq(sessionPiles.pileIndex, pileIndex),
          ),
        )
        .limit(1);

      const targetPile = targetPiles[0];

      if (!targetPile) {
        throw new Error("Pile not found");
      }

      if (targetPile.claimedBy !== null) {
        throw new Error("Pile is already claimed");
      }

      // 3. Atomically update
      await db
        .update(sessionPiles)
        .set({
          claimedBy: playerId,
          claimedAt: new Date(),
        })
        .where(eq(sessionPiles.id, targetPile.id));

      const updatedPiles = await db
        .select()
        .from(sessionPiles)
        .where(eq(sessionPiles.id, targetPile.id));

      if (!updatedPiles[0]) throw new Error("Pile update failed");
      return updatedPiles[0];
    } finally {
      this.claimLocks.delete(lockKey);
    }
  }

  static async getRoundPiles(
    sessionId: string,
    roundNumber: number,
  ): Promise<SessionPile[]> {
    return db
      .select()
      .from(sessionPiles)
      .where(
        and(
          eq(sessionPiles.sessionId, sessionId),
          eq(sessionPiles.roundNumber, roundNumber),
        ),
      );
  }

  static async getUnclaimedPiles(
    sessionId: string,
    roundNumber: number,
  ): Promise<SessionPile[]> {
    return db
      .select()
      .from(sessionPiles)
      .where(
        and(
          eq(sessionPiles.sessionId, sessionId),
          eq(sessionPiles.roundNumber, roundNumber),
          isNull(sessionPiles.claimedBy),
        ),
      );
  }

  static async autoAssignPile(
    sessionId: string,
    roundNumber: number,
    playerId: string,
  ): Promise<SessionPile> {
    const lockKey = `${sessionId}-${roundNumber}`;

    if (this.claimLocks.get(lockKey)) {
      // Wait and retry is ideal, but let's just throw, calling layer can retry
      throw new Error("Lock busy during auto-assign");
    }

    this.claimLocks.set(lockKey, true);

    try {
      // Check if already claimed
      const playerExistingPiles = await db
        .select()
        .from(sessionPiles)
        .where(
          and(
            eq(sessionPiles.sessionId, sessionId),
            eq(sessionPiles.roundNumber, roundNumber),
            eq(sessionPiles.claimedBy, playerId),
          ),
        )
        .limit(1);

      if (playerExistingPiles.length > 0) {
        return playerExistingPiles[0]!; // Already has a pile
      }

      const unclaimed = await db
        .select()
        .from(sessionPiles)
        .where(
          and(
            eq(sessionPiles.sessionId, sessionId),
            eq(sessionPiles.roundNumber, roundNumber),
            isNull(sessionPiles.claimedBy),
          ),
        )
        .limit(1);

      const targetPile = unclaimed[0];
      if (!targetPile) {
        throw new Error("No unclaimed piles left for auto-assign.");
      }

      await db
        .update(sessionPiles)
        .set({
          claimedBy: playerId,
          claimedAt: new Date(),
          isAutoPlayed: true,
        })
        .where(eq(sessionPiles.id, targetPile.id));

      const updatedPiles = await db
        .select()
        .from(sessionPiles)
        .where(eq(sessionPiles.id, targetPile.id));

      if (!updatedPiles[0]) throw new Error("Target pile missing");
      return updatedPiles[0];
    } finally {
      this.claimLocks.delete(lockKey);
    }
  }

  static async allPilesClaimed(
    sessionId: string,
    roundNumber: number,
    playerCount: number,
  ): Promise<boolean> {
    const claimedCountQuery = await db
      .select()
      .from(sessionPiles)
      .where(
        and(
          eq(sessionPiles.sessionId, sessionId),
          eq(sessionPiles.roundNumber, roundNumber),
        ),
      );

    const claimed = claimedCountQuery.filter(
      (p) => p.claimedBy !== null,
    ).length;
    return claimed >= playerCount;
  }

  static async getPlayerPile(
    sessionId: string,
    roundNumber: number,
    playerId: string,
  ): Promise<SessionPile | undefined> {
    const result = await db
      .select()
      .from(sessionPiles)
      .where(
        and(
          eq(sessionPiles.sessionId, sessionId),
          eq(sessionPiles.roundNumber, roundNumber),
          eq(sessionPiles.claimedBy, playerId),
        ),
      )
      .limit(1);
    return result[0];
  }
}
