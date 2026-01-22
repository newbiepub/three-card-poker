export interface Player {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  totalScore: number;
  currentStreak: number;
}

export interface Room {
  id: string;
  name: string;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  roomCode: string;
  hostId: string;
  currentSessionId: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface Session {
  id: string;
  roomId: string;
  hostId: string;
  totalRounds: number;
  currentRound: number;
  status: 'waiting' | 'playing' | 'finished';
  startedAt: string;
  finishedAt: string | null;
}

export interface Game {
  id: string;
  roomId: string;
  status: 'dealing' | 'playing' | 'finished';
  dealerId: string;
  roundNumber: number;
  pot: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
  value: number;
}

export interface CreateRoomRequest {
  hostName: string;
  roomName?: string;
  totalRounds?: number;
  maxPlayers?: number;
}

export interface JoinRoomRequest {
  roomCode: string;
  playerName: string;
}

export interface CreateRoomResponse {
  room: Room;
  roomCode: string;
  session: Session;
  host: Player;
}

export interface JoinRoomResponse {
  room: Room;
  session: Session | null;
  player: Player;
  isHost: boolean;
}

export interface PlayerStats {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  totalScore: number;
  currentStreak: number;
  winRate: number;
}
