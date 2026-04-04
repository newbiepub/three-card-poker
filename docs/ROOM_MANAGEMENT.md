# Room Management System

## Overview

Enhanced room system with host controls, 6-digit room codes, and session-based gameplay.

## Player Registration

### Local Storage

```typescript
// Player data stored in localStorage
interface PlayerData {
  name: string;
  id: string;
  totalScore: number;
  lastPlayed: string;
}

// Storage key
const PLAYER_STORAGE_KEY = "three-card-poker-player";
```

### Name Entry Flow

1. **First Time Players**:
   - Prompt for name on app load
   - Generate unique player ID
   - Save to localStorage
   - Sync with database

2. **Returning Players**:
   - Auto-load from localStorage
   - Verify with database
   - Update last played timestamp

## Room System

### Room Code Format

- **Format**: 6-digit numeric code (e.g., "123456")
- **Generation**: Random 6-digit number
- **Validation**: Check for duplicates before assigning

### Room Roles

#### Host (Room Creator)

- Creates room with custom settings
- Sets number of rounds per session
- Controls game flow
- Can reset session
- Manages player permissions

#### Player (Room Joiner)

- Joins with room code
- Waits for host to start
- Participates in all rounds
- Cannot change settings

### Session Management

#### Game Session Structure

```typescript
interface GameSession {
  roomId: string;
  hostId: string;
  totalRounds: number;
  currentRound: number;
  scores: RoundScore[];
  status: "waiting" | "playing" | "finished";
  startTime: Date;
  endTime?: Date;
}

interface RoundScore {
  roundNumber: number;
  playerScores: {
    playerId: string;
    score: number;
    pointsChange: number;
  }[];
}
```

#### Session Flow

1. **Host Setup**:
   - Creates room
   - Sets number of rounds (1-20)
   - Waits for players to join

2. **Playing Phase**:
   - Each round played sequentially
   - Scores accumulated across rounds
   - Real-time leaderboard updates

3. **Session End**:
   - Final scores calculated
   - Winner announced
   - Scores saved to database
   - Host can start new session

## Database Schema Updates

### Sessions Table

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  host_id TEXT NOT NULL,
  total_rounds INTEGER NOT NULL,
  current_round INTEGER DEFAULT 1,
  status TEXT CHECK(status IN ('waiting', 'playing', 'finished')) DEFAULT 'waiting',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (host_id) REFERENCES players(id)
);
```

### Session Scores Table

```sql
CREATE TABLE session_scores (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  game_score INTEGER NOT NULL,
  points_change INTEGER NOT NULL,
  cumulative_score INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);
```

### Updated Rooms Table

```sql
ALTER TABLE rooms ADD COLUMN room_code TEXT UNIQUE NOT NULL;
ALTER TABLE rooms ADD COLUMN host_id TEXT NOT NULL;
ALTER TABLE rooms ADD COLUMN current_session_id TEXT NULL;
```

## API Endpoints

### Player Management

```typescript
POST /api/players/register
{
  name: string;
}

Response: {
  player: Player;
  isNewPlayer: boolean;
}

GET /api/players/me
Headers: Authorization: Bearer <player-token>

Response: {
  player: Player;
  stats: PlayerStats;
}
```

### Room Management

```typescript
POST /api/rooms/create
{
  hostName: string;
  totalRounds: number;
}

Response: {
  room: Room;
  roomCode: string;
  session: GameSession;
}

POST /api/rooms/join
{
  roomCode: string;
  playerName: string;
}

Response: {
  room: Room;
  session?: GameSession;
  players: Player[];
}

GET /api/rooms/:roomCode
Response: {
  room: Room;
  session?: GameSession;
  players: Player[];
  isHost: boolean;
}
```

### Session Control

```typescript
POST /api/sessions/:sessionId/start
{
  hostId: string;
}

POST /api/sessions/:sessionId/next-round
{
  hostId: string;
}

POST /api/sessions/:sessionId/reset
{
  hostId: string;
  newTotalRounds?: number;
}

GET /api/sessions/:sessionId/leaderboard
Response: {
  roundScores: RoundScore[];
  cumulativeScores: CumulativeScore[];
}
```

## UI Components

### Name Entry Modal

```tsx
interface NameEntryModalProps {
  onSubmit: (name: string) => void;
  isLoading?: boolean;
}

// Features:
- Input validation
- Name uniqueness check
- Remember me option
- Guest mode (no persistence)
```

### Room Code Input

```tsx
interface RoomCodeInputProps {
  onJoin: (code: string) => void;
  error?: string;
}

// Features:
- 6-digit numeric keypad
- Auto-formatting
- Validation feedback
- Recent rooms list
```

### Host Control Panel

```tsx
interface HostControlsProps {
  session: GameSession;
  players: Player[];
  onStartSession: () => void;
  onNextRound: () => void;
  onResetSession: (newRounds?: number) => void;
}

// Features:
- Round counter
- Player list with kick option
- Session settings
- Reset confirmation
```

### Session Scoreboard

```tsx
interface SessionScoreboardProps {
  session: GameSession;
  currentPlayerId: string;
}

// Features:
- Round-by-round scores
- Cumulative totals
- Round winner highlighting
- Final session results
```

## WebSocket Events

### Room Events

```typescript
// Client -> Server
interface RoomEvents {
  "room:create": { hostName: string; totalRounds: number };
  "room:join": { roomCode: string; playerName: string };
  "room:leave": { roomId: string };
  "room:start": { sessionId: string };
  "room:next-round": { sessionId: string };
  "room:reset": { sessionId: string; newRounds?: number };
}

// Server -> Client
interface RoomResponses {
  "room:created": { room: Room; roomCode: string };
  "room:joined": { room: Room; players: Player[] };
  "room:player-joined": { player: Player };
  "room:player-left": { playerId: string };
  "room:session-started": { session: GameSession };
  "room:round-changed": { roundNumber: number };
  "room:session-reset": { session: GameSession };
}
```

## Implementation Notes

### Security

- Host validation for sensitive actions
- Room code expiration after inactivity
- Player authentication via tokens

### Performance

- Session data in memory during play
- Batch database writes at session end
- Optimized leaderboard queries

### UX Considerations

- Clear host indicators
- Visual round progression
- Smooth score animations
- Mobile-friendly room code input
