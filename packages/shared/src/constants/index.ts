import type { Suit, Rank } from "../types";

// Card values
export const CARD_VALUES: Record<Rank, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 0,
  J: 0,
  Q: 0,
  K: 0,
};

// Card suits
export const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
export const RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

// Suit order for tie-breaking (low to high: ♠ < ♣ < ♦ < ♥)
export const SUIT_ORDER: Record<Suit, number> = {
  "♠": 0,
  "♣": 1,
  "♦": 2,
  "♥": 3,
};

// Rank order for comparing card values (A < 2 < ... < 10 < J < Q < K)
export const RANK_ORDER: Record<Rank, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
};

// Face cards for Ba Tiên detection
export const FACE_CARDS: Rank[] = ["J", "Q", "K"];

// Game configuration
export const GAME_CONFIG = {
  MAX_PLAYERS: 6,
  MIN_PLAYERS: 2,
  CARDS_PER_PLAYER: 3,
  DECK_SIZE: 52,
  MAX_SCORE: 9,
};

// Room settings
export const ROOM_CONFIG = {
  MAX_ROOM_NAME_LENGTH: 50,
  MAX_PLAYER_NAME_LENGTH: 20,
  ROOM_ID_LENGTH: 9,
};

// WebSocket message types
export const WS_MESSAGE_TYPES = {
  // Client to Server
  JOIN_ROOM: "joinRoom",
  LEAVE_ROOM: "leaveRoom",
  START_GAME: "startGame",
  REVEAL_CARDS: "revealCards",
  PLACE_BET: "placeBet",
  PLAYER_READY: "playerReady",

  // Server to Client
  CONNECTED: "connected",
  ROOM_JOINED: "roomJoined",
  ROOM_UPDATED: "roomUpdated",
  GAME_STARTED: "gameStarted",
  CARDS_DEALT: "cardsDealt",
  PLAYER_REVEALED: "playerRevealed",
  GAME_ENDED: "gameEnded",
  ERROR: "error",
  PLAYER_JOINED: "playerJoined",
  PLAYER_LEFT: "playerLeft",
} as const;

// Game phases
export const GAME_PHASES = {
  WAITING: "waiting",
  DEALING: "dealing",
  PLAYING: "playing",
  FINISHED: "finished",
} as const;

// Error messages
export const ERROR_MESSAGES = {
  ROOM_FULL: "Room is full",
  ROOM_NOT_FOUND: "Room not found",
  INVALID_NAME: "Invalid name",
  GAME_ALREADY_STARTED: "Game has already started",
  NOT_ENOUGH_PLAYERS: "Not enough players to start",
  INVALID_CARDS: "Invalid cards",
  ALREADY_REVEALED: "Cards already revealed",
} as const;
