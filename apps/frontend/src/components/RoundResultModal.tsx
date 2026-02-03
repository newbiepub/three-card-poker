import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type GamePlayer } from "@/store";
import { compareHands, evaluateHand } from "@three-card-poker/shared";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Crown, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
interface RoundResultModalProps {
  currentRound: number;
  roundWinner: GamePlayer | null;
  players: GamePlayer[];
  onNextRound: () => void;
  isPending: boolean;
}

export function RoundResultModal({
  currentRound,
  roundWinner,
  players,
  onNextRound,
  isPending,
}: RoundResultModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const sortedPlayers = [...players].sort((a, b) => {
    if ((a.roundScore || 0) !== (b.roundScore || 0)) {
      return (b.roundScore || 0) - (a.roundScore || 0);
    }
    if (a.hand && b.hand && a.hand.length === 3 && b.hand.length === 3) {
      const handA = evaluateHand(a.hand);
      const handB = evaluateHand(b.hand);
      return compareHands(handB, handA);
    }
    return (b.score || 0) - (a.score || 0);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-2xl"
      >
        <Card className="relative overflow-hidden glass-card border-primary/20 shadow-2xl">
          <div className="p-8">
            {/* Winner Section */}
            <div className="text-center mb-8">
              <motion.div
                className="relative inline-block mb-4"
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <Trophy className="w-16 h-16 mx-auto text-yellow-500 drop-shadow-lg" />
                {showConfetti && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                  </motion.div>
                )}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold mb-4 font-heading tracking-tight"
              >
                ROUND {currentRound} WINNER
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <Crown className="w-6 h-6 text-yellow-500" />
                  <span className="text-2xl font-bold text-primary font-heading">
                    {roundWinner?.name}
                  </span>
                  <Crown className="w-6 h-6 text-yellow-500" />
                </div>

                <div className="text-4xl font-black text-accent font-heading">
                  {roundWinner?.score || 0} POINTS
                </div>
              </motion.div>
            </div>

            {/* Scoreboard */}
            <div className="mb-8">
              <h3 className="text-sm font-bold mb-4 text-center text-muted-foreground uppercase tracking-widest font-heading">
                Round Rankings
              </h3>
              <div className="space-y-2">
                <AnimatePresence>
                  {sortedPlayers.map((player, index) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        index === 0
                          ? "bg-accent/5 border-accent/20 shadow-md"
                          : "bg-background/50 border-border"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-heading ${
                            index === 0
                              ? "bg-accent text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </span>

                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-heading">
                              {player.name}
                            </span>
                            {player.hand && player.hand.length === 3 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase font-bold text-primary"
                              >
                                {evaluateHand(player.hand).type === "baTien"
                                  ? "Ba Tây"
                                  : evaluateHand(player.hand).type === "triple"
                                    ? "Sáp"
                                    : evaluateHand(player.hand).type === "pair"
                                      ? "Đôi"
                                      : `${player.score} Điểm`}
                              </Badge>
                            )}
                          </div>

                          {/* Player's cards minified */}
                          <div className="flex gap-1 mt-1.5">
                            {(player.hand || []).map((card, idx) => (
                              <div
                                key={idx}
                                className="w-6 h-9 rounded border border-border bg-white flex flex-col items-center justify-center shadow-xs"
                              >
                                <span
                                  className={`text-[10px] font-bold ${
                                    card.suit === "♥" || card.suit === "♦"
                                      ? "text-red-500"
                                      : "text-gray-900"
                                  }`}
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
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-2xl font-black font-heading ${
                              index === 0 ? "text-accent" : "text-foreground"
                            }`}
                          >
                            {player.score || 0}
                          </span>
                          <span className="text-xs text-muted-foreground font-bold">
                            PTS
                          </span>
                        </div>
                        {index === 0 && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                            <TrendingUp className="w-3 h-3" />
                            TOP
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <Button
                onClick={onNextRound}
                disabled={isPending}
                className="w-full h-16 text-lg gaming-button"
              >
                {isPending ? (
                  <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    PREPARING...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    NEXT ROUND <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
