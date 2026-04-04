import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePublishScore } from "@/api/sessions";
import { usePlayerStore, useRoomStore, useGameStore } from "@/store";
import { createDeck, shuffle, calculateScore } from "@three-card-poker/shared";
import type { Card as CardType } from "@three-card-poker/shared";

export const GameBoard: React.FC = () => {
  const { player } = usePlayerStore();
  const { session } = useRoomStore();
  const { currentRound } = useGameStore();
  const [deck, setDeck] = useState<CardType[]>(() => shuffle(createDeck()));
  const [playerHand, setPlayerHand] = useState<Array<CardType | null>>([
    null,
    null,
    null,
  ]);
  const [score, setScore] = useState<number | null>(null);
  const [hasPublished, setHasPublished] = useState(false);
  const publishScoreMutation = usePublishScore();

  const handleDrawCard = (index: number) => {
    if (playerHand[index] || deck.length === 0) {
      return;
    }

    const [nextCard, ...remaining] = deck;
    if (!nextCard) return;

    const updatedHand = [...playerHand];
    updatedHand[index] = nextCard;

    setDeck(remaining);
    setPlayerHand(updatedHand);

    const allDrawn = updatedHand.every(Boolean);
    setScore(allDrawn ? calculateScore(updatedHand as CardType[]) : null);
    setHasPublished(false);
  };

  const resetGame = () => {
    setDeck(shuffle(createDeck()));
    setPlayerHand([null, null, null]);
    setScore(null);
    setHasPublished(false);
  };

  const publishScore = async () => {
    if (score === null) {
      return;
    }

    if (!player || !session) {
      alert("You must be in a session to publish a score.");
      return;
    }

    try {
      await publishScoreMutation.mutateAsync({
        sessionId: session.id,
        playerId: player.id,
        score,
        roundNumber: currentRound,
      });
      setHasPublished(true);
    } catch {
      alert("Failed to publish score. Please try again.");
    }
  };

  const getCardColor = (suit: string) => {
    return suit === "♥" || suit === "♦" ? "text-red-500" : "text-gray-900";
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Card className="w-full max-w-2xl p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8 font-heading neon-text">
          Three Card Poker
        </h1>

        <div className="space-y-6">
          <div className="flex justify-center gap-4">
            {playerHand.map((card, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleDrawCard(index)}
                disabled={!!card}
                className={`w-24 h-32 rounded-lg border-2 shadow-lg transition-all duration-200 flex flex-col items-center justify-center ${
                  card
                    ? "bg-white border-border"
                    : "bg-linear-to-br from-slate-900 to-slate-700 border-slate-600 hover:scale-105 hover:border-primary"
                }`}
                aria-label={
                  card
                    ? `Card ${card.rank}${card.suit}`
                    : `Draw card ${index + 1}`
                }
              >
                {card ? (
                  <>
                    <span
                      className={`text-4xl font-bold ${getCardColor(card.suit)}`}
                    >
                      {card.rank}
                    </span>
                    <span className={`text-3xl ${getCardColor(card.suit)}`}>
                      {card.suit}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-slate-200 font-body">
                    Draw
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="text-center text-muted-foreground font-body">
            {score === null
              ? "Click each card to draw your hand"
              : "Hand complete"}
          </p>

          {score !== null && (
            <div className="text-center space-y-3">
              <Badge
                variant="secondary"
                className="text-lg px-4 py-2 font-body"
              >
                Score: {score}
              </Badge>
              {hasPublished ? (
                <p className="text-sm text-green-600 font-body">
                  Score published!
                </p>
              ) : (
                <Button
                  onClick={publishScore}
                  className="font-body"
                  disabled={
                    !player || !session || publishScoreMutation.isPending
                  }
                >
                  Publish Score
                </Button>
              )}
            </div>
          )}

          <div className="text-center">
            <Button onClick={resetGame} variant="outline" className="font-body">
              New Game
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GameBoard;
