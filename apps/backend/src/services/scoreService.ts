import { eq, desc, sql } from "drizzle-orm";
import { db, players, games, gamePlayers } from "../db";

export class ScoreService {
  // Calculate score changes for a game
  static calculateScoreChanges(
    winnerId: string,
    playerIds: string[]
  ): { playerId: string; change: number }[] {
    const loserCount = playerIds.filter(id => id !== winnerId).length;
    const winnerPoints = loserCount * 5;
    const loserPoints = -5;

    return playerIds.map(playerId => ({
      playerId,
      change: playerId === winnerId ? winnerPoints : loserPoints,
    }));
  }

  // Get top players by score
  static async getTopPlayers(limit: number = 10) {
    const topPlayers = await db
      .select({
        id: players.id,
        name: players.name,
        totalScore: players.totalScore,
        totalGames: players.totalGames,
        totalWins: players.totalWins,
        currentStreak: players.currentStreak,
        winRate: sql`CAST(${players.totalWins} AS REAL) / NULLIF(CAST(${players.totalGames} AS REAL), 0)`,
      })
      .from(players)
      .orderBy(desc(players.totalScore))
      .limit(limit);

    return topPlayers.map(player => ({
      ...player,
      winRate: player.totalGames > 0 ? player.winRate : 0,
    }));
  }

  // Get player's score history
  static async getPlayerScoreHistory(playerId: string, limit: number = 20) {
    const history = await db
      .select({
        gameId: gamePlayers.gameId,
        score: gamePlayers.score,
        scoreChange: gamePlayers.scoreChange,
        isWinner: gamePlayers.isWinner,
        playedAt: games.startedAt,
      })
      .from(gamePlayers)
      .innerJoin(games, eq(games.id, gamePlayers.gameId))
      .where(eq(gamePlayers.playerId, playerId))
      .orderBy(desc(games.startedAt))
      .limit(limit);

    return history;
  }

  // Get player's rank on leaderboard
  static async getPlayerRank(playerId: string): Promise<number> {
    const result = await db
      .select({
        rank: sql<number>`COUNT(*) + 1`,
      })
      .from(players)
      .where(sql`${players.totalScore} > (SELECT ${players.totalScore} FROM ${players} WHERE ${players.id} = ${playerId})`);

    return result[0]?.rank || 1;
  }

  // Get score statistics for a room
  static async getRoomScoreStats(roomId: string) {
    const stats = await db
      .select({
        totalGames: sql<number>`COUNT(DISTINCT ${games.id})`,
        avgWinnerScore: sql<number>`AVG(CASE WHEN ${gamePlayers.isWinner} = 1 THEN ${gamePlayers.score} END)`,
        highestWinScore: sql<number>`MAX(CASE WHEN ${gamePlayers.isWinner} = 1 THEN ${gamePlayers.score} END)`,
        totalPointsAwarded: sql<number>`SUM(CASE WHEN ${gamePlayers.scoreChange} > 0 THEN ${gamePlayers.scoreChange} ELSE 0 END)`,
        totalPointsLost: sql<number>`SUM(CASE WHEN ${gamePlayers.scoreChange} < 0 THEN ABS(${gamePlayers.scoreChange}) ELSE 0 END)`,
      })
      .from(games)
      .leftJoin(gamePlayers, eq(games.id, gamePlayers.gameId))
      .where(eq(games.roomId, roomId));

    return stats[0] || {
      totalGames: 0,
      avgWinnerScore: 0,
      highestWinScore: 0,
      totalPointsAwarded: 0,
      totalPointsLost: 0,
    };
  }

  // Get players with highest win streaks
  static async getTopWinStreaks(limit: number = 5) {
    const topStreaks = await db
      .select({
        id: players.id,
        name: players.name,
        currentStreak: players.currentStreak,
        totalWins: players.totalWins,
        totalScore: players.totalScore,
      })
      .from(players)
      .where(sql`${players.currentStreak} > 0`)
      .orderBy(desc(players.currentStreak), desc(players.totalWins))
      .limit(limit);

    return topStreaks;
  }

  // Reset all scores (for testing/tournaments)
  static async resetAllScores(): Promise<void> {
    await db
      .update(players)
      .set({
        totalScore: 0,
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        currentStreak: 0,
      });
  }
}
