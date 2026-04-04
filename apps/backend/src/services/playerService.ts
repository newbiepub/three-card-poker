import { eq, desc, sql } from "drizzle-orm";
import { db, players, type Player, type NewPlayer } from "../db";
import { generatePlayerId } from "@three-card-poker/shared";

export class PlayerService {
  // Create a new player
  static async createPlayer(name: string): Promise<Player> {
    const newPlayer: NewPlayer = {
      id: generatePlayerId(),
      name,
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      totalScore: 0,
      currentStreak: 0,
    };

    const [player] = await db.insert(players).values(newPlayer).returning();
    if (!player) throw new Error("Player not created");
    return player;
  }

  // Get player by ID
  static async getPlayerById(id: string): Promise<Player | null> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player || null;
  }

  // Get player by name (or create if doesn't exist)
  static async getOrCreatePlayer(name: string): Promise<Player> {
    const [existingPlayer] = await db
      .select()
      .from(players)
      .where(eq(players.name, name));

    if (existingPlayer) {
      return existingPlayer;
    }

    // Create new player if not found
    return await this.createPlayer(name);
  }

  // Update player stats after a game
  static async updatePlayerStats(
    playerId: string,
    isWinner: boolean,
    scoreChange: number,
  ): Promise<void> {
    const updates = {
      totalGames: sql`${players.totalGames} + 1`,
      totalScore: sql`${players.totalScore} + ${scoreChange}`,
      updatedAt: new Date(),
    };

    if (isWinner) {
      Object.assign(updates, {
        totalWins: sql`${players.totalWins} + 1`,
        currentStreak: sql`${players.currentStreak} + 1`,
      });
    } else {
      Object.assign(updates, {
        totalLosses: sql`${players.totalLosses} + 1`,
        currentStreak: 0,
      });
    }

    await db.update(players).set(updates).where(eq(players.id, playerId));
  }

  // Get leaderboard (top players by score)
  static async getLeaderboard(limit: number = 10): Promise<Player[]> {
    const leaderboard = await db
      .select()
      .from(players)
      .orderBy(desc(players.totalScore))
      .limit(limit);

    return leaderboard;
  }

  // Get player statistics
  static async getPlayerStats(playerId: string) {
    const [player] = await db
      .select({
        totalGames: players.totalGames,
        totalWins: players.totalWins,
        totalLosses: players.totalLosses,
        totalScore: players.totalScore,
        currentStreak: players.currentStreak,
        winRate: sql`CAST(${players.totalWins} AS REAL) / CAST(${players.totalGames} AS REAL)`,
      })
      .from(players)
      .where(eq(players.id, playerId));

    if (!player) return null;

    return {
      ...player,
      winRate: player.totalGames > 0 ? player.winRate : 0,
    };
  }
}
