// Card types
export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
}

// Hand types for Three Card Poker (ranked from highest to lowest)
export type HandType = "triple" | "baTien" | "pair" | "normal";

// Hand evaluation result
export interface HandResult {
  type: HandType;
  cards: Card[];
  // For normal hands: 0-9 score
  // For triple/pair: rank order value for comparison
  score: number;
  // Additional data for tie-breaking
  tripleRank?: Rank;
  pairRank?: Rank;
  kicker?: Card;
}

// Player types
export interface Player {
  id: string;
  name: string;
  cards?: Card[];
  score?: number | null;
  isReady?: boolean;
  hasRevealed?: boolean;
  isDealer?: boolean;
}

// Room types
export interface Room {
  id: string;
  name: string;
  players: Player[];
  status: "waiting" | "playing" | "finished";
  maxPlayers: number;
  currentGame?: Game;
  createdAt: Date;
}

// Game types
export interface Game {
  id: string;
  roomId: string;
  dealerId: string;
  status: "dealing" | "playing" | "finished";
  round: number;
  pot: number;
  winner?: Player;
  scores: GameScore[];
  startedAt: Date;
  finishedAt?: Date;
}

export interface GameScore {
  playerId: string;
  playerName: string;
  cards: Card[];
  score: number;
  isWinner: boolean;
}

// WebSocket events
export interface ClientToServerEvents {
  joinRoom: { roomId: string; playerName: string };
  leaveRoom: { roomId: string };
  startGame: {};
  revealCards: { cards: Card[] };
  placeBet: { amount: number };
  playerReady: {};
}

export interface ServerToClientEvents {
  connected: { message: string };
  roomJoined: { roomId: string; players: Player[] };
  roomUpdated: { room: Room };
  gameStarted: { game: Game };
  cardsDealt: { cards: Card[] };
  playerRevealed: { playerId: string; cards: Card[]; score: number };
  gameEnded: { winner: Player; scores: GameScore[] };
  error: { message: string };
  playerJoined: { player: Player };
  playerLeft: { playerId: string };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Game configuration
export interface GameConfig {
  maxPlayers: number;
  minPlayers: number;
  deckCount: number;
  betLimits: {
    min: number;
    max: number;
  };
}
