# WebSocket Integration

## Overview

The Three Card Poker app uses WebSockets for real-time communication between players in a room. This enables instant updates when players join/leave, game state changes, and other multiplayer features.

## Backend Configuration

### Required WebSocket Setup

For WebSocket support in Bun, you must include the `websocket` object in your server configuration:

```typescript
// apps/backend/index.ts
export default {
  fetch: app.fetch,
  port: 3001,
  websocket: {
    message: (ws, message) => {
      // WebSocket messages will be handled by Hono
    },
    open: (ws) => {
      // WebSocket open event will be handled by Hono
    },
    close: (ws, code, message) => {
      // WebSocket close event will be handled by Hono
    },
    error: (ws, error) => {
      console.error("WebSocket error:", error);
    },
  },
};
```

**Important**: Without this websocket configuration, attempting to connect will result in:

```
TypeError: To enable websocket support, set the "websocket" object in Bun.serve({})
```

## Architecture

### Frontend WebSocket Store

```typescript
// store/websocketStore.ts
interface WebSocketState {
  ws: WebSocket | null;
  isConnected: boolean;
  error: string | null;
  connect: (roomCode: string, playerId: string) => void;
  disconnect: () => void;
  send: (data: any) => void;
}
```

### Backend WebSocket Handler

```typescript
// websocket/gameWebSocket.ts
- Handles room connections
- Broadcasts events to all players in a room
- Manages player join/leave events
- Tracks connection state
```

## WebSocket Events

### Client → Server

```typescript
// Join a room
{
  type: 'joinRoom',
  roomCode: string,
  playerId: string
}

// Leave a room
{
  type: 'leaveRoom',
  roomCode: string,
  playerId: string
}

// Start the game
{
  type: 'startGame',
  roomCode: string
}

// Reveal cards
{
  type: 'revealCards',
  roomCode: string,
  playerId: string,
  cards: Card[],
  score: number
}
```

### Server → Client

```typescript
// Room joined successfully
{
  type: 'roomJoined',
  room: Room,
  players: Player[],
  isHost: boolean
}

// Player joined the room
{
  type: 'playerJoined',
  player: Player,
  totalPlayers: number
}

// Player left the room
{
  type: 'playerLeft',
  playerId: string,
  playerName: string,
  totalPlayers: number
}

// Game started
{
  type: 'gameStarted',
  gameId: string
}

// Cards revealed
{
  type: 'cardsRevealed',
  playerId: string,
  cards: Card[],
  score: number
}

// Error occurred
{
  type: 'error',
  message: string
}
```

## Usage Example

### Connecting to a Room

```typescript
// In your Room component
import { useWebSocketStore } from '@/store';

function RoomPage() {
  const { connect, disconnect, isConnected } = useWebSocketStore();
  const { roomCode } = useParams();
  const { player } = usePlayerStore();

  useEffect(() => {
    // Connect when component mounts
    if (roomCode && player?.id) {
      connect(roomCode, player.id);
    }

    // Disconnect when component unmounts
    return () => {
      disconnect();
    };
  }, [roomCode, player?.id, connect, disconnect]);

  return (
    <div>
      {isConnected ? (
        <p>Connected to room!</p>
      ) : (
        <p>Connecting...</p>
      )}
    </div>
  );
}
```

### Handling WebSocket Events

```typescript
// The WebSocket store automatically updates Zustand stores
// based on received events:

// playerJoined → roomStore.addPlayer()
// playerLeft → roomStore.removePlayer()
// sessionUpdated → roomStore.updateSession()
// gameStarted → roomStore.updateSession({ status: 'playing' })
```

### Sending Messages

```typescript
import { useWebSocketStore } from '@/store';

function GameControls() {
  const { send } = useWebSocketStore();
  const roomCode = 'ABC123';

  const handleStartGame = () => {
    send({
      type: 'startGame',
      roomCode
    });
  };

  return (
    <button onClick={handleStartGame}>
      Start Game
    </button>
  );
}
```

## Connection Status

The app includes a `ConnectionStatus` component that shows:

- Green when connected
- Red when there's an error
- Gray when connecting/disconnected

```typescript
import { ConnectionStatus } from '@/components/ui/connection-status';

function App() {
  return (
    <div>
      <ConnectionStatus />
      {/* Rest of your app */}
    </div>
  );
}
```

## Best Practices

1. **Connect on Room Entry**: Always connect when entering a room
2. **Disconnect on Exit**: Always disconnect when leaving to prevent memory leaks
3. **Handle Reconnections**: The store automatically handles reconnection logic
4. **Error Handling**: Check the error state and display appropriate messages
5. **Use Zustand Integration**: Let the WebSocket store update other stores automatically

## Implementation Details

### Connection URL

```typescript
const wsUrl = `ws://localhost:3001/ws?roomCode=${roomCode}&playerId=${playerId}`;
```

### Room Management

- Backend tracks connections by room code
- Each room maintains its own connection list
- Broadcasts are sent to all connected players in a room

### Performance

- Connections are cleaned up when players leave
- Failed sends are caught and logged
- Room data is cached to reduce database queries

## Troubleshooting

### Common Issues

1. **Connection Fails**: Check if the backend is running on port 3001
2. **Events Not Received**: Verify the room code matches
3. **Player Count Wrong**: Ensure all players connect with unique IDs

### Debug Mode

Enable console logging to see WebSocket events:

```typescript
// In websocketStore.ts
console.log("WebSocket connected");
console.log("Received event:", data);
```
