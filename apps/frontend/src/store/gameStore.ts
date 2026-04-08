import { create } from "zustand";
import type { Player, Card, Pile } from "@three-card-poker/shared";

export interface GamePlayer extends Player {
  hand: Card[];
  score: number | null;
  hasPublishedScore: boolean;
  roundScore: number;
  totalScore: number;
  cumulatedScore: number;
}

interface GameState {
  currentRound: number;
  totalRounds: number;
  gameStatus: "waiting" | "playing" | "round-end" | "game-end";
  players: GamePlayer[];
  roundWinner: GamePlayer | null;
  gameWinner: GamePlayer | null;
  showRoundResult: boolean;
  showFinalResult: boolean;
  piles: Pile[];
  stickers: { id: string; playerId: string; sticker: string; timestamp: number }[];

  setGameState: (status: GameState["gameStatus"]) => void;
  setCurrentRound: (round: number) => void;
  setTotalRounds: (rounds: number) => void;
  setPlayers: (players: Player[]) => void;
  updatePlayerHand: (playerId: string, hand: Card[]) => void;
  publishPlayerScore: (
    playerId: string,
    score: number,
    pointsChange?: number,
    cumulativeScore?: number,
    hand?: Card[],
  ) => void;
  syncPlayerScores: (
    scores: Array<{
      playerId: string;
      gameScore: number;
      pointsChange?: number;
      cumulativeScore?: number;
      cards?: Card[];
    }>,
  ) => void;
  syncPlayerCumulativeScores: (
    scores: Array<{ playerId: string; cumulatedScore: number }>,
  ) => void;
  setRoundWinner: (player: GamePlayer | null) => void;
  setGameWinner: (player: GamePlayer | null) => void;
  nextRound: (roundNumber?: number) => void;
  resetGame: () => void;
  setShowRoundResult: (show: boolean) => void;
  setShowFinalResult: (show: boolean) => void;
  setPiles: (piles: Pile[]) => void;
  claimPile: (pileId: string, playerId: string, cards?: Card[]) => void;
  addSticker: (playerId: string, sticker: string) => void;
  removeSticker: (id: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentRound: 1,
  totalRounds: 10,
  gameStatus: "waiting",
  players: [],
  roundWinner: null,
  gameWinner: null,
  showRoundResult: false,
  showFinalResult: false,
  piles: [],
  stickers: [],

  setGameState: (status) => set({ gameStatus: status }),

  setCurrentRound: (round) => set({ currentRound: round }),

  setTotalRounds: (rounds) => set({ totalRounds: rounds }),

  setPlayers: (players) =>
    set((state) => {
      // Freeze players list if game is over to keep the scoreboard intact
      if (state.showFinalResult) return state;

      const existingPlayersMap = new Map(state.players.map((p) => [p.id, p]));

      const updatedPlayers = players.map((p) => {
        const existing = existingPlayersMap.get(p.id);
        if (existing) {
          return {
            ...existing,
            name: p.name,
            id: p.id,
          };
        } else {
          return {
            ...p,
            hand: [],
            score: null,
            hasPublishedScore: false,
            roundScore: 0,
            totalScore: 0,
            cumulatedScore: 0,
          } as GamePlayer;
        }
      });

      return { players: updatedPlayers };
    }),

  updatePlayerHand: (playerId, hand) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, hand } : p,
      ),
    })),

  publishPlayerScore: (playerId, score, pointsChange, cumulativeScore, hand) =>
    set((state) => {
      const updatedPlayers = state.players.map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            score,
            hand: hand ?? p.hand,
            hasPublishedScore: true,
            roundScore: pointsChange ?? p.roundScore,
            totalScore: cumulativeScore ?? p.totalScore,
            cumulatedScore: cumulativeScore ?? p.cumulatedScore,
          };
        }
        return p;
      });

      const allPublished = updatedPlayers.every((p) => p.hasPublishedScore);

      return {
        players: updatedPlayers,
        gameStatus: allPublished ? "round-end" : "playing",
      };
    }),

  syncPlayerScores: (scores) =>
    set((state) => {
      const scoreMap = new Map(scores.map((score) => [score.playerId, score]));

      return {
        players: state.players.map((player) => {
          const score = scoreMap.get(player.id);
          if (!score) {
            // Preserve existing player state if no update from server
            // Only nextRound should clear these
            return player;
          }

          return {
            ...player,
            score: score.gameScore,
            hand:
              score.cards && score.cards.length > 0 ? score.cards : player.hand,
            roundScore: score.pointsChange ?? 0,
            totalScore: score.cumulativeScore ?? player.totalScore,
            cumulatedScore: score.cumulativeScore ?? player.cumulatedScore,
            hasPublishedScore: true,
          };
        }),
      };
    }),

  syncPlayerCumulativeScores: (scores) =>
    set((state) => {
      const scoreMap = new Map(
        scores.map((score) => [score.playerId, score.cumulatedScore]),
      );

      return {
        players: state.players.map((player) => {
          const cumulatedScore = scoreMap.get(player.id);
          if (cumulatedScore === undefined) {
            return player;
          }

          return {
            ...player,
            cumulatedScore,
            totalScore: cumulatedScore,
          };
        }),
      };
    }),

  setRoundWinner: (player) =>
    set({ roundWinner: player, showRoundResult: true }),

  setGameWinner: (player) => set({ gameWinner: player }),

  nextRound: (roundNumber) =>
    set((state) => {
      const nextRoundNum = roundNumber ?? state.currentRound + 1;
      const isGameEnd = nextRoundNum > state.totalRounds;

      // Determine winner only if there's a clear winner (no tie)
      let winner: GamePlayer | null = null;
      if (isGameEnd && state.players.length > 0) {
        const sortedPlayers = [...state.players].sort(
          (a, b) => b.cumulatedScore - a.cumulatedScore,
        );

        // Check for tie — if top players share the same score, no winner
        const topScore = sortedPlayers[0].cumulatedScore;
        const tiedPlayers = sortedPlayers.filter(
          (p) => p.cumulatedScore === topScore,
        );

        if (tiedPlayers.length === 1) {
          winner = sortedPlayers[0];
        }
        // If tiedPlayers.length > 1, winner stays null (no winner display)
      }

      return {
        currentRound: nextRoundNum,
        gameStatus: isGameEnd ? "game-end" : "playing",
        players: state.players.map((p) => ({
          ...p,
          hand: [],
          score: null,
          hasPublishedScore: false,
          roundScore: 0,
          cumulatedScore: p.cumulatedScore,
        })),
        roundWinner: null,
        showRoundResult: false,
        showFinalResult: isGameEnd,
        gameWinner: winner,
        piles: [],
        stickers: [],
      };
    }),

  resetGame: () => {
    return set({
      currentRound: 1,
      gameStatus: "waiting",
      players: [],
      roundWinner: null,
      gameWinner: null,
      showRoundResult: false,
      showFinalResult: false,
      piles: [],
      stickers: [],
    });
  },

  setShowRoundResult: (show) => set({ showRoundResult: show }),

  setShowFinalResult: (show) => set({ showFinalResult: show }),

  setPiles: (piles) => set({ piles }),

  claimPile: (pileId, playerId, cards) =>
    set((state) => {
      const updatedPiles = state.piles.map((p) =>
        p.id === pileId
          ? {
              ...p,
              claimedBy: playerId,
              claimedAt: Date.now(),
              cards: cards || p.cards,
            }
          : p,
      );

      // If cards are provided (meaning they just claimed it), update player hand
      let updatedPlayers = state.players;
      if (cards) {
        updatedPlayers = state.players.map((p) =>
          p.id === playerId ? { ...p, hand: cards } : p,
        );
      }

      return { piles: updatedPiles, players: updatedPlayers };
    }),

  addSticker: (playerId, sticker) =>
    set((state) => {
      const newSticker = {
        id: Math.random().toString(36).substring(2, 9),
        playerId,
        sticker,
        timestamp: Date.now(),
      };

      return { stickers: [...state.stickers, newSticker] };
    }),

  removeSticker: (id) =>
    set((state) => ({
      stickers: state.stickers.filter((s) => s.id !== id),
    })),
}));
