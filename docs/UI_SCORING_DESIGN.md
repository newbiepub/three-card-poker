# UI Design - Scoring System

## Overview
The scoring system UI displays real-time player scores, game history, and statistics with visual feedback for wins/losses.

## Score Display Components

### 1. Player Score Board
```tsx
// Position: Right side of game board
- Shows all players in the room
- Real-time score updates
- Visual indicators for score changes
- Current game status
```

#### Features:
- **Score Animation**: Smooth transitions when score changes
- **Color Coding**:
  - Green: Score increase (+)
  - Red: Score decrease (-)
  - Gray: No change
- **Win Streak Indicator**: Fire icon for consecutive wins
- **Rank Badge**: Based on total score

### 2. Score Change Notifications
```tsx
// Position: Center screen, overlay
- Appears after each game ends
- Shows winner and score changes
- Auto-dismiss after 5 seconds
```

#### Animation:
- Slide up from bottom
- Scale effect for winner
- Particle effects for big wins

### 3. Game History Panel
```tsx
// Position: Bottom of screen (collapsible)
- Last 10 games summary
- Click to expand full history
- Filter by player/date
```

## Detailed UI Components

### PlayerScoreCard Component
```tsx
interface PlayerScoreCardProps {
  player: Player;
  scoreChange?: number;
  isCurrentPlayer?: boolean;
  isWinner?: boolean;
  showDetails?: boolean;
}

// Visual Layout:
┌─────────────────────────┐
│  👤 PlayerName          │
│  🔥 5 win streak        │  // If streak > 0
│  💰 Total: 250 points   │
│  📊 W: 50 L: 25         │
│  ▲ +15 (Last game)      │  // Animated, color-coded
└─────────────────────────┘
```

### ScoreHistoryTable Component
```tsx
// Columns:
| Game | Winner | Score Change | Time |
|------|--------|--------------|------|
| #12  | You    | +20          | 2m   |
| #11  | Alice  | -5           | 5m   |
| #10  | You    | +10          | 8m   |

// Features:
- Highlight current player's rows
- Sortable columns
- Pagination for long history
```

### LeaderBoard Component
```tsx
// Top 10 players by score
┌─── Leaderboard ───┐
│ 1. 🥇 Alice  500  │
│ 2. 🥈 You    450  │
│ 3. 🥉 Bob    380  │
│ 4.    Carol  320  │
│ ...               │
└───────────────────┘
```

## Score Calculations Display

### Game End Screen
```tsx
// Full screen overlay showing:
┌─────────────────────────────────┐
│        🏆 Game Over!           │
│                                 │
│  Winner: Alice                  │
│  Cards: A♠ K♥ 5♦ (6 points)    │
│  Score: +15                    │
│                                 │
│  Other Players:                 │
│  - You: 3 points (-5)          │
│  - Bob: 2 points (-5)          │
│                                 │
│  [Continue] [View History]      │
└─────────────────────────────────┘
```

### Real-time Score Updates
```tsx
// During gameplay, show:
┌─────────────────────┐
│  Your Cards:        │
│  [🂡] [🂮] [🃚]     │
│  Score: 4 points    │
│                     │
│  Waiting for others │
│  🔄 Alice thinking...│
└─────────────────────┘
```

## Responsive Design

### Desktop (>1024px)
- Score board on right side
- Full game history table
- Detailed statistics panel

### Tablet (768px-1024px)
- Collapsible score panel
- Simplified history view
- Compact player cards

### Mobile (<768px)
- Bottom sheet for scores
- Swipe to view history
- Minimal player info

## Animation Specifications

### Score Change Animation
```css
.score-change {
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.score-increase {
  color: #10b981;
  transform: scale(1.2);
}

.score-decrease {
  color: #ef4444;
  transform: scale(0.9);
}
```

### Win Animation
```css
@keyframes winner-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.winner-glow {
  animation: winner-pulse 1s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
}
```

## Data Visualization

### Score Chart
```tsx
// Line chart showing score over time
- X-axis: Game number
- Y-axis: Total score
- Highlight wins/losses
- Compare with other players
```

### Performance Stats
```tsx
// Grid of statistics:
┌─────────────────────┐
│ Win Rate: 65%       │
│ Avg Score: +8.5     │
│ Best Streak: 7      │
│ Total Games: 100    │
│ Biggest Win: +50    │
│ Biggest Loss: -25   │
└─────────────────────┘
```

## Implementation Notes

### State Management
```typescript
// Use Zustand for score state
interface ScoreStore {
  players: PlayerScore[];
  gameHistory: GameResult[];
  leaderboard: LeaderboardEntry[];
  updateScore: (playerId: string, change: number) => void;
  refreshHistory: () => void;
}
```

### API Integration
```typescript
// WebSocket events for real-time updates
interface ScoreEvents {
  'score:updated': { playerId: string; newScore: number; change: number };
  'game:ended': { winner: string; scoreChanges: ScoreChange[] };
  'leaderboard:updated': LeaderboardEntry[];
}
```

### Performance Considerations
- Virtualize long history lists
- Debounce score updates
- Cache leaderboard data
- Use Web Workers for calculations
