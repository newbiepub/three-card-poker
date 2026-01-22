# State Management with Zustand

## Overview
The Three Card Poker frontend uses **Zustand** for client-side state management. Zustand is a simple, fast, and scalable state management solution that requires minimal boilerplate.

## Why Zustand?
- **Simple API** - Less boilerplate than Redux
- **TypeScript First** - Excellent TypeScript support
- **Performance** - Selective subscriptions prevent unnecessary re-renders
- **Persistence** - Built-in persist middleware for localStorage
- **No Providers** - No need to wrap components in providers

## Store Structure

### Player Store (`playerStore.ts`)
Manages player authentication and profile data:
```typescript
interface PlayerState {
  player: Player | null;
  isAuthenticated: boolean;
  setPlayer: (player: Player) => void;
  logout: () => void;
}
```

Features:
- Automatic persistence to localStorage
- Authentication state tracking
- Simple login/logout actions

### Room Store (`roomStore.ts`)
Manages room and session state:
```typescript
interface RoomState {
  room: Room | null;
  session: Session | null;
  players: Player[];
  isHost: boolean;
  currentUserId: string | null;
  // Actions...
}
```

Features:
- Room management
- Player list management
- Host permissions tracking
- Session state updates

### Game Store (`gameStore.ts`)
Manages active game state:
```typescript
interface GameStore {
  currentGame: Game | null;
  playerCards: Card[];
  opponentCards: Card[];
  communityCards: Card[];
  pot: number;
  currentTurn: string | null;
  gamePhase: 'waiting' | 'dealing' | 'betting' | 'showdown' | 'finished';
  // Actions...
}
```

Features:
- Card management
- Game phase tracking
- Pot management
- Turn tracking

## Usage Examples

### Using the Player Store
```typescript
import { usePlayerStore } from '@/store';

function UserProfile() {
  const { player, isAuthenticated, logout } = usePlayerStore();
  
  if (!isAuthenticated) return <Login />;
  
  return (
    <div>
      <h1>Welcome, {player.name}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Using the Room Store
```typescript
import { useRoomStore } from '@/store';

function RoomHeader() {
  const { room, isHost, addPlayer } = useRoomStore();
  
  return (
    <div>
      <h2>{room?.name}</h2>
      {isHost && <HostControls />}
      <PlayerList />
    </div>
  );
}
```

### Selective Subscriptions
Zustand automatically optimizes re-renders:
```typescript
// Only re-renders when player name changes
const playerName = usePlayerStore(state => state.player?.name);

// Select multiple properties efficiently
const { player, isAuthenticated } = usePlayerStore(
  state => ({ player: state.player, isAuthenticated: state.isAuthenticated })
);
```

## Persistence

Zustand's persist middleware automatically saves state to localStorage:
```typescript
export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      // store implementation
    }),
    {
      name: 'three-card-poker-player',
    }
  )
);
```

## Best Practices

1. **Keep Stores Focused** - Each store should handle one domain
2. **Use Selectors** - Prevent unnecessary re-renders
3. **Avoid Actions in Renders** - Call actions in event handlers or effects
4. **Combine with TanStack Query** - Use Zustand for client state, TanStack Query for server state
5. **Type Everything** - Leverage TypeScript for better DX

## Integration with TanStack Query

Zustand handles client state while TanStack Query manages server state:
- **Zustand**: UI state, form data, temporary state
- **TanStack Query**: API data, caching, synchronization

Example:
```typescript
function GameComponent() {
  // Client state from Zustand
  const { playerCards, setPlayerCards } = useGameStore();
  
  // Server state from TanStack Query
  const { data: gameData, isLoading } = useGame(gameId);
  
  // Sync server state to client state
  useEffect(() => {
    if (gameData) {
      setPlayerCards(gameData.cards);
    }
  }, [gameData, setPlayerCards]);
}
```
