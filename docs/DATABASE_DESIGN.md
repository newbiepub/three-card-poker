# Database Design - Three Card Poker

## Database Choice

- **Database**: Bun SQLite
- **ORM**: Drizzle ORM (TypeScript-safe ORM for SQLite)
- **Location**: Local file storage with backup support

## Schema Design

### Tables

#### 1. Players

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0
);
```

#### 2. Rooms

```sql
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT CHECK(status IN ('waiting', 'playing', 'finished')) DEFAULT 'waiting',
  max_players INTEGER DEFAULT 6,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  current_game_id TEXT NULL
);
```

#### 3. Games

```sql
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('dealing', 'playing', 'finished')) DEFAULT 'dealing',
  dealer_id TEXT NOT NULL,
  round_number INTEGER DEFAULT 1,
  pot INTEGER DEFAULT 0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  winner_id TEXT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);
```

#### 4. Game Players

```sql
CREATE TABLE game_players (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  cards TEXT NOT NULL, -- JSON array of cards
  score INTEGER NOT NULL,
  is_winner BOOLEAN DEFAULT FALSE,
  score_change INTEGER DEFAULT 0, -- Points gained/lost
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);
```

#### 5. Game History

```sql
CREATE TABLE game_history (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'joined', 'dealt', 'revealed', 'won', 'lost'
  data TEXT NULL, -- JSON metadata
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_games_room_id ON games(room_id);
CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_player_id ON game_players(player_id);
CREATE INDEX idx_game_history_game_id ON game_history(game_id);
CREATE INDEX idx_game_history_player_id ON game_history(player_id);
CREATE INDEX idx_players_total_score ON players(total_score DESC);
```

## Scoring System

### Point Calculation Rules

- **Base Points**: 5 points per game
- **Winner**: +5 points × number of losers
- **Losers**: -5 points each
- **Tie**: No point changes

### Examples:

- 2 players: Winner gets +5, loser gets -5
- 3 players: Winner gets +10, 2 losers get -5 each
- 4 players: Winner gets +15, 3 losers get -5 each
- 5 players: Winner gets +20, 4 losers get -5 each
- 6 players: Winner gets +25, 5 losers get -5 each

### Score Update Logic

```typescript
async function updateGameScores(
  gameId: string,
  winnerId: string,
  loserIds: string[],
) {
  const pointsPerLoser = 5;
  const winnerPoints = loserIds.length * pointsPerLoser;

  // Update winner
  await db
    .update(players)
    .set({
      total_score: sql`${players.total_score} + ${winnerPoints}`,
      total_wins: sql`${players.total_wins} + 1`,
      total_games: sql`${players.total_games} + 1`,
      current_streak: sql`${players.current_streak} + 1`,
    })
    .where(eq(players.id, winnerId));

  // Update losers
  for (const loserId of loserIds) {
    await db
      .update(players)
      .set({
        total_score: sql`${players.total_score} - ${pointsPerLoser}`,
        total_losses: sql`${players.total_losses} + 1`,
        total_games: sql`${players.total_games} + 1`,
        current_streak: 0,
      })
      .where(eq(players.id, loserId));
  }

  // Record in game_players
  await db.insert(game_players).values([
    {
      game_id: gameId,
      player_id: winnerId,
      score_change: winnerPoints,
      is_winner: true,
    },
    ...loserIds.map((loserId) => ({
      game_id: gameId,
      player_id: loserId,
      score_change: -pointsPerLoser,
      is_winner: false,
    })),
  ]);
}
```

## Database Setup

### Installation

```bash
cd apps/backend
bun add drizzle-orm better-sqlite3
bun add -D @types/better-sqlite3 drizzle-kit
```

### Configuration

```typescript
// src/db/index.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export const db = drizzle(Database("poker.db"), { schema });
```

### Migrations

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "better-sqlite3",
  dbCredentials: {
    url: "./poker.db",
  },
} satisfies Config;
```

## Data Persistence

### Game State

- Active games stored in memory for performance
- Game results persisted to database immediately
- Player stats updated in real-time

### Backup Strategy

- Daily automatic backups
- Manual backup API endpoint
- Export to JSON format

### Data Retention

- Game history: Keep last 1000 games per room
- Player stats: Permanent
- Room data: Archive after 30 days of inactivity
