import type { Card } from "@three-card-poker/shared";

export type AutoPlayCallback = (
  sessionId: string,
  roundNumber: number,
  playerId: string,
  cards: Card[],
  score: number,
) => void;
