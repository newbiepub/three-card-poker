# UI Design - Scoring System

## Overview

The scoring system UI displays real-time player scores, game history, and statistics with visual feedback for wins/losses. The design follows a modern "gaming" aesthetic with glassmorphism effects, neon borders, and smooth animations.

## Design System

### 1. Typography

- **Heading Font**: `Russo One` (Sans-serif) - Used for titles, badges, and primary UI elements.
- **Body Font**: `Chakra Petch` (Sans-serif) - Used for stats, descriptions, and interactive elements.

### 2. Color Palette (Vite + Tailwind v4)

| Token       | Light Theme | Dark Theme |
| ----------- | ----------- | ---------- |
| Primary     | `#2563eb`   | `#3b82f6`  |
| Secondary   | `#3b82f6`   | `#2563eb`  |
| Accent      | `#f97316`   | `#f97316`  |
| Background  | `#f8fafc`   | `#0f172a`  |
| Foreground  | `#1e293b`   | `#f8fafc`  |
| Border      | `#e2e8f0`   | `#334155`  |
| Destructive | `#dc2626`   | `#ef4444`  |

### 3. Premium UI Utilities

- **.gaming-button**: High-contrast gradient button (`Accent` to orange) with hover lift and drop shadow.
- **.glass-card**: Translucent white/slate background with 12px backdrop blur and subtle shadow.
- **.neon-border**: Primary color border with soft outer glow effect.
- **.crt-scanlines**: Decorative overlay providing a retro-tech scanline texture.

## Score Display Components

### 1. Multiplayer Score Board

`MultiplayerGameBoard.tsx`

- **Location**: Primary game view.
- **Features**:
  - Dynamically sorted list (highest score first).
  - "You" indicator for the local player.
  - Real-time score publication status via `Eye`/`EyeOff` icons.
  - Interactive card drawing state (Animated card backs).
  - Reveal animation for published cards.

### 2. Round Result Modal

`RoundResultModal.tsx`

- **Trigger**: Displayed when all players have published their scores.
- **Visuals**:
  - **Trophy Icon**: Animated entry for the round winner.
  - **Confetti/Sparkles**: Celebration effect using Framer Motion.
  - **Rankings List**: Categorized view with special badges for hand types:
    - **Sáp (Triple)**: 3 cards of same rank.
    - **Ba Tây (Ba Tiên)**: 3 face cards.
    - **Đôi (Pair)**: 2 cards of same rank.
    - **Points (Điểm)**: Standard sum calculation.

### 3. Final Result View

- **Summary**: Full-screen overlay showing final cumulative scores.
- **Ranking**: Sorted list with Trophy icon for the overall winner.
- **Persistence**: Scores are synced from `sessionState.allScores` from the backend.

## Animation Specifications

The UI utilizes `framer-motion` for all transitions to ensure a "premium" feel.

- **Layout Transitions**: Cards and list items use `layout` prop for automatic smooth movement during sorting.
- **Card Flip**: 3D rotation effect during `handleDrawCard`.
- **Entrance Effects**:
  - Modals: `scale: 0.9, opacity: 0` to `scale: 1, opacity: 1`.
  - List Items: Staggered `x: -20, opacity: 0` entrance.
- **Interactive Feedback**:
  - `whileHover`: Scale 1.05.
  - `whileTap`: Scale 0.95.

## State Management & Synchronization

- **Store**: `Zustand` (`useGameStore`) for local game state.
- **Backend Sync**: `React Query` (`useSessionState`) polling for official point changes.
- **Real-time**: WebSockets for immediate peer updates (score publication, next round signals).

## Performance

- **React 19 Transitions**: Utilizes concurrent rendering features where applicable.
- **Tailwind v4 Engine**: High-performance JIT styling.
- **Image-free Icons**: `lucide-react` vectors for crisp display on all screens.
