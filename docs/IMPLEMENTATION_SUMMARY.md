# Implementation Summary - Updated Requirements

## New Features Added

### 1. Player Registration System

- **Name Entry**: Players enter name on first visit
- **LocalStorage**: Name saved locally for convenience
- **Database Sync**: Player profiles created/synced with database
- **Persistent Identity**: Players maintain scores across sessions

### 2. Enhanced Room System

- **6-Digit Room Codes**: Simple numeric codes (e.g., "123456")
- **Host Controls**: Room creator has special permissions
- **Player List**: All players in room are visible
- **Join by Code**: Players enter code to join specific rooms

### 3. Session Management

- **Configurable Rounds**: Host sets number of rounds (1-20)
- **Sequential Gameplay**: Rounds played one after another
- **Accumulated Scoring**: Scores add up across rounds
- **Session Reset**: Host can restart with new round count

## Technical Implementation

### Frontend Components

```
src/
├── components/
│   ├── player/
│   │   ├── NameEntryModal.tsx
│   │   └── PlayerCard.tsx
│   ├── room/
│   │   ├── RoomCodeInput.tsx
│   │   ├── RoomLobby.tsx
│   │   ├── HostControls.tsx
│   │   └── PlayerList.tsx
│   └── game/
│       ├── SessionScoreboard.tsx
│       └── RoundProgress.tsx
├── pages/
│   ├── Home.tsx          # Name entry
│   ├── CreateRoom.tsx    # Host setup
│   ├── JoinRoom.tsx      # Code entry
│   ├── Room.tsx          # Lobby view
│   └── Game.tsx          # Game board
└── services/
    ├── storageService.ts # LocalStorage management
    └── sessionService.ts # Session state
```

### Backend Services

```typescript
// New services needed
- SessionService     # Manage game sessions
- HostService        # Host validation
- RoomCodeService    # Generate/validate codes
- StorageService     # Player data persistence
```

### Database Updates

```sql
-- New tables
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  host_id TEXT NOT NULL,
  total_rounds INTEGER NOT NULL,
  current_round INTEGER DEFAULT 1,
  status TEXT CHECK(status IN ('waiting', 'playing', 'finished')),
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL
);

CREATE TABLE session_scores (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  game_score INTEGER NOT NULL,
  points_change INTEGER NOT NULL,
  cumulative_score INTEGER NOT NULL
);

-- Updated rooms table
ALTER TABLE rooms ADD COLUMN room_code TEXT UNIQUE NOT NULL;
ALTER TABLE rooms ADD COLUMN host_id TEXT NOT NULL;
ALTER TABLE rooms ADD COLUMN current_session_id TEXT NULL;
```

## User Flow

### New Player Experience

1. Open app → Enter name → Saved to localStorage
2. Choose: Create Room or Join Room
3. If creating: Set round count → Get 6-digit code
4. If joining: Enter 6-digit code → See room lobby
5. Wait for host to start → Play rounds → See final scores

### Host Experience

1. Create room → Set number of rounds
2. Share 6-digit code with friends
3. See players join in real-time
4. Start session when ready
5. Control game flow (next round, reset)
6. View final leaderboard
7. Option to reset with new settings

## Implementation Priority

### Phase 1: Core Features

1. Player registration with localStorage
2. Room creation with 6-digit codes
3. Basic room lobby with player list
4. Host controls for starting games

### Phase 2: Session Management

1. Round counter and progression
2. Score accumulation across rounds
3. Session reset functionality
4. Enhanced leaderboard

### Phase 3: Polish

1. Animations and transitions
2. Mobile optimization
3. Room history/recent rooms
4. Player statistics dashboard

## Key Technical Decisions

1. **LocalStorage Strategy**:
   - Store player name and ID locally
   - Sync with database on load
   - Allow guest mode (no persistence)

2. **Room Code Generation**:
   - 6-digit numeric for simplicity
   - Check duplicates before assigning
   - Expire after 24 hours of inactivity

3. **Session Management**:
   - In-memory during play
   - Batch write to database on completion
   - Host can reset anytime

4. **Real-time Updates**:
   - WebSocket for all room events
   - Player join/leave notifications
   - Score updates after each round

## Next Implementation Steps

1. Update database schema with new tables
2. Create player registration service
3. Implement room code generation
4. Build room management UI
5. Add host control panel
6. Implement session scoring logic
7. Update WebSocket events
8. Test full user flow
