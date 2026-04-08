import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoundResultModal } from "@/components/RoundResultModal";
import { PileGrid } from "./PileGrid";
import { SwipeCardArea } from "./SwipeCardArea";
import { PlayerRoster } from "./PlayerRoster";
import { StickerPicker } from "./StickerPicker";
import { StickerOverlay } from "./StickerOverlay";

import {
  usePublishScore,
  useSessionState,
  useUpdateSessionRound,
} from "@/api/sessions";
import {
  useGameStore,
  usePlayerStore,
  useRoomStore,
  useWebSocketStore,
} from "@/store";
import { evaluateHand, determineWinner } from "@three-card-poker/shared";
import type { Card as CardType } from "@three-card-poker/shared";
import type { GamePlayer } from "@/store";

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
    showRoundResult,
    showFinalResult,
    publishPlayerScore,
    setGameState,
    setRoundWinner,
    setShowRoundResult,
    piles,
    claimPile,
    setCurrentRound,
    syncPlayerScores,
    syncPlayerCumulativeScores,
  } = useGameStore();

  const publishScoreMutation = usePublishScore();
  const updateRoundMutation = useUpdateSessionRound();

  const [isUpdatingRound, setIsUpdatingRound] = useState(false);
  const previousRoundRef = useRef<number | null>(null);

  const { data: sessionState, refetch: refetchSessionState } = useSessionState(
    session?.id,
    !!session?.id,
  );

  // Sync session state on reconnect/update
  useEffect(() => {
    if (sessionState && players.length > 0) {
      if (
        sessionState.currentRound &&
        sessionState.currentRound > currentRound
      ) {
        setCurrentRound(sessionState.currentRound);
      }

      syncPlayerScores(
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
  }, [
    sessionState,
    players.length,
    currentRound,
    setCurrentRound,
    syncPlayerScores,
    syncPlayerCumulativeScores,
  ]);

  // Handle all published Check
  const allPlayersPublished = useMemo(() => {
    if (players.length === 0) return false;
    return players.every((p) => p.hasPublishedScore);
  }, [players]);

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
      const winnerByPoints = players.find((p) => (p.roundScore || 0) > 0);
      if (winnerByPoints) {
        setRoundWinner(winnerByPoints);
      } else {
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
    }
  }, [
    allPlayersPublished,
    gameStatus,
    showRoundResult,
    players,
    setRoundWinner,
  ]);

  useEffect(() => {
    if (previousRoundRef.current === null) {
      previousRoundRef.current = currentRound;
      return;
    }
    if (currentRound !== previousRoundRef.current) {
      previousRoundRef.current = currentRound;
      setIsUpdatingRound(false);
      refetchSessionState();
    }
  }, [currentRound, refetchSessionState]);

  // Game Logic Actions
  const handleClaimPile = async (pileId: string) => {
    if (!player || !session) return;
    try {
      claimPile(pileId, player.id);

      send({
        type: "claimPile",
        pileId,
        sessionId: session.id,
        roundNumber: currentRound,
      });
      // the websocket handles the real state, or we could await claimPileMutation
      // Let's use pure websocket driven for smooth ux, but call the rest occasionally if needed
      // Actually since Phase 4 I set up `POST /sessions/:id/claim-pile`, lets rely on WS fallback
    } catch {
      alert("Failed to claim pile");
    }
  };

  const handlePublishScore = async () => {
    if (!player || !session) return;

    // Evaluate cards manually to publish
    const myPile = piles.find((p) => p.claimedBy === player.id);
    const myHand =
      myPile?.cards && myPile.cards.length === 3 ? myPile.cards : playerHand;
    if (!myHand || myHand.length !== 3) return;

    try {
      const evaluation = evaluateHand(myHand as [CardType, CardType, CardType]);
      const calculatedScore = evaluation.score;

      await publishScoreMutation.mutateAsync({
        sessionId: session.id,
        playerId: player.id,
        score: calculatedScore,
        roundNumber: currentRound,
        cards: myHand as CardType[],
      });

      publishPlayerScore(
        player.id,
        calculatedScore,
        undefined,
        undefined,
        myHand,
      );

      send({
        type: "playerScore",
        playerId: player.id,
        score: calculatedScore,
        cards: myHand,
      });
    } catch (e) {
      console.error(e);
      alert("Failed to publish score");
    }
  };

  const handleNextRound = async () => {
    if (!session || isUpdatingRound) return;
    try {
      setIsUpdatingRound(true);
      setShowRoundResult(false);

      const response = (await updateRoundMutation.mutateAsync({
        sessionId: session.id,
        expectedCurrentRound: currentRound,
      })) as { session?: { currentRound?: number }; allScores?: Array<Record<string, unknown>> } | undefined;

      const nextRoundNumber =
        response?.session?.currentRound ?? currentRound + 1;

      send({
        type: "nextRound",
        round: nextRoundNumber,
        allScores: response?.allScores,
      });
    } catch (error: unknown) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { status?: unknown } }).response
          ?.status === "number"
          ? (error as { response: { status: number } }).response.status
          : undefined;

      if (status === 429) {
        // Race condition safe ignored
      } else {
        setIsUpdatingRound(false);
      }
    }
  };

  const handleKickPlayer = (playerId: string) => {
    send({
      type: "kickPlayer",
      targetPlayerId: playerId,
    });
  };

  if (showFinalResult) {
    return <GameEndOverlay players={players} />;
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

  const currentPlayer = players.find((p) => p.id === player?.id);
  const myPile = piles.find((p) => p.claimedBy === player?.id) as import("@three-card-poker/shared").Pile | undefined;
  const selectedPileId: string | null = myPile?.id ?? null;
  const playerHand = myPile?.cards || currentPlayer?.hand || [];
  const showSwipeArea = !!myPile;

  return (
    <div className="flex flex-col md:flex-row gap-6 relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <StickerOverlay />

      {/* Main Game Area */}
      <div className="flex-1 space-y-6">
        <Card className="p-6 glass-dark rounded-2xl relative">
          {/* Animated gradient accent */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/5 via-transparent to-accent/5 animate-pulse opacity-50 pointer-events-none" />
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold font-heading text-white mb-1">
                Round{" "}
                <span className="text-primary drop-shadow-[0_0_8px_rgba(13,148,136,0.8)]">{currentRound}</span>
                <span className="text-slate-400 text-sm ml-2">/ {totalRounds}</span>
              </h2>
              <Badge
                variant={gameStatus === "playing" ? "default" : "secondary"}
                className={gameStatus === "playing" ? "neon-border-glow neon-pulse" : ""}
              >
                {gameStatus}
              </Badge>
            </div>
            {showSwipeArea && currentPlayer?.hasPublishedScore && (
              <StickerPicker />
            )}
          </div>
        </Card>

        {showSwipeArea ? (
          <Card className="p-6 glass-dark min-h-[400px] flex items-center justify-center rounded-3xl border-primary/20">
            <SwipeCardArea
              cards={playerHand}
              hasPublished={!!currentPlayer?.hasPublishedScore}
              score={currentPlayer?.score ?? null}
              isPublishing={publishScoreMutation.isPending}
              onPublishScore={handlePublishScore}
            />
          </Card>
        ) : (
          <Card className="p-8 glass-dark min-h-[400px] flex flex-col items-center justify-center rounded-3xl border-primary/20">
            <PileGrid
              piles={piles}
              onClaimPile={handleClaimPile}
              isClaiming={false}
              selectedPileId={selectedPileId}
            />
          </Card>
        )}

        <AnimatePresence>
          {allPlayersPublished && !showRoundResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card className="p-8 text-center glass-dark border-accent/30 rounded-2xl">
                <p className="mb-4 font-body font-medium text-accent drop-shadow-[0_0_8px_rgba(234,88,12,0.5)]">
                  All players have published their scores!
                </p>
                <Button
                  onClick={() => setShowRoundResult(true)}
                  className="font-body px-8 neon-border-glow-accent neon-pulse bg-accent hover:bg-accent/90 text-white"
                >
                  View Results
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Side Roster */}
      <div className="w-full md:w-80 shrink-0 hidden md:block">
        <PlayerRoster onKickPlayer={handleKickPlayer} />
      </div>

      {/* Mobile Roster Drawer placeholder / could render absolute pinned to bottom in mobile */}
      <div className="w-full md:hidden fixed bottom-0 left-0 right-0 max-h-[40vh] z-40">
        {/* We can make it collapsible, but for now just drop it into the flow */}
      </div>
      <div className="w-full md:hidden mt-4">
        <PlayerRoster onKickPlayer={handleKickPlayer} />
      </div>
    </div>
  );
};

const GameEndOverlay: React.FC<{
  players: GamePlayer[];
}> = ({ players }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      {/* Animated gradient bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 animate-pulse pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl relative z-10"
      >
        <Card className="p-8 glass-dark border-primary/30 rounded-3xl overflow-hidden">
          <div className="text-center relative z-10">
            {/* Trophy with glow */}
            <motion.div
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring" }}
              className="relative inline-block"
            >
              <Trophy className="w-20 h-20 mx-auto mb-4 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-6 h-6 text-yellow-300" />
              </motion.div>
            </motion.div>

            {/* Glitch title */}
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-5xl font-bold font-heading mb-6 text-accent drop-shadow-[0_0_20px_rgba(234,88,12,0.7)] glitch-text"
            >
              GAME OVER
            </motion.h2>



            {/* Final Scores */}
            <div className="mb-8 flex flex-col">
              <h3 className="text-lg font-semibold mb-4 font-heading text-slate-300 uppercase tracking-widest shrink-0">
                Final Scores
              </h3>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto px-2 -mx-2 py-2 custom-scrollbar">
              {players
                .sort((a, b) => b.cumulatedScore - a.cumulatedScore)
                .map((p, index) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className={`flex items-center justify-between gap-4 p-4 rounded-xl ${
                      index === 0
                        ? "bg-yellow-500/10 border border-yellow-500/30"
                        : index === 1
                          ? "bg-slate-400/10 border border-slate-400/30"
                          : index === 2
                            ? "bg-amber-600/10 border border-amber-600/30"
                            : "bg-slate-800/50 border border-slate-700/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {index === 0 && (
                        <Trophy className="w-5 h-5 shrink-0 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                      )}
                      <span className="font-medium text-lg font-body text-white block truncate">
                        {p.name}
                      </span>
                    </div>
                    <Badge
                      className={`font-mono text-lg px-4 shrink-0 ${
                        index === 0
                          ? "bg-yellow-500/20 text-yellow-300 neon-border-glow-accent"
                          : "bg-primary/20 text-primary"
                      }`}
                    >
                      {p.cumulatedScore} pts
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => (window.location.href = "/")}
              className="font-body px-10 py-6 text-lg neon-border-glow-accent neon-pulse bg-accent hover:bg-accent/90 text-white"
            >
              Back to Home
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
