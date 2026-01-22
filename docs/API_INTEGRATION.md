# API Integration Documentation

## Overview
The Three Card Poker frontend uses **TanStack Query (React Query)** for efficient data fetching, caching, and state management. This provides a better developer experience and improved performance compared to direct fetch calls.

## Technology Stack
- **TanStack Query v5** - For server state management
- **Environment Variables** - For API URL configuration
- **TypeScript** - For type safety

## API Client Setup

### Environment Configuration
```bash
# Development (.env.local)
VITE_API_URL=http://localhost:3001/api

# Production (.env.production)
VITE_API_URL=https://your-domain.com/api
```

### API Client Features
- Centralized error handling with custom `ApiError` class
- Automatic JSON parsing
- Consistent headers
- Type-safe responses

## Query Hooks

### Player API
```typescript
// Register a new player
const { mutate: registerPlayer, isLoading } = useRegisterPlayer();

// Get player info
const { data: player, isLoading } = usePlayer(name);

// Get player history
const { data: history } = usePlayerHistory(playerId, limit);
```

### Room API
```typescript
// Create a room
const { mutate: createRoom } = useCreateRoom();

// Join a room
const { mutate: joinRoom } = useJoinRoom();

// Get room details
const { data: room } = useRoom(roomCode);
```

### Session API
```typescript
// Start a session
const { mutate: startSession } = useStartSession();

// Move to next round
const { mutate: nextRound } = useNextRound();

// Reset session
const { mutate: resetSession } = useResetSession();

// Get session leaderboard
const { data: leaderboard } = useSessionLeaderboard(sessionId);
```

## Query Keys Structure
Query keys are organized hierarchically for efficient cache management:
```typescript
queryKeys.players.byName(name)
queryKeys.rooms.byCode(code)
queryKeys.sessions.leaderboard(sessionId)
```

## Error Handling
All API errors are caught and can be handled in the `onError` callback of mutations or through the `error` property of queries.

## Caching Strategy
- **Queries**: Cached for 1-5 minutes depending on data volatility
- **Mutations**: Trigger automatic cache invalidation
- **Stale Time**: Configured per query type
- **Retry**: Failed requests retry once by default

## Migration from Fetch
The migration from direct `fetch` calls to TanStack Query provides:
1. Automatic caching and background refetching
2. Loading and error states built-in
3. Optimistic updates support
4. Pagination and infinite query capabilities
5. Devtools integration for debugging

## Best Practices
1. Use `useQuery` for GET requests
2. Use `useMutation` for POST/PUT/DELETE
3. Leverage `select` option for data transformation
4. Use `enabled` option for conditional queries
5. Implement proper error boundaries
6. Use the devtools for debugging

## Example Usage
```typescript
function PlayerProfile({ playerName }: { playerName: string }) {
  const { data, isLoading, error } = usePlayer(playerName);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{data.player.name}</div>;
}
```
