import { db } from "../db";
import { autoPlayQueue } from "../db/schema";
import { eq, and, lt } from "drizzle-orm";
import { PileService } from "./pileService";
import { SessionService } from "./sessionService";
import { GAME_CONFIG } from "@three-card-poker/shared";
import type { AutoPlayCallback } from "../types";

export class AutoPilotService {
  private static pollTimer: NodeJS.Timeout | null = null;
  private static isProcessing = false;
  private static callback: AutoPlayCallback | null = null;

  static async scheduleAutoPlay(
    sessionId: string,
    roundNumber: number,
    playerId: string,
    timeoutMs: number = GAME_CONFIG.PILE_CLAIM_TIMEOUT_MS,
  ): Promise<void> {
    const deadline = new Date(Date.now() + timeoutMs);

    await db
      .insert(autoPlayQueue)
      .values({
        id: `auto-${sessionId}-${roundNumber}-${playerId}`,
        sessionId,
        roundNumber,
        playerId,
        deadline,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: autoPlayQueue.id,
        set: {
          deadline,
          status: "pending",
        },
      });
  }

  static async cancelAutoPlay(
    sessionId: string,
    roundNumber: number,
    playerId: string,
  ): Promise<void> {
    await db
      .update(autoPlayQueue)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(autoPlayQueue.sessionId, sessionId),
          eq(autoPlayQueue.roundNumber, roundNumber),
          eq(autoPlayQueue.playerId, playerId),
          eq(autoPlayQueue.status, "pending"),
        ),
      );
  }

  static async cancelRoundAutoPlays(
    sessionId: string,
    roundNumber: number,
  ): Promise<void> {
    await db
      .update(autoPlayQueue)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(autoPlayQueue.sessionId, sessionId),
          eq(autoPlayQueue.roundNumber, roundNumber),
          eq(autoPlayQueue.status, "pending"),
        ),
      );
  }

  static async processOverdueAutoPlays(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingItems = await db
        .select()
        .from(autoPlayQueue)
        .where(
          and(
            eq(autoPlayQueue.status, "pending"),
            lt(autoPlayQueue.deadline, new Date()),
          ),
        );

      for (const item of pendingItems) {
        try {
          // Double check if status is still pending in case of race condition in concurrent processing.
          // Wait, SQLite doesn't natively handle 'select for update' well without transactions,
          // but we are a single node process, so this loop is safe sequentially.

          // Claim a pile automatically
          const claimedPile = await PileService.autoAssignPile(
            item.sessionId,
            item.roundNumber,
            item.playerId,
          );

          if (claimedPile) {
            const cards = JSON.parse(claimedPile.cards);

            const score = await SessionService.autoPlayScoreExecution(
              item.sessionId,
              item.roundNumber,
              item.playerId,
              cards,
            );

            if (this.callback) {
              this.callback(
                item.sessionId,
                item.roundNumber,
                item.playerId,
                cards,
                score,
              );
            }
          }

          await db
            .update(autoPlayQueue)
            .set({ status: "completed" })
            .where(eq(autoPlayQueue.id, item.id));
        } catch (error) {
          console.error(
            `AutoPilotService Error processing item ${item.id}:`,
            error,
          );
          // if it throws because pile already claimed, cancel it.
          if (
            error instanceof Error &&
            error.message.includes("Already has a pile")
          ) {
            await db
              .update(autoPlayQueue)
              .set({ status: "cancelled" })
              .where(eq(autoPlayQueue.id, item.id));
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  static startPolling(onAutoPlayed?: AutoPlayCallback): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    if (onAutoPlayed) {
      this.callback = onAutoPlayed;
    }

    // Run once immediately
    this.processOverdueAutoPlays().catch(console.error);

    this.pollTimer = setInterval(() => {
      this.processOverdueAutoPlays().catch(console.error);
    }, GAME_CONFIG.AUTO_PLAY_POLL_INTERVAL_MS);
  }

  static stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.callback = null;
  }
}
