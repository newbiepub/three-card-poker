import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  sessions,
  sessionScores,
  sessionDecks,
  sessionHands,
  rooms,
  players,
  type Session,
  type NewSession,
  type SessionScore,
  type NewSessionScore,
  type NewSessionDeck,
  type NewSessionHand,
} from "../db";
import {
  generateSessionId,
  createDeck,
  shuffle,
  calculateScore,
  evaluateHand,
  determineWinner,
} from "@three-card-poker/shared";
import type { Card, HandResult } from "@three-card-poker/shared";
import { RoomService } from "./roomService";

export interface SessionScoreData {
  playerId: string;
  gameScore: number;
  pointsChange: number;
}

export class SessionService {
  // Create a new session
  static async createSession(
    roomId: string,
    hostId: string,
    totalRounds: number,
  ): Promise<Session> {
    const newSession: NewSession = {
      id: generateSessionId(),
      roomId,
      hostId,
      totalRounds,
      currentRound: 1,
      status: "waiting",
    };

    const [session] = await db.insert(sessions).values(newSession).returning();
    if (!session) throw new Error("Session not created");

    // Update room with current session
    await RoomService.setCurrentSession(roomId, session.id);

    return session;
  }

  static async recalculateRoundPoints(
    sessionId: string,
    roundNumber: number,
  ): Promise<void> {
    const roundScores = await db
      .select({
        id: sessionScores.id,
        playerId: sessionScores.playerId,
        gameScore: sessionScores.gameScore,
        cards: sessionScores.cards,
      })
      .from(sessionScores)
      .where(
        and(
          eq(sessionScores.sessionId, sessionId),
          eq(sessionScores.roundNumber, roundNumber),
        ),
      );

    if (roundScores.length === 0) {
      return;
    }

    // Evaluate all hands and determine winner using new hand ranking system
    const handResults: { playerId: string; id: string; hand: HandResult }[] =
      [];

    for (const scoreRow of roundScores) {
      if (scoreRow.cards) {
        const cards = JSON.parse(scoreRow.cards) as Card[];
        const handResult = evaluateHand(cards);
        handResults.push({
          playerId: scoreRow.playerId,
          id: scoreRow.id,
          hand: handResult,
        });
      }
    }

    // If no valid hands with cards, fall back to simple gameScore comparison
    let winnerPlayerId: string;
    if (handResults.length === 0) {
      const winner = roundScores.reduce((prev, current) =>
        current.gameScore > prev.gameScore ? current : prev,
      );
      winnerPlayerId = winner.playerId;
    } else {
      // Use hand evaluation to determine winner
      const winnerIndex = determineWinner(handResults.map((h) => h.hand));
      winnerPlayerId = handResults[winnerIndex].playerId;
    }

    const loserCount = Math.max(roundScores.length - 1, 0);
    const winnerPoints = loserCount * 5;
    const loserPoints = -5;

    for (const scoreRow of roundScores) {
      const previousScore = await db
        .select({ cumulativeScore: sessionScores.cumulativeScore })
        .from(sessionScores)
        .where(
          and(
            eq(sessionScores.sessionId, sessionId),
            eq(sessionScores.playerId, scoreRow.playerId),
            sql`${sessionScores.roundNumber} < ${roundNumber}`,
          ),
        )
        .orderBy(desc(sessionScores.roundNumber))
        .limit(1);

      const previousCumulative = previousScore[0]?.cumulativeScore ?? 0;
      const pointsChange =
        scoreRow.playerId === winnerPlayerId ? winnerPoints : loserPoints;

      await db
        .update(sessionScores)
        .set({
          pointsChange,
          cumulativeScore: previousCumulative + pointsChange,
        })
        .where(eq(sessionScores.id, scoreRow.id));
    }
  }

  // Get session by ID
  static async getSessionById(id: string) {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
      with: {
        room: true,
        host: true,
        sessionScores: {
          with: {
            player: true,
          },
          orderBy: desc(sessionScores.roundNumber),
        },
      },
    });

    return session;
  }

  // Start a session
  static async startSession(sessionId: string): Promise<void> {
    await db
      .update(sessions)
      .set({ status: "playing" })
      .where(eq(sessions.id, sessionId));
  }

  // Move to next round
  static async nextRound(
    sessionId: string,
  ): Promise<{ currentRound: number; isFinalRound: boolean }> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session) throw new Error("Session not found");

    const nextRound = session.currentRound + 1;
    const isFinalRound = nextRound > session.totalRounds;

    if (isFinalRound) {
      // End the session
      await db
        .update(sessions)
        .set({
          status: "finished",
          finishedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId));
    } else {
      // Update current round
      await db
        .update(sessions)
        .set({ currentRound: nextRound })
        .where(eq(sessions.id, sessionId));
    }

    return { currentRound: nextRound, isFinalRound };
  }

  // Add round scores
  static async addRoundScores(
    sessionId: string,
    roundNumber: number,
    scores: SessionScoreData[],
  ): Promise<void> {
    // Get current cumulative scores for each player
    const existingScores = await db
      .select()
      .from(sessionScores)
      .where(eq(sessionScores.sessionId, sessionId));

    const cumulativeScores = new Map<string, number>();
    existingScores.forEach((score) => {
      cumulativeScores.set(score.playerId, score.cumulativeScore);
    });

    // Insert new round scores
    const newScores: NewSessionScore[] = scores.map((score) => {
      const currentCumulative = cumulativeScores.get(score.playerId) || 0;
      return {
        id: `${sessionId}-${roundNumber}-${score.playerId}`,
        sessionId,
        playerId: score.playerId,
        roundNumber,
        gameScore: score.gameScore,
        pointsChange: score.pointsChange,
        cumulativeScore: currentCumulative + score.pointsChange,
      };
    });

    await db.insert(sessionScores).values(newScores);
  }

  // Get session leaderboard
  static async getSessionLeaderboard(sessionId: string) {
    const leaderboard = await db
      .select({
        playerId: sessionScores.playerId,
        playerName: players.name,
        totalScore: sql<number>`MAX(${sessionScores.cumulativeScore})`,
        roundsPlayed: sql<number>`COUNT(DISTINCT ${sessionScores.roundNumber})`,
        averageScore: sql<number>`AVG(${sessionScores.gameScore})`,
      })
      .from(sessionScores)
      .innerJoin(players, eq(players.id, sessionScores.playerId))
      .where(eq(sessionScores.sessionId, sessionId))
      .groupBy(sessionScores.playerId, players.name)
      .orderBy(desc(sql`MAX(${sessionScores.cumulativeScore})`));

    return leaderboard;
  }

  // Get session history
  static async getSessionHistory(sessionId: string) {
    const history = await db
      .select({
        roundNumber: sessionScores.roundNumber,
        playerId: sessionScores.playerId,
        playerName: players.name,
        gameScore: sessionScores.gameScore,
        pointsChange: sessionScores.pointsChange,
        cumulativeScore: sessionScores.cumulativeScore,
      })
      .from(sessionScores)
      .innerJoin(players, eq(players.id, sessionScores.playerId))
      .where(eq(sessionScores.sessionId, sessionId))
      .orderBy(sessionScores.roundNumber, desc(sessionScores.cumulativeScore));

    return history;
  }

  static async resetDeckForRound(
    sessionId: string,
    roundNumber: number,
  ): Promise<void> {
    const deck = shuffle(createDeck());
    const payload: NewSessionDeck = {
      id: `${sessionId}-${roundNumber}`,
      sessionId,
      roundNumber,
      remainingCards: JSON.stringify(deck),
    };

    const existingDeck = await db
      .select()
      .from(sessionDecks)
      .where(eq(sessionDecks.id, payload.id))
      .limit(1);

    if (existingDeck.length > 0) {
      await db
        .update(sessionDecks)
        .set({ remainingCards: payload.remainingCards, createdAt: new Date() })
        .where(eq(sessionDecks.id, payload.id));
      return;
    }

    await db.insert(sessionDecks).values(payload);
  }

  static async drawCardForRound(
    sessionId: string,
    roundNumber: number,
  ): Promise<{ card: Card; remaining: number }> {
    const deckId = `${sessionId}-${roundNumber}`;
    const deckRow = await db
      .select()
      .from(sessionDecks)
      .where(eq(sessionDecks.id, deckId))
      .limit(1);

    if (deckRow.length === 0) {
      await this.resetDeckForRound(sessionId, roundNumber);
      return this.drawCardForRound(sessionId, roundNumber);
    }

    const deckRecord = deckRow[0];
    if (!deckRecord) {
      throw new Error("Deck not found");
    }
    const remainingCards = JSON.parse(deckRecord.remainingCards) as Card[];
    const card = remainingCards.shift();

    if (!card) {
      throw new Error("No cards remaining");
    }

    await db
      .update(sessionDecks)
      .set({ remainingCards: JSON.stringify(remainingCards) })
      .where(eq(sessionDecks.id, deckId));

    return { card, remaining: remainingCards.length };
  }

  static async appendPlayerCard(
    sessionId: string,
    playerId: string,
    roundNumber: number,
    card: Card,
  ): Promise<{ hand: Card[]; score: number | null }> {
    const handId = `${sessionId}-${roundNumber}-${playerId}`;
    const existingHand = await db
      .select()
      .from(sessionHands)
      .where(eq(sessionHands.id, handId))
      .limit(1);

    const existingHandRecord = existingHand[0];
    const cards = existingHandRecord
      ? (JSON.parse(existingHandRecord.cards) as Card[])
      : [];

    const updatedCards = [...cards, card];

    if (existingHand.length > 0) {
      await db
        .update(sessionHands)
        .set({ cards: JSON.stringify(updatedCards), updatedAt: new Date() })
        .where(eq(sessionHands.id, handId));
    } else {
      const payload: NewSessionHand = {
        id: handId,
        sessionId,
        playerId,
        roundNumber,
        cards: JSON.stringify(updatedCards),
      };
      await db.insert(sessionHands).values(payload);
    }

    if (updatedCards.length < 3) {
      return { hand: updatedCards, score: null };
    }

    const score = calculateScore(updatedCards);
    return { hand: updatedCards, score };
  }

  // Reset session (create new session for same room)
  static async resetSession(
    oldSessionId: string,
    newTotalRounds?: number,
  ): Promise<Session> {
    const oldSession = await this.getSessionById(oldSessionId);
    if (!oldSession) throw new Error("Session not found");

    const totalRounds = newTotalRounds || oldSession.totalRounds;

    // Create new session
    const newSession = await this.createSession(
      oldSession.roomId,
      oldSession.hostId,
      totalRounds,
    );

    return newSession;
  }

  // Check if user is host of session
  static async isHost(sessionId: string, playerId: string): Promise<boolean> {
    const [session] = await db
      .select({ hostId: sessions.hostId })
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    return session?.hostId === playerId;
  }

  // Get current session for room
  static async getCurrentSession(roomId: string) {
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
      with: {
        currentSession: {
          with: {
            host: true,
            sessionScores: {
              with: {
                player: true,
              },
            },
          },
        },
      },
    });

    return room?.currentSession || null;
  }

  // Save player score for a round
  static async savePlayerScore(
    sessionId: string,
    playerId: string,
    roundNumber: number,
    score: number,
  ): Promise<SessionScore> {
    const existingScores = await db
      .select()
      .from(sessionScores)
      .where(
        and(
          eq(sessionScores.sessionId, sessionId),
          eq(sessionScores.playerId, playerId),
        ),
      )
      .orderBy(desc(sessionScores.roundNumber));

    const lastCumulative = existingScores[0]?.cumulativeScore || 0;
    const scoreId = `${sessionId}-${roundNumber}-${playerId}`;

    const existingScore = await db
      .select()
      .from(sessionScores)
      .where(eq(sessionScores.id, scoreId))
      .limit(1);

    if (existingScore.length > 0) {
      const [updatedScore] = await db
        .update(sessionScores)
        .set({
          gameScore: score,
          pointsChange: 0,
          cumulativeScore: lastCumulative,
        })
        .where(eq(sessionScores.id, scoreId))
        .returning();

      if (!updatedScore) throw new Error("Failed to update score");
      return updatedScore;
    }

    const newScore: NewSessionScore = {
      id: scoreId,
      sessionId,
      playerId,
      roundNumber,
      gameScore: score,
      pointsChange: 0,
      cumulativeScore: lastCumulative,
    };

    const [savedScore] = await db
      .insert(sessionScores)
      .values(newScore)
      .returning();
    if (!savedScore) throw new Error("Failed to save score");
    return savedScore;
  }

  // Update session round
  static async updateSessionRound(
    sessionId: string,
    roundNumber: number,
  ): Promise<Session> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session) throw new Error("Session not found");

    const isFinished = roundNumber > session.totalRounds;

    const [updatedSession] = await db
      .update(sessions)
      .set({
        currentRound: roundNumber,
        status: isFinished ? "finished" : "playing",
        finishedAt: isFinished ? new Date() : null,
      })
      .where(eq(sessions.id, sessionId))
      .returning();

    if (!updatedSession) throw new Error("Failed to update session");
    return updatedSession;
  }

  // Get scores for a specific round
  static async getRoundScores(sessionId: string, roundNumber: number) {
    const scores = await db
      .select({
        playerId: sessionScores.playerId,
        playerName: players.name,
        gameScore: sessionScores.gameScore,
        pointsChange: sessionScores.pointsChange,
        cumulativeScore: sessionScores.cumulativeScore,
        cards: sessionScores.cards,
      })
      .from(sessionScores)
      .innerJoin(players, eq(players.id, sessionScores.playerId))
      .where(
        and(
          eq(sessionScores.sessionId, sessionId),
          eq(sessionScores.roundNumber, roundNumber),
        ),
      );

    return scores;
  }

  // Get all scores for all players in a session (for scoreboard)
  static async getAllPlayerScores(sessionId: string) {
    const scores = await db
      .select({
        playerId: sessionScores.playerId,
        playerName: players.name,
        roundNumber: sessionScores.roundNumber,
        gameScore: sessionScores.gameScore,
        pointsChange: sessionScores.pointsChange,
        cumulativeScore: sessionScores.cumulativeScore,
      })
      .from(sessionScores)
      .innerJoin(players, eq(players.id, sessionScores.playerId))
      .where(eq(sessionScores.sessionId, sessionId))
      .orderBy(sessionScores.roundNumber, sessionScores.playerId);

    return scores;
  }

  static async savePlayerHand(
    sessionId: string,
    playerId: string,
    roundNumber: number,
    hand: unknown[],
    score: number,
  ): Promise<SessionScore> {
    const existingScores = await db
      .select()
      .from(sessionScores)
      .where(
        and(
          eq(sessionScores.sessionId, sessionId),
          eq(sessionScores.playerId, playerId),
        ),
      )
      .orderBy(desc(sessionScores.roundNumber));

    const lastCumulative = existingScores[0]?.cumulativeScore || 0;

    const scoreId = `${sessionId}-${roundNumber}-${playerId}`;

    const existingScore = await db
      .select()
      .from(sessionScores)
      .where(eq(sessionScores.id, scoreId))
      .limit(1);

    if (existingScore.length > 0) {
      const [updatedScore] = await db
        .update(sessionScores)
        .set({
          cards: JSON.stringify(hand),
          gameScore: score,
        })
        .where(eq(sessionScores.id, scoreId))
        .returning();

      if (!updatedScore) throw new Error("Failed to update hand");
      return updatedScore;
    }

    const newScore: NewSessionScore = {
      id: scoreId,
      sessionId,
      playerId,
      roundNumber,
      cards: JSON.stringify(hand),
      gameScore: score,
      pointsChange: 0,
      cumulativeScore: lastCumulative,
    };

    const [savedScore] = await db
      .insert(sessionScores)
      .values(newScore)
      .returning();
    if (!savedScore) throw new Error("Failed to save hand");
    return savedScore;
  }
}
