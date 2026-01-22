# Zustand Usage Examples

## Basic Store Usage

### 1. Player Store Example
```typescript
// store/playerStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlayerState {
  player: Player | null;
  isAuthenticated: boolean;
  setPlayer: (player: Player) => void;
  logout: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      player: null,
      isAuthenticated: false,
      setPlayer: (player) => set({ player, isAuthenticated: true }),
      logout: () => set({ player: null, isAuthenticated: false }),
    }),
    { name: 'three-card-poker-player' }
  )
);
```

### 2. Using in Components
```typescript
// components/PlayerProfile.tsx
import { usePlayerStore } from '@/store';

export function PlayerProfile() {
  // Get all state - re-renders on any change
  const { player, isAuthenticated, logout } = usePlayerStore();
  
  // Selective subscription - only re-renders when player changes
  const player = usePlayerStore(state => state.player);
  
  // Multiple properties with selector
  const { player, isAuthenticated } = usePlayerStore(state => ({
    player: state.player,
    isAuthenticated: state.isAuthenticated
  }));
  
  if (!isAuthenticated) {
    return <PleaseLogin />;
  }
  
  return (
    <div>
      <h1>Welcome, {player.name}!</h1>
      <p>Score: {player.totalScore}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 3. Room Store with Actions
```typescript
// store/roomStore.ts
import { create } from 'zustand';
import type { Room, Player } from '@/types';

interface RoomState {
  room: Room | null;
  players: Player[];
  isHost: boolean;
  setRoom: (room: Room, isHost: boolean) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  players: [],
  isHost: false,
  
  setRoom: (room, isHost) => set({ room, isHost }),
  
  addPlayer: (player) => 
    set((state) => ({
      players: state.players.some(p => p.id === player.id) 
        ? state.players 
        : [...state.players, player]
    })),
  
  removePlayer: (playerId) => 
    set((state) => ({
      players: state.players.filter(p => p.id !== playerId)
    })),
    
  clearRoom: () => set({ room: null, players: [], isHost: false }),
}));
```

### 4. Complex Component with Multiple Stores
```typescript
// pages/Game.tsx
import { usePlayerStore } from '@/store/playerStore';
import { useRoomStore } from '@/store/roomStore';
import { useGameStore } from '@/store/gameStore';

export function GamePage() {
  // Player data
  const { player } = usePlayerStore();
  
  // Room data
  const { room, players, isHost } = useRoomStore();
  
  // Game data
  const { 
    playerCards, 
    gamePhase, 
    setPlayerCards,
    setGamePhase 
  } = useGameStore();
  
  const handleStartGame = () => {
    if (isHost && gamePhase === 'waiting') {
      setGamePhase('dealing');
      // Deal cards logic here
    }
  };
  
  return (
    <div>
      <h1>{room?.name}</h1>
      <p>Players: {players.length}</p>
      
      {isHost && (
        <button onClick={handleStartGame}>
          Start Game
        </button>
      )}
      
      {playerCards.length > 0 && (
        <Hand cards={playerCards} />
      )}
    </div>
  );
}
```

### 5. Combining with TanStack Query
```typescript
// hooks/useGame.ts
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/store/gameStore';
import { apiClient } from '@/api/client';

export function useGame(gameId: string) {
  const { setGame, setPlayerCards } = useGameStore();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => apiClient.get(`/games/${gameId}`),
    enabled: !!gameId,
    onSuccess: (data) => {
      // Sync server state to Zustand store
      setGame(data.game);
      setPlayerCards(data.playerCards);
    },
  });
  
  return { data, isLoading, error };
}
```

### 6. TypeScript Best Practices
```typescript
// store/types.ts
export interface StoreState {
  // Always type your state
  player: Player | null;
  room: Room | null;
}

export interface StoreActions {
  // Always type your actions
  setPlayer: (player: Player) => void;
  clearRoom: () => void;
}

// store/exampleStore.ts
import { create } from 'zustand';
import type { StoreState, StoreActions } from './types';

type ExampleStore = StoreState & StoreActions;

export const useExampleStore = create<ExampleStore>((set) => ({
  // state
  player: null,
  room: null,
  
  // actions
  setPlayer: (player) => set({ player }),
  clearRoom: () => set({ room: null }),
}));
```

## Best Practices

1. **One Store Per Domain**
   - Player store for authentication
   - Room store for room state
   - Game store for game logic

2. **Use Selectors for Performance**
   ```typescript
   // Bad - re-renders on any change
   const { player, room, game } = useStore();
   
   // Good - only re-renders when player changes
   const player = useStore(state => state.player);
   ```

3. **Persist Only What's Needed**
   ```typescript
   persist(
     (set) => ({
       // Only persist essential data
       player: null,
       settings: {},
       // Don't persist temporary state
       tempData: [],
     }),
     { name: 'app-store' }
   )
   ```

4. **Combine with Other State Management**
   - Zustand for client state
   - TanStack Query for server state
   - React state for local component state

5. **Action Naming Convention**
   ```typescript
   // Use clear, descriptive action names
   setPlayer: (player) => set({ player })
   updatePlayerScore: (score) => set(state => ({
     player: state.player ? { ...state.player, score } : null
   }))
   resetGame: () => set(initialState)
   ```
