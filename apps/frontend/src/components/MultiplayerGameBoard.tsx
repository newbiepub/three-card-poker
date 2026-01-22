import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Eye, EyeOff, Users } from "lucide-react";
import type { Card as CardType } from "@three-card-poker/shared";
import {
  useGameStore,
  usePlayerStore,
  useWebSocketStore,
  useRoomStore,
} from "@/store";
import {
  useDrawCard,
  usePublishScore,
  useUpdateSessionRound,
  useSessionState,
} from "@/api/sessions";
import { RoundResultModal } from "@/components/RoundResultModal";

export const MultiplayerGameBoard: React.FC = () => {
  const { player } = usePlayerStore();
  const { session } = useRoomStore();
  const { send } = useWebSocketStore();
  const {
    currentRound,
    totalRounds,
    gameStatus,
    players,
    roundWinner,
    gameWinner,
    showRoundResult,
    showFinalResult,
    updatePlayerHand,
    publishPlayerScore,
    syncPlayerScores,
    syncPlayerCumulativeScores,
    setGameState,
    setRoundWinner,
    setCurrentRound,
    setShowRoundResult,
  } = useGameStore();

  const [playerHand, setPlayerHand] = useState<Array<CardType | null>>([
    null,
    null,
    null,
  ]);
  const [playerScore, setPlayerScore] = useState<number | null>(null);
  const [hasDealt, setHasDealt] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [isUpdatingRound, setIsUpdatingRound] = useState(false);
  const hasRestoredScores = useRef(false);
  const previousRoundRef = useRef<number | null>(null);
  const previousGameStatusRef = useRef(gameStatus);
  const syncPlayerScoresRef = useRef(syncPlayerScores);
  const playersRef = useRef(players);
  syncPlayerScoresRef.current = syncPlayerScores;
  playersRef.current = players;
  previousGameStatusRef.current = gameStatus;

  const drawCardMutation = useDrawCard();
  const publishScoreMutation = usePublishScore();
  const updateRoundMutation = useUpdateSessionRound();

  const { data: sessionState, refetch: refetchSessionState } = useSessionState(
    session?.id,
    !!session?.id,
  );

  const allPlayersPublished = useMemo(() => {
    if (players.length === 0) {
      return false;
    }

    const localAllPublished = players.every((playerItem) =>
      Boolean(playerItem.hasPublishedScore),
    );

    if (localAllPublished) {
      return true;
    }

    if (!sessionState) {
      return false;
    }

    const publishedPlayerIds = new Set(
      sessionState.scores.map((score) => score.playerId),
    );

    return (
      publishedPlayerIds.size > 0 &&
      players.every((playerItem) => publishedPlayerIds.has(playerItem.id))
    );
  }, [sessionState, players]);

  useEffect(() => {
    if (sessionState && player && !hasRestoredScores.current) {
      // Sync round number from session state
      if (
        sessionState.currentRound &&
        sessionState.currentRound > currentRound
      ) {
        setCurrentRound(sessionState.currentRound);
      }

      const playerScore = sessionState.scores.find(
        (s) => s.playerId === player.id,
      );
      if (playerScore && playerScore.cards) {
        setPlayerHand(playerScore.cards as CardType[]);
        setPlayerScore(playerScore.gameScore);
        setHasDealt(true);
        setShowScore(false); // Don't show score yet, allow player to publish again
        updatePlayerHand(player.id, playerScore.cards);
        // Don't call publishPlayerScore here - it would duplicate the score in totalScore
        // The score is already saved in the database, just restore the UI state
      }
      hasRestoredScores.current = true;
    }
  }, [sessionState, player, updatePlayerHand, currentRound, setCurrentRound]);

  useEffect(() => {
    if (sessionState && playersRef.current.length > 0) {
      const cumulatedScore = sessionState.allScores.reduce(
        (acc, score) => {
          acc[score.playerId] = (acc[score.playerId] || 0) + score.pointsChange;
          return acc;
        },
        {} as Record<string, number>,
      );

      syncPlayerScoresRef.current(
        sessionState.scores.map((score) => ({
          playerId: score.playerId,
          gameScore: score.gameScore,
          pointsChange: score.pointsChange,
          cards:
            score.cards && score.cards.length > 0 ? score.cards : undefined,
        })),
      );

      syncPlayerCumulativeScores(
        Object.entries(cumulatedScore).map(([playerId, score]) => ({
          playerId,
          cumulatedScore: score,
        })),
      );
    }
  }, [sessionState, players.length, syncPlayerCumulativeScores]);

  useEffect(() => {
    if (allPlayersPublished && gameStatus === "playing") {
      setGameState("round-end");
    }
  }, [allPlayersPublished, gameStatus, setGameState]);

  useEffect(() => {
    if (
      allPlayersPublished &&
      gameStatus === "round-end" &&
      !showRoundResult &&
      players.length > 0
    ) {
      const winner = players.reduce((prev, current) =>
        (current.score || 0) > (prev.score || 0) ? current : prev,
      );
      setRoundWinner(winner);
    }
  }, [
    allPlayersPublished,
    gameStatus,
    showRoundResult,
    players,
    setRoundWinner,
    setShowRoundResult,
  ]);

  useEffect(() => {
    const previousStatus = previousGameStatusRef.current;
    if (previousStatus === "round-end" && gameStatus === "playing") {
      setShowRoundResult(false);
      setHasDealt(false);
      setPlayerHand([null, null, null]);
      setPlayerScore(null);
      setShowScore(false);
    }
    previousGameStatusRef.current = gameStatus;
  }, [gameStatus, setShowRoundResult]);

  useEffect(() => {
    if (previousRoundRef.current === null) {
      previousRoundRef.current = currentRound;
      return;
    }

    if (currentRound !== previousRoundRef.current) {
      previousRoundRef.current = currentRound;
      hasRestoredScores.current = false;
      setHasDealt(false);
      setPlayerHand([null, null, null]);
      setPlayerScore(null);
      setShowScore(false);
      setIsUpdatingRound(false);
      refetchSessionState();
    }
  }, [currentRound, refetchSessionState]);

  const handleDrawCard = async (index: number) => {
    if (!player || !session) {
      return;
    }

    if (playerHand[index] || drawCardMutation.isPending) {
      return;
    }

    try {
      const result = await drawCardMutation.mutateAsync({
        sessionId: session.id,
        playerId: player.id,
      });

      if (!result || !result.card) {
        throw new Error(
          "Invalid response from server: " + JSON.stringify(result),
        );
      }

      const updatedHand = [...playerHand];
      updatedHand[index] = result.card;

      setPlayerHand(updatedHand);
      setPlayerScore(result.score ?? null);

      // Sync partial hand to store immediately so it survives refetches
      updatePlayerHand(
        player.id,
        updatedHand.filter((c): c is CardType => c !== null),
      );

      const allDrawn = updatedHand.every(Boolean);
      setHasDealt(allDrawn);
      setShowScore(false); // Don't show score yet, show Publish button instead
    } catch {
      alert("Failed to draw a card. Please try again.");
    }
  };

  const publishScore = async () => {
    if (playerScore !== null && player && session) {
      try {
        await publishScoreMutation.mutateAsync({
          sessionId: session.id,
          playerId: player.id,
          score: playerScore,
          roundNumber: currentRound,
        });

        const cleanHand = playerHand.filter((c): c is CardType => c !== null);
        publishPlayerScore(
          player.id,
          playerScore,
          undefined,
          undefined,
          cleanHand,
        );
        setShowScore(true);

        send({
          type: "playerScore",
          playerId: player.id,
          score: playerScore,
          cards: cleanHand,
        });
      } catch (error) {
        console.error("Failed to publish score:", error);
      }
    }
  };

  const getCardColor = (suit: string) => {
    return suit === "♥" || suit === "♦" ? "text-red-500" : "text-gray-900";
  };

  const getCurrentPlayer = () => {
    return players.find((p) => p.id === player?.id);
  };

  const handleNextRound = async () => {
    if (!session || isUpdatingRound) return;

    try {
      setIsUpdatingRound(true);
      setShowRoundResult(false);
      setHasDealt(false);
      setPlayerHand([null, null, null]);
      setPlayerScore(null);
      setShowScore(false);

      const response = (await updateRoundMutation.mutateAsync(session.id)) as
        | { session?: { currentRound?: number } }
        | undefined;
      const nextRoundNumber =
        response?.session?.currentRound ?? currentRound + 1;

      send({
        type: "nextRound",
        round: nextRoundNumber,
      });
    } catch (error: unknown) {
      // Handle race condition error
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response &&
        "status" in error.response &&
        error.response.status === 429
      ) {
        // Another player is already processing next round
        // Just wait and let the WebSocket update handle it
      } else {
        // Reset lock on other errors so user can try again
        setIsUpdatingRound(false);
      }
    }
  };

  const handleViewRoundResult = () => {
    const winner = players.reduce((prev, current) =>
      (current.score || 0) > (prev.score || 0) ? current : prev,
    );
    setRoundWinner(winner);
    setShowRoundResult(true);
  };

  if (showFinalResult && gameWinner) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl p-8 shadow-lg">
          <div className="text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-3xl font-bold font-heading mb-6">Game Over!</h2>

            <div className="space-y-2 mb-8">
              <h3 className="text-lg font-semibold mb-4">Final Scores</h3>
              {players
                .sort((a, b) => b.cumulatedScore - a.cumulatedScore)
                .map((p, index) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                  >
                    <div className="flex items-center gap-3">
                      {index === 0 && (
                        <Trophy className="w-5 h-5 text-yellow-500" />
                      )}
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {p.cumulatedScore} pts
                    </Badge>
                  </div>
                ))}
            </div>

            <Button
              onClick={() => (window.location.href = "/")}
              className="font-body"
            >
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (showRoundResult && roundWinner) {
    return (
      <RoundResultModal
        currentRound={currentRound}
        roundWinner={roundWinner}
        players={players}
        onNextRound={handleNextRound}
        isPending={updateRoundMutation.isPending || isUpdatingRound}
      />
    );
  }

  const currentPlayer = getCurrentPlayer();

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <Card className="p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold font-heading">
              Round {currentRound} of {totalRounds}
            </h2>
            <Badge variant={gameStatus === "playing" ? "default" : "secondary"}>
              {gameStatus}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{players.length} Players</span>
          </div>
        </div>
      </Card>

      {/* Scoreboard */}
      <Card className="p-4 shadow-lg">
        <h3 className="font-semibold mb-3 font-heading">Scoreboard</h3>
        <div className="space-y-2">
          {players
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  p.id === player?.id
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {p.id === player?.id && (
                        <span className="text-xs text-muted-foreground">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total: {p.totalScore} pts
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.hasPublishedScore ? (
                    <>
                      <div className="flex gap-1 mr-2">
                        {(p.hand || []).map((card, idx) => (
                          <div
                            key={idx}
                            className="w-6 h-9 rounded border border-border bg-white flex flex-col items-center justify-center shadow-sm"
                          >
                            <span
                              className={
                                card.suit === "♥" || card.suit === "♦"
                                  ? "text-red-500 font-bold text-xs"
                                  : "text-gray-900 font-bold text-xs"
                              }
                            >
                              {card.rank}
                            </span>
                            <span
                              className={
                                card.suit === "♥" || card.suit === "♦"
                                  ? "text-red-500"
                                  : "text-gray-900"
                              }
                              style={{ fontSize: "8px" }}
                            >
                              {card.suit}
                            </span>
                          </div>
                        ))}
                      </div>
                      <Badge variant="secondary">{p.score ?? 0}</Badge>
                      <Eye className="w-4 h-4 text-green-500" />
                    </>
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Player's Hand */}
      <Card className="p-6 shadow-lg">
        <h3 className="font-semibold mb-4 font-heading">Your Hand</h3>

        <div className="space-y-4">
          <div className="flex justify-center gap-4">
            {playerHand.map((card, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleDrawCard(index)}
                disabled={!!card || drawCardMutation.isPending}
                className={`w-20 h-28 rounded-lg border-2 shadow-lg transition-all duration-200 flex flex-col items-center justify-center ${
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
                      className={`text-3xl font-bold ${getCardColor(card.suit)}`}
                    >
                      {card.rank}
                    </span>
                    <span className={`text-2xl ${getCardColor(card.suit)}`}>
                      {card.suit}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-slate-200 font-body">
                    Draw
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground font-body">
            {hasDealt ? "Hand complete" : "Click each card to draw your hand"}
          </p>

          {hasDealt && (
            <div className="text-center">
              {showScore ? (
                <div className="space-y-2">
                  <Badge
                    variant="secondary"
                    className="text-lg px-4 py-2 font-body"
                  >
                    Score: {playerScore}
                  </Badge>
                  {currentPlayer?.hasPublishedScore && (
                    <p className="text-sm text-green-600 font-body">
                      Score published!
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  onClick={publishScore}
                  className="font-body"
                  disabled={currentPlayer?.hasPublishedScore}
                >
                  {currentPlayer?.hasPublishedScore
                    ? "Score Published"
                    : "Publish Score"}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* All Players Published - Show Round Results */}
      {allPlayersPublished && !showRoundResult && (
        <Card className="p-4 text-center">
          <p className="mb-4 font-body">
            All players have published their scores!
          </p>
          <Button onClick={handleViewRoundResult} className="font-body">
            View Round Results
          </Button>
        </Card>
      )}
    </div>
  );
};
