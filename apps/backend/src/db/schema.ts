import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Players table
export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  totalGames: integer("total_games").default(0).notNull(),
  totalWins: integer("total_wins").default(0).notNull(),
  totalLosses: integer("total_losses").default(0).notNull(),
  totalScore: integer("total_score").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
});

// Rooms table
export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", { enum: ["waiting", "playing", "finished"] })
    .default("waiting")
    .notNull(),
  maxPlayers: integer("max_players").default(17).notNull(),
  roomCode: text("room_code").notNull().unique(),
  hostId: text("host_id").notNull(),
  currentSessionId: text("current_session_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
});

// Games table
export const games = sqliteTable("games", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  status: text("status", { enum: ["dealing", "playing", "finished"] })
    .default("dealing")
    .notNull(),
  dealerId: text("dealer_id").notNull(),
  roundNumber: integer("round_number").default(1).notNull(),
  pot: integer("pot").default(0).notNull(),
  startedAt: integer("started_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  winnerId: text("winner_id"),
});

// Game Players table
export const gamePlayers = sqliteTable("game_players", {
  id: text("id").primaryKey(),
  gameId: text("game_id")
    .notNull()
    .references(() => games.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  cards: text("cards").notNull(), // JSON string of cards
  score: integer("score").notNull(),
  isWinner: integer("is_winner", { mode: "boolean" }).default(false).notNull(),
  scoreChange: integer("score_change").default(0).notNull(),
  joinedAt: integer("joined_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Game History table
export const gameHistory = sqliteTable("game_history", {
  id: text("id").primaryKey(),
  gameId: text("game_id")
    .notNull()
    .references(() => games.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  action: text("action").notNull(), // 'joined', 'dealt', 'revealed', 'won', 'lost'
  data: text("data"), // JSON metadata
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Sessions table
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  hostId: text("host_id")
    .notNull()
    .references(() => players.id),
  totalRounds: integer("total_rounds").notNull(),
  currentRound: integer("current_round").default(1).notNull(),
  status: text("status", { enum: ["waiting", "playing", "finished"] })
    .default("waiting")
    .notNull(),
  startedAt: integer("started_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
});

export const roomPlayers = sqliteTable("room_players", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  joinedAt: integer("joined_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  leftAt: integer("left_at", { mode: "timestamp" }),
});

// Session Scores table
export const sessionScores = sqliteTable("session_scores", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  roundNumber: integer("round_number").notNull(),
  cards: text("cards"),
  gameScore: integer("game_score").notNull(),
  pointsChange: integer("points_change").notNull(),
  cumulativeScore: integer("cumulative_score").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Session Decks table (persist remaining cards per round)
export const sessionDecks = sqliteTable("session_decks", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  roundNumber: integer("round_number").notNull(),
  remainingCards: text("remaining_cards").notNull(), // JSON string of remaining cards
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Session Hands table (persist partial hands per player/round)
export const sessionHands = sqliteTable("session_hands", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  roundNumber: integer("round_number").notNull(),
  cards: text("cards").notNull(), // JSON string of cards drawn so far
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Session Piles table
export const sessionPiles = sqliteTable("session_piles", {
  id: text("id").primaryKey(), // "{sessionId}-{roundNumber}-{pileIndex}"
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  roundNumber: integer("round_number").notNull(),
  pileIndex: integer("pile_index").notNull(),
  cards: text("cards").notNull(), // JSON string of 3 cards
  claimedBy: text("claimed_by"), // playerId or null
  claimedAt: integer("claimed_at", { mode: "timestamp" }),
  isAutoPlayed: integer("is_auto_played", { mode: "boolean" })
    .default(false)
    .notNull(),
});

// Player Presence table
export const playerPresence = sqliteTable("player_presence", {
  id: text("id").primaryKey(), // "{roomId}-{playerId}"
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  status: text("status", { enum: ["online", "offline"] })
    .default("online")
    .notNull(),
  lastHeartbeat: integer("last_heartbeat", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  disconnectedAt: integer("disconnected_at", { mode: "timestamp" }),
});

// Auto Play Queue table
export const autoPlayQueue = sqliteTable("auto_play_queue", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  roundNumber: integer("round_number").notNull(),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  deadline: integer("deadline", { mode: "timestamp" }).notNull(),
  status: text("status", { enum: ["pending", "completed", "cancelled"] })
    .default("pending")
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Relations
export const roomsRelations = relations(rooms, ({ one, many }) => ({
  host: one(players, {
    fields: [rooms.hostId],
    references: [players.id],
  }),
  currentSession: one(sessions, {
    fields: [rooms.currentSessionId],
    references: [sessions.id],
  }),
  sessions: many(sessions),
  games: many(games),
  playerPresences: many(playerPresence),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  room: one(rooms, {
    fields: [games.roomId],
    references: [rooms.id],
  }),
  dealer: one(players, {
    fields: [games.dealerId],
    references: [players.id],
  }),
  winner: one(players, {
    fields: [games.winnerId],
    references: [players.id],
  }),
  gamePlayers: many(gamePlayers),
  history: many(gameHistory),
}));

export const playersRelations = relations(players, ({ many }) => ({
  gamesPlayed: many(gamePlayers),
  gamesDealt: many(games),
  gamesWon: many(games),
  history: many(gameHistory),
  presences: many(playerPresence),
  autoPlays: many(autoPlayQueue),
}));

export const gamePlayersRelations = relations(gamePlayers, ({ one }) => ({
  game: one(games, {
    fields: [gamePlayers.gameId],
    references: [games.id],
  }),
  player: one(players, {
    fields: [gamePlayers.playerId],
    references: [players.id],
  }),
}));

export const gameHistoryRelations = relations(gameHistory, ({ one }) => ({
  game: one(games, {
    fields: [gameHistory.gameId],
    references: [games.id],
  }),
  player: one(players, {
    fields: [gameHistory.playerId],
    references: [players.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  room: one(rooms, {
    fields: [sessions.roomId],
    references: [rooms.id],
  }),
  host: one(players, {
    fields: [sessions.hostId],
    references: [players.id],
  }),
  sessionScores: many(sessionScores),
  sessionDecks: many(sessionDecks),
  sessionHands: many(sessionHands),
  sessionPiles: many(sessionPiles),
  autoPlays: many(autoPlayQueue),
}));

export const sessionScoresRelations = relations(sessionScores, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionScores.sessionId],
    references: [sessions.id],
  }),
  player: one(players, {
    fields: [sessionScores.playerId],
    references: [players.id],
  }),
}));

export const sessionDecksRelations = relations(sessionDecks, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionDecks.sessionId],
    references: [sessions.id],
  }),
}));

export const sessionHandsRelations = relations(sessionHands, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionHands.sessionId],
    references: [sessions.id],
  }),
  player: one(players, {
    fields: [sessionHands.playerId],
    references: [players.id],
  }),
}));

export const sessionPilesRelations = relations(sessionPiles, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionPiles.sessionId],
    references: [sessions.id],
  }),
}));

export const playerPresenceRelations = relations(playerPresence, ({ one }) => ({
  room: one(rooms, {
    fields: [playerPresence.roomId],
    references: [rooms.id],
  }),
  player: one(players, {
    fields: [playerPresence.playerId],
    references: [players.id],
  }),
}));

export const autoPlayQueueRelations = relations(autoPlayQueue, ({ one }) => ({
  session: one(sessions, {
    fields: [autoPlayQueue.sessionId],
    references: [sessions.id],
  }),
  player: one(players, {
    fields: [autoPlayQueue.playerId],
    references: [players.id],
  }),
}));

// Types for use in the application
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type NewGamePlayer = typeof gamePlayers.$inferInsert;
export type GameHistory = typeof gameHistory.$inferSelect;
export type NewGameHistory = typeof gameHistory.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionScore = typeof sessionScores.$inferSelect;
export type NewSessionScore = typeof sessionScores.$inferInsert;
export type SessionDeck = typeof sessionDecks.$inferSelect;
export type NewSessionDeck = typeof sessionDecks.$inferInsert;
export type SessionHand = typeof sessionHands.$inferSelect;
export type NewSessionHand = typeof sessionHands.$inferInsert;
export type SessionPile = typeof sessionPiles.$inferSelect;
export type NewSessionPile = typeof sessionPiles.$inferInsert;
export type PlayerPresenceModel = typeof playerPresence.$inferSelect;
export type NewPlayerPresence = typeof playerPresence.$inferInsert;
export type AutoPlayQueueItem = typeof autoPlayQueue.$inferSelect;
export type NewAutoPlayQueueItem = typeof autoPlayQueue.$inferInsert;
