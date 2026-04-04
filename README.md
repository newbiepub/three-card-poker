# Three Card Poker (Bài Cào)

A real-time Three Card Poker game built with Bun, React, Vite, Hono, and WebSocket.

## Tech Stack

- **Runtime**: Bun
- **Frontend**: React + Vite + TypeScript
- **Backend**: Hono (with Bun runtime)
- **Styling**: TailwindCSS v4 + shadcn/ui
- **Real-time**: WebSocket (Hono WebSocket Helper)
- **Monorepo**: Bun Workspaces

## Project Structure

```
three-card-poker/
├── apps/
│   ├── frontend/       # React Vite frontend
│   └── backend/        # Hono backend
├── packages/
│   ├── shared/         # Shared types and utilities
│   └── ui/             # Shared UI components
└── docs/               # Documentation
```

## Getting Started

### Prerequisites

- Install [Bun](https://bun.sh/docs/installation)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```

### Development

1. Start the backend server:

   ```bash
   bun run --filter backend dev
   ```

2. Start the frontend server (in another terminal):

   ```bash
   bun run --filter frontend dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

### Environment Variables

Copy `.env.example` to `.env` in the respective app directories:

- `apps/backend/.env` - Backend configuration
- `apps/frontend/.env` - Frontend configuration

## Available Scripts

- `bun dev` - Start all development servers
- `bun build` - Build all packages
- `bun test` - Run all tests
- `bun clean` - Clean all build artifacts
- `bun lint` - Lint all packages
- `bun type-check` - Type check all packages

## Game Rules

Three Card Poker (Bài Cào) is played with 2-6 players:

1. Each player receives 3 cards
2. Card values: A=1, 2-9=face value, 10/J/Q/K=0
3. Score is the sum of card values mod 10
4. Highest score wins (9 is best, 0 is worst)

## Card Draw Flow (Backend)

- The backend maintains a **persisted 52-card deck per session and round**.
- Players draw cards via:
  - `POST /sessions/:sessionId/draw-card` with `{ playerId }`
  - Response includes `{ card, hand, score, remaining }`
- Draws are **serialized with a mutex lock** per session to prevent duplicates.
- The deck is reset automatically when moving to a new round.

## Features (v2 Update)

The v2 version introduces a complete overhaul of the UI alongside advanced gameplay mechanics:

- **Retro-Futuristic UI**: A fully redesigned synthwave/cyberpunk aesthetic featuring glassmorphism, neon glows, and glitch effects.
- **Swipe-to-Reveal Interactions**: Tinder-style swipe mechanics requiring authentic gestures to flip the final facedown cards.
- **Robust Real-Time Multiplayer**: Up to 17 players simultaneously synced over lightweight WebSocket events, keeping full presence tracking.
- **Auto-Pilot & Offline Ghost Mode**: Players who drop connection won't break the lobby. They enter an offline "Ghost Mode" while a backend Auto-Pilot automatically plays for them until they refresh/reconnect (using a 15s claim timeout + 3s poll logic).
- **Tie-breaker Rules & Leaderboards**: Complete implementation of hand logic (Sáp, Ba Tiên, Normal/Pair) checking, automatic points calculation (winner-take-all vs losers), tie detection, and scrollable scoreboards.
- **Interactive Gameplay**: In-game animated sticker overlays across player avatars.

## Core Implementation Features

- [x] Room creation and joining via code sharing
- [x] Real-time multiplayer synchronization
- [x] Advanced card dealing, dealing rules, and automated scoring
- [x] High-end Card animations & UI layout
- [x] Responsive design for all standard devices
- [ ] Sound effects

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT
