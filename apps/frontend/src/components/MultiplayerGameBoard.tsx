import { motion, AnimatePresence } from "framer-motion";
import {
  useDrawCard,
  usePublishScore,
  useSessionState,
  useUpdateSessionRound,
} from "@/api/sessions";
import { RoundResultModal } from "@/components/RoundResultModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useGameStore,
  usePlayerStore,
  useRoomStore,
  useWebSocketStore,
} from "@/store";
import type { Card as CardType } from "@three-card-poker/shared";
import { determineWinner, evaluateHand } from "@three-card-poker/shared";
import { Eye, EyeOff, Trophy, Users, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

export const MultiplayerGameBoard: React.FC = () => {
  const { player } = usePlayerStore();
  const { session, isHost, room } = useRoomStore();
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
        sessionState.allScores.map((score) => ({
          playerId: score.playerId,
          cumulatedScore: score.cumulativeScore,
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
      // Find winner based on pointsChange from backend
      const winnerByPoints = players.find((p) => (p.roundScore || 0) > 0);
      if (winnerByPoints) {
        setRoundWinner(winnerByPoints);
      } else {
        // Fallback: Perform proper hand evaluation on frontend to show correct winner immediately
        const playersWithHands = players.filter(
          (p) => p.hand && p.hand.length === 3,
        );
        if (playersWithHands.length > 0) {
          const handResults = playersWithHands.map((p) => evaluateHand(p.hand));
          const winnerIndex = determineWinner(handResults);

          const fallbackWinner =
            playersWithHands[winnerIndex] || playersWithHands[0];
          setRoundWinner(fallbackWinner);
        } else {
          // Absolute fallback
          const fallbackWinner = players.reduce((prev, current) =>
            (prev.score || 0) > (current.score || 0) ? prev : current,
          );
          setRoundWinner(fallbackWinner);
        }
      }
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

      const response = (await updateRoundMutation.mutateAsync({
        sessionId: session.id,
        expectedCurrentRound: currentRound,
      })) as { session?: { currentRound?: number } } | undefined;
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
    // Find winner based on pointsChange from backend
    const winnerByPoints = players.find((p) => (p.roundScore || 0) > 0);
    if (winnerByPoints) {
      setRoundWinner(winnerByPoints);
    } else {
      // Fallback: Perform proper hand evaluation
      const playersWithHands = players.filter(
        (p) => p.hand && p.hand.length === 3,
      );
      if (playersWithHands.length > 0) {
        const handResults = playersWithHands.map((p) => evaluateHand(p.hand));
        const winnerIndex = determineWinner(handResults);

        const fallbackWinner =
          playersWithHands[winnerIndex] || playersWithHands[0];
        setRoundWinner(fallbackWinner);
      } else {
        const fallbackWinner = players.reduce((prev, current) =>
          (prev.score || 0) > (current.score || 0) ? prev : current,
        );
        setRoundWinner(fallbackWinner);
      }
    }
    setShowRoundResult(true);
  };

  if (showFinalResult && gameWinner) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <Card className="p-8 shadow-lg">
            <div className="text-center">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              </motion.div>
              <h2 className="text-3xl font-bold font-heading mb-6">
                Game Over!
              </h2>

              <div className="space-y-2 mb-8">
                <h3 className="text-lg font-semibold mb-4">Final Scores</h3>
                <div className="space-y-2">
                  {players
                    .sort((a, b) => b.cumulatedScore - a.cumulatedScore)
                    .map((p, index) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
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
                      </motion.div>
                    ))}
                </div>
              </div>

              <Button
                onClick={() => (window.location.href = "/")}
                className="font-body"
              >
                Back to Home
              </Button>
            </div>
          </Card>
        </motion.div>
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
      <Card className="p-4 shadow-lg border-primary/20">
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
        <div
          className={`space-y-2 ${players.length > 6 ? "grid grid-cols-1 md:grid-cols-2 gap-3 space-y-0" : "space-y-2"}`}
        >
          <AnimatePresence mode="popLayout">
            {players
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    p.id === player?.id
                      ? "border-primary bg-primary/5 shadow-sm"
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
                        {isHost &&
                          p.id !== player?.id &&
                          p.id !== room?.hostId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                send({
                                  type: "kickPlayer",
                                  targetPlayerId: p.id,
                                });
                              }}
                              className="p-1 rounded hover:bg-red-100 hover:text-red-500 transition-colors"
                              title="Kick player"
                            >
                              <X className="w-3 h-3" />
                            </button>
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
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.1 }}
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
                                style={{ fontSize: "6px" }}
                              >
                                {card.suit}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                        <Badge variant="secondary">{p.score ?? 0}</Badge>
                        <Eye className="w-4 h-4 text-green-500" />
                      </>
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </Card>

      {/* Player's Hand */}
      <Card className="p-6 shadow-lg border-primary/10">
        <h3 className="font-semibold mb-4 font-heading">Your Hand</h3>

        <div className="space-y-4">
          <div className="flex justify-center gap-4">
            {playerHand.map((card, index) => (
              <motion.button
                key={index}
                whileHover={!card ? { scale: 1.05 } : {}}
                whileTap={!card ? { scale: 0.95 } : {}}
                onClick={() => handleDrawCard(index)}
                disabled={!!card || drawCardMutation.isPending}
                className={`group relative w-20 h-28 rounded-xl border-2 shadow-lg transition-all duration-300 flex flex-col items-center justify-center overflow-hidden ${
                  card
                    ? "bg-white border-border"
                    : "bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 hover:border-primary/50"
                }`}
              >
                <AnimatePresence mode="wait">
                  {card ? (
                    <motion.div
                      key="front"
                      initial={{ rotateY: 180, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                      }}
                      className="flex flex-col items-center justify-center"
                    >
                      <span
                        className={`text-3xl font-bold ${getCardColor(card.suit)}`}
                      >
                        {card.rank}
                      </span>
                      <span className={`text-2xl ${getCardColor(card.suit)}`}>
                        {card.suit}
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="back"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center"
                    >
                      <div className="w-12 h-16 rounded border-2 border-slate-700 bg-slate-800/50 flex flex-col items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                        <div className="w-6 h-6 rounded-full border border-slate-600 bg-slate-700/50" />
                      </div>
                      <span className="mt-2 text-[10px] font-bold text-slate-400 font-heading uppercase tracking-widest">
                        Draw
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Subtle highlight effect */}
                {!card && (
                  <div className="absolute inset-0 bg-linear-to-tr from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </motion.button>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground font-body">
            {hasDealt ? "Hand complete" : "Click each card to draw your hand"}
          </p>

          {hasDealt && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              {showScore ? (
                <div className="space-y-3">
                  <Badge
                    variant="secondary"
                    className="text-lg px-6 py-2 font-heading bg-primary/10 text-primary border-primary/20"
                  >
                    Score: {playerScore}
                  </Badge>
                  {currentPlayer?.hasPublishedScore && (
                    <motion.p
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-sm font-semibold text-green-600 font-body flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Score published!
                    </motion.p>
                  )}
                </div>
              ) : (
                <Button
                  onClick={publishScore}
                  className="font-body gaming-button px-8"
                  disabled={currentPlayer?.hasPublishedScore}
                >
                  {currentPlayer?.hasPublishedScore
                    ? "Score Published"
                    : "Publish Score"}
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </Card>

      {/* All Players Published - Show Round Results */}
      <AnimatePresence>
        {allPlayersPublished && !showRoundResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="p-6 text-center border-accent/20 bg-accent/5">
              <p className="mb-4 font-body font-medium text-accent">
                All players have published their scores!
              </p>
              <Button
                onClick={handleViewRoundResult}
                className="font-body gaming-button"
              >
                View Round Results
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
