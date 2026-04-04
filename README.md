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

## Features

- [x] Basic card dealing and scoring
- [ ] Room creation and joining
- [ ] Multiplayer support
- [ ] Real-time gameplay
- [ ] Card animations
- [ ] Sound effects
- [ ] Responsive design

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT
