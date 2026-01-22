# Three Card Poker - Build Plan

## Project Overview
A real-time Three Card Poker (Bài Cào) game application supporting 2-6 players per room with WebSocket-based real-time gameplay.

## Tech Stack
- **Runtime**: Bun
- **Frontend**: 
  - **React 19** with TypeScript
  - **Vite** for build tooling
  - **Tailwind CSS v4** for styling with custom design system
  - **Shadcn/ui** component library
  - **Zustand** for client state management
  - **TanStack Query (React Query)** for server state management
  - **React Router** for navigation
  - **Lucide React** for icons
  - **Environment Variables** for API configuration
- **Backend**: Hono (with Bun runtime)
- **Database**: Bun SQLite + Drizzle ORM
- **Styling**: TailwindCSS v4
- **UI Components**: shadcn/ui
- **Real-time**: WebSocket (Hono WebSocket Helper)
- **Monorepo**: Bun Workspaces
- **Package Manager**: Bun

## Project Structure

```
three-card-poker/
├── package.json                 # Root package.json (workspace config)
├── bun.lockb                   # Bun lockfile
├── docs/                       # Documentation
├── apps/
│   ├── frontend/               # React Vite frontend
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── game/       # Game components
│   │   │   ├── room/       # Room management
│   │   │   ├── player/     # Player components
│   │   │   └── ui/         # shadcn/ui components
│   │   ├── pages/         # Game pages
│   │   │   ├── Home.tsx    # Name entry / menu
│   │   │   ├── CreateRoom.tsx
│   │   │   ├── JoinRoom.tsx
│   │   │   ├── Room.tsx    # Room lobby
│   │   │   └── Game.tsx    # Game board
│   │   ├── hooks/         # Custom hooks
│   │   │   ├── usePlayer.ts
│   │   │   ├── useRoom.ts
│   │   │   └── useSocket.ts
│   │   ├── stores/        # Game state management
│   │   │   ├── playerStore.ts
│   │   │   ├── roomStore.ts
│   │   │   └── gameStore.ts
│   │   ├── services/      # API services
│   │   │   ├── playerService.ts
│   │   │   ├── roomService.ts
│   │   │   └── storageService.ts
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utility functions
│   │   └── lib/           # API client
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── tailwind.config.js
│   └── backend/               # Hono backend
│       ├── src/
│       │   ├── routes/        # API routes
│       │   ├── websocket/     # WebSocket handlers
│       │   ├── services/      # Business logic
│       │   ├── models/        # Data models
│       │   ├── db/            # Database schema and migrations
│       │   ├── utils/         # Utility functions
│       │   ├── types/         # TypeScript types
│       │   └── index.ts       # App entry
│       ├── package.json
│       ├── tsconfig.json
│       └── drizzle.config.ts  # Database config
└── packages/
    ├── shared/                # Shared types and utilities
    │   ├── src/
    │   │   ├── types/         # Shared game types
    │   │   ├── constants/     # Game constants
    │   │   └── utils/         # Shared utilities
    │   └── package.json
    └── ui/                    # Shared UI components
        ├── src/
        │   └── components/    # Reusable components
        └── package.json
```

## Installation Steps

### 1. Initialize Bun Workspace
```bash
# Create root package.json
{
  "name": "three-card-poker",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "bun run --filter dev",
    "build": "bun run --filter build",
    "test": "bun run --filter test"
  }
}
```

### 2. Setup Backend (Hono)
```bash
cd apps/backend
bun init
bun add hono
bun add drizzle-orm better-sqlite3
bun add -D @types/node typescript bun-types @types/better-sqlite3 drizzle-kit

# Create basic Hono app with WebSocket support
```

### 2.1. Setup Database
```bash
# Initialize Drizzle
bunx drizzle-kit generate

# Run migrations
bunx drizzle-kit migrate

# Database schema location: src/db/schema.ts
```

### 3. Setup Frontend (React + Vite)
```bash
cd apps/frontend
bun create vite . --template react-ts
bun add tailwindcss @tailwindcss/vite
bun add -D @types/node

# Configure TailwindCSS v4
# Update vite.config.ts with path aliases
# Configure tsconfig.json
```

### 4. Setup shadcn/ui
```bash
cd apps/frontend
bun dlx shadcn@latest init

# Add required components
bun dlx shadcn@latest add button card input label badge avatar
```

### 5. Setup Shared Packages
```bash
# Create shared types package
cd packages/shared
bun init

# Create shared UI package
cd ../ui
bun init
```

## Code Conventions

### Frontend (React + TypeScript)

1. **File Naming**
   - Components: `PascalCase.tsx` (e.g., `PlayerCard.tsx`)
   - Hooks: `camelCase.ts` (e.g., `useGameState.ts`)
   - Utils: `camelCase.ts` (e.g., `cardUtils.ts`)
   - Types: `camelCase.types.ts` (e.g., `game.types.ts`)

2. **Component Structure**
   ```tsx
   import React from 'react'
   import { cn } from '@/lib/utils'
   
   interface ComponentProps {
     // Props interface
   }
   
   export const Component: React.FC<ComponentProps> = ({ ...props }) => {
     // Component logic
     
     return (
       <div className={cn('default-classes', props.className)}>
         {/* JSX */}
       </div>
     )
   }
   
   export default Component
   ```

3. **State Management**
   - Use React hooks for local state
   - Use Zustand for global game state
   - Keep game logic in services

4. **Styling**
   - Use TailwindCSS classes
   - Follow shadcn/ui patterns
   - Use CSS variables for theming

### Backend (Hono + TypeScript)

1. **File Naming**
   - Routes: `camelCase.ts` (e.g., `gameRoutes.ts`)
   - Services: `camelCase.service.ts` (e.g., `gameService.ts`)
   - Models: `PascalCase.ts` (e.g., `GameRoom.ts`)
   - Types: `camelCase.types.ts` (e.g., `websocket.types.ts`)

2. **Route Structure**
   ```typescript
   import { Hono } from 'hono'
   import type { Bindings } from '../types'
   
   const app = new Hono<{ Bindings: Bindings }>()
   
   app.get('/', async (c) => {
     // Route logic
     return c.json({ data: 'response' })
   })
   
   export default app
   ```

3. **WebSocket Handlers**
   ```typescript
   import { upgradeWebSocket } from 'hono/bun'
   import type { WebSocketData } from '../types'
   
   export const gameWebSocket = upgradeWebSocket((c) => {
     return {
       onOpen: () => {
         // Connection opened
       },
       onMessage: (event, ws) => {
         // Handle message
       },
       onClose: () => {
         // Connection closed
       }
     }
   })
   ```

### General Rules

1. **TypeScript**
   - Strict mode enabled
   - Use interfaces for object shapes
   - Use types for unions/primitives
   - No `any` types

2. **Imports**
   - Absolute imports with `@/` alias
   - Group imports: external > internal > relative
   - Use index files for clean imports

3. **Error Handling**
   - Use try-catch blocks
   - Implement proper error types
   - Log errors appropriately

4. **Code Style**
   - 2 space indentation
   - No semicolons (ESLint/Prettier)
   - Single quotes for strings
   - Arrow functions preferred

## Proposed Architecture

### Frontend Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Layer      │    │   State Layer   │    │   Service Layer │
│                 │    │                 │    │                 │
│ - Game Pages    │◄──►│ - Game Store    │◄──►│ - API Client    │
│ - Components    │    │ - Player Store  │    │ - WebSocket     │
│ - shadcn/ui     │    │ - Room Store    │    │ - Event Handlers│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Backend Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Route Layer   │    │  Service Layer  │    │   Data Layer    │
│                 │    │                 │    │                 │
│ - REST API      │◄──►│ - Game Service  │◄──►│ - SQLite DB     │
│ - WebSocket     │    │ - Player Service│    │ - Drizzle ORM   │
│ - Middleware    │    │ - Room Service  │    │ - In-Memory     │
│                 │    │ - Score Service │    │   Cache         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Game Flow

1. **Player Registration**
   - Player enters name on first visit
   - Name saved to localStorage
   - Player profile created/synced with database

2. **Room Creation**
   - Host creates room with 6-digit code
   - Host sets number of rounds for session
   - Room created in database

3. **Joining Room**
   - Players enter 6-digit room code
   - Player names displayed in room
   - Host controls when to start

4. **Session Gameplay**
   - Play sequential rounds (set by host)
   - Scores accumulate across rounds
   - Real-time leaderboard updates

5. **Session End**
   - Final scores calculated after last round
   - Winner announced
   - Host can reset with new round count

## Scoring System

### Point Rules
- **Base Points**: 5 points per player per game
- **Winner Calculation**: +5 × number of losers
- **Loser Penalty**: -5 points each
- **Tie Game**: No points exchanged

### Score Examples
| Players | Winner Gets | Each Loser Loses |
|---------|-------------|-----------------|
| 2       | +5          | -5              |
| 3       | +10         | -5              |
| 4       | +15         | -5              |
| 5       | +20         | -5              |
| 6       | +25         | -5              |

### Score Tracking
- Total score persisted in database
- Real-time score updates via WebSocket
- Score history with game details
- Leaderboard rankings
- Win/loss statistics
- Current win streak

### UI Components
- **Score Board**: Real-time player scores
- **Score Notifications**: Animated score changes
- **Game History**: Detailed score history
- **Leaderboard**: Top players ranking
- **Statistics**: Personal performance metrics

### API Integration

### Frontend Data Fetching
- **TanStack Query** for server state management
- Centralized API client with error handling
- Environment-based API URL configuration
- Automatic caching and background refetching
- Type-safe API responses

### Environment Variables
```bash
# Development
VITE_API_URL=http://localhost:3001/api

# Production
VITE_API_URL=https://your-domain.com/api
```

### Query Organization
- `api/client.ts` - Centralized API client
- `api/queryKeys.ts` - Query key structure
- `api/players.ts` - Player-related queries/mutations
- `api/rooms.ts` - Room-related queries/mutations
- `api/sessions.ts` - Session-related queries/mutations

## State Management

### Client State with Zustand
- **Player Store**: Authentication and profile data
- **Room Store**: Room, session, and player list management
- **Game Store**: Active game state, cards, and turn management
- Automatic persistence with localStorage
- TypeScript-first implementation

### Server State with TanStack Query
- **TanStack Query** for server state management
- Centralized API client with error handling
- Environment-based API URL configuration
- Automatic caching and background refetching
- Type-safe API responses

### Environment Variables
```bash
# Development
VITE_API_URL=http://localhost:3001/api

# Production
VITE_API_URL=https://your-domain.com/api
```

### Query Organization
- `api/client.ts` - Centralized API client
- `api/queryKeys.ts` - Query key structure
- `api/players.ts` - Player-related queries/mutations
- `api/rooms.ts` - Room-related queries/mutations
- `api/sessions.ts` - Session-related queries/mutations

## WebSocket Events

```typescript
// Client -> Server
interface ClientEvents {
  // Player Management
  player:register: { name: string }
  
  // Room Management
  room:create: { hostName: string; totalRounds: number }
  room:join: { roomCode: string; playerName: string }
  room:leave: { roomId: string }
  
  // Session Control (Host only)
  session:start: { sessionId: string }
  session:nextRound: { sessionId: string }
  session:reset: { sessionId: string; newRounds?: number }
  
  // Game Actions
  game:revealCards: { gameId: string }
}

// Server -> Client
interface ServerEvents {
  // Player Events
  player:registered: { player: Player; isNewPlayer: boolean }
  
  // Room Events
  room:created: { room: Room; roomCode: string }
  room:joined: { room: Room; players: Player[] }
  room:playerJoined: { player: Player }
  room:playerLeft: { playerId: string }
  
  // Session Events
  session:started: { session: GameSession }
  session:roundChanged: { roundNumber: number; totalRounds: number }
  session:ended: { finalScores: CumulativeScore[]; winner: Player }
  session:reset: { newSession: GameSession }
  
  // Game Events
  game:cardsDealt: { cards: Card[] }
  game:playerRevealed: { playerId: string; cards: Card[]; score: number }
  game:ended: { 
    winner: Player; 
    scores: Score[]; 
    scoreChanges: { playerId: string; change: number }[] 
  }
  score:updated: { playerId: string; newScore: number; change: number }
  leaderboard:updated: LeaderboardEntry[]
  
  error: { message: string }
}
```

## Development Workflow

### 1. Development Commands
```bash
# Install dependencies
bun install

# Start development (all packages)
bun dev

# Start specific app
bun run --filter frontend dev
bun run --filter backend dev

# Build all
bun build

# Run tests
bun test
```

### 2. Environment Setup
```bash
# .env files
apps/backend/.env
apps/frontend/.env

# Variables
PORT=3001
WS_PORT=3002
NODE_ENV=development
```

### 3. Git Workflow
- Main branch: `main`
- Feature branches: `feature/feature-name`
- PR reviews required
- Automated tests on PR

## Next Steps

1. Initialize monorepo structure ✅
2. Setup backend with Hono + WebSocket ✅
3. Setup frontend with React + Vite ✅
4. Setup database with SQLite + Drizzle ✅
5. Implement player registration with localStorage
6. Create room management with 6-digit codes
7. Add host controls and session management
8. Implement basic room system
9. Add card dealing logic
10. Implement game rules
11. Add scoring system with persistence
12. Create score UI components
13. Add real-time features
14. Style with shadcn/ui
15. Add animations and transitions
16. Deploy to production

## Additional Considerations

- **Security**: Room authentication, host validation, anti-cheat measures
- **Database**: SQLite for simplicity, backup strategies, migration handling
- **Performance**: Optimized re-renders, efficient WebSocket usage, database indexing
- **Scalability**: Room sharding, load balancing, database connection pooling
- **Testing**: Unit tests, integration tests, E2E tests, database tests
- **Monitoring**: Error tracking, performance metrics, database query monitoring
- **Scoring**: Fair scoring algorithms, score history retention, leaderboard refresh strategies
- **Room Management**: Room code expiration, host permissions, session persistence
- **Player Data**: GDPR compliance, data export, privacy controls
