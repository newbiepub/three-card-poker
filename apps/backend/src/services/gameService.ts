import { eq, and, desc } from "drizzle-orm";
import {
  db,
  games,
  gamePlayers,
  gameHistory,
  type Game,
  type NewGame,
  type NewGamePlayer,
  type NewGameHistory,
} from "../db";
import {
  generateGameId,
  type Card,
} from "@three-card-poker/shared";

export class GameService {
  // Create a new game
  static async createGame(roomId: string, dealerId: string): Promise<Game> {
    const newGame: NewGame = {
      id: generateGameId(),
      roomId,
      dealerId,
      status: "dealing",
      roundNumber: 1,
      pot: 0,
    };

    const [game] = await db.insert(games).values(newGame).returning();

    if (!game) throw new Error("Game not created");

    // Update room with current session
    await db
      .update(rooms)
      .set({ currentSessionId: game.id })
      .where(eq(rooms.id, roomId));

    return game;
  }

  // Add players to a game
  static async addPlayersToGame(
    gameId: string,
    playersWithCards: Array<{ playerId: string; cards: Card[]; score: number }>,
  ): Promise<void> {
    const gamePlayerEntries: NewGamePlayer[] = playersWithCards.map(
      (p, index) => ({
        id: `${gameId}-player-${index}`,
        gameId,
        playerId: p.playerId,
        cards: JSON.stringify(p.cards),
        score: p.score,
        isWinner: false,
        scoreChange: 0,
      }),
    );

    await db.insert(gamePlayers).values(gamePlayerEntries);

    // Record history
    const historyEntries: NewGameHistory[] = playersWithCards.map((p) => ({
      id: `${gameId}-history-${p.playerId}-dealt`,
      gameId,
      playerId: p.playerId,
      action: "dealt",
      data: JSON.stringify({ cards: p.cards, score: p.score }),
    }));

    await db.insert(gameHistory).values(historyEntries);
  }

  // Finish a game and calculate scores
  static async finishGame(
    gameId: string,
    winnerId: string,
    finalScores: Array<{ playerId: string; score: number }>,
  ): Promise<void> {
    // Calculate score changes
    const loserCount = finalScores.filter(
      (s) => s.playerId !== winnerId,
    ).length;
    const winnerPoints = loserCount * 5;
    const loserPoints = -5;

    // Update game status
    await db
      .update(games)
      .set({
        status: "finished",
        finishedAt: new Date(),
        winnerId,
      })
      .where(eq(games.id, gameId));

    // Update game players with results
    for (const scoreData of finalScores) {
      const isWinner = scoreData.playerId === winnerId;
      const scoreChange = isWinner ? winnerPoints : loserPoints;

      await db
        .update(gamePlayers)
        .set({
          isWinner,
          scoreChange,
        })
        .where(
          and(
            eq(gamePlayers.gameId, gameId),
            eq(gamePlayers.playerId, scoreData.playerId),
          ),
        );

      // Update player stats
      await PlayerService.updatePlayerStats(
        scoreData.playerId,
        isWinner,
        scoreChange,
      );

      // Record history
      await db.insert(gameHistory).values({
        id: `${gameId}-history-${scoreData.playerId}-finished`,
        gameId,
        playerId: scoreData.playerId,
        action: isWinner ? "won" : "lost",
        data: JSON.stringify({
          score: scoreData.score,
          scoreChange,
          finalPosition:
            finalScores.findIndex((s) => s.playerId === scoreData.playerId) + 1,
        }),
      });
    }

    // Clear current session from room
    const [game] = await db.select().from(games).where(eq(games.id, gameId));
    if (game) {
      await db
        .update(rooms)
        .set({
          currentSessionId: null,
          status: "waiting",
          finishedAt: new Date(),
        })
        .where(eq(rooms.id, game.roomId));
    }
  }

  // Get game details with players
  static async getGameWithPlayers(gameId: string) {
    const game = await db.query.games.findFirst({
      where: eq(games.id, gameId),
      with: {
        gamePlayers: {
          with: {
            player: true,
          },
        },
        room: true,
        dealer: true,
        winner: true,
      },
    });

    return game;
  }

  // Get player's game history
  static async getPlayerGameHistory(playerId: string, limit: number = 10) {
    const history = await db.query.gameHistory.findMany({
      where: eq(gameHistory.playerId, playerId),
      with: {
        game: {
          with: {
            room: true,
          },
        },
      },
      orderBy: desc(gameHistory.timestamp),
      limit,
    });

    return history;
  }

  // Get room game history
  static async getRoomGameHistory(roomId: string, limit: number = 20) {
    const roomGames = await db.query.games.findMany({
      where: eq(games.roomId, roomId),
      with: {
        gamePlayers: {
          with: {
            player: true,
          },
        },
        winner: true,
      },
      orderBy: desc(games.startedAt),
      limit,
    });

    return roomGames;
  }
}

// Import PlayerService at the bottom to avoid circular dependency
import { PlayerService } from "./playerService";
import { rooms } from "../db";
