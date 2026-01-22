export const queryKeys = {
  players: {
    all: ['players'] as const,
    byName: (name: string) => ['players', 'byName', name] as const,
    history: (playerId: string, limit?: number) => 
      ['players', playerId, 'history', limit] as const,
  },
  rooms: {
    all: ['rooms'] as const,
    byCode: (code: string) => ['rooms', 'byCode', code] as const,
    history: (roomId: string, limit?: number) => 
      ['rooms', roomId, 'history', limit] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    byId: (id: string) => ['sessions', id] as const,
    leaderboard: (sessionId: string) => 
      ['sessions', sessionId, 'leaderboard'] as const,
    history: (sessionId: string) => 
      ['sessions', sessionId, 'history'] as const,
  },
  leaderboard: {
    all: ['leaderboard'] as const,
    top: (limit?: number) => ['leaderboard', 'top', limit] as const,
  },
} as const;
