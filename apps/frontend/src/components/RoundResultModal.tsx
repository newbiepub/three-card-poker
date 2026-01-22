import { useEffect, useState } from "react";
import { Trophy, Crown, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Player, Card as CardType } from "@/types";

interface GamePlayer extends Player {
  hand: CardType[];
  score: number | null;
  hasPublishedScore: boolean;
  roundScore: number;
  totalScore: number;
}
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
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);
    setShowConfetti(true);

    // Clean up confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const sortedPlayers = [...players].sort(
    (a, b) => (b.score || 0) - (a.score || 0),
  );

  return (
    <>
      {/* Overlay with CRT scanline effect */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle at center, rgba(37, 99, 235, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%)",
        }}
      >
        {/* CRT scanlines overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(37, 99, 235, 0.03) 2px, rgba(37, 99, 235, 0.03) 4px)",
          }}
        />

        <Card
          className={`
            relative w-full max-w-2xl overflow-hidden transition-all duration-700 ease-out
            ${isVisible ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"}
          `}
          style={{
            background:
              "linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%)",
            boxShadow:
              "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(37, 99, 235, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="relative p-8">
            {/* Winner celebration section */}
            <div className="text-center mb-8">
              {/* Animated trophy with glow */}
              <div className="relative inline-block mb-4">
                <Trophy
                  className="w-16 h-16 mx-auto text-yellow-500"
                  style={{
                    filter: "drop-shadow(0 0 20px rgba(245, 158, 11, 0.5))",
                    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  }}
                />
                {showConfetti && (
                  <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-spin" />
                )}
              </div>

              {/* Winner title with neon effect */}
              <h2
                className="text-4xl font-bold mb-2 tracking-wider"
                style={{
                  fontFamily: '"Russo One", sans-serif',
                  textShadow:
                    "0 0 20px rgba(37, 99, 235, 0.5), 0 0 40px rgba(37, 99, 235, 0.3)",
                }}
              >
                ROUND {currentRound} WINNER!
              </h2>

              {/* Winner name and score */}
              <div className="relative inline-block">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-8 h-8 text-yellow-400" />
                    <div
                      className="text-2xl font-semibold text-blue-600"
                      style={{ fontFamily: '"Chakra Petch", sans-serif' }}
                    >
                      {roundWinner?.name}
                    </div>
                    <Crown className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div
                    className="text-5xl font-black bg-linear-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent"
                    style={{ fontFamily: '"Russo One", sans-serif' }}
                  >
                    {roundWinner?.score || 0} POINTS
                  </div>
                </div>
              </div>
            </div>

            {/* Scoreboard with improved design */}
            <div className="mb-8">
              <h3
                className="text-lg font-semibold mb-4 text-center text-gray-600"
                style={{ fontFamily: '"Chakra Petch", sans-serif' }}
              >
                SCOREBOARD
              </h3>
              <div className="space-y-3">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`
                      flex items-center justify-between p-4 rounded-lg transition-all duration-300
                      ${index === 0 ? "bg-linear-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300" : "bg-gray-50"}
                      ${player.id === roundWinner?.id ? "scale-105 shadow-lg" : ""}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {/* Position indicator */}
                      <div
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${index === 0 ? "bg-yellow-400 text-white" : "bg-gray-300 text-gray-700"}
                        `}
                        style={{ fontFamily: '"Russo One", sans-serif' }}
                      >
                        {index + 1}
                      </div>

                      {/* Player name with crown for winner */}
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <Crown className="w-5 h-5 text-yellow-500" />
                        )}
                        <span
                          className="font-medium"
                          style={{ fontFamily: '"Chakra Petch", sans-serif' }}
                        >
                          {player.name}
                        </span>
                        {player.id === roundWinner?.id && (
                          <Badge variant="secondary" className="ml-2">
                            WINNER
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Score with trend indicator */}
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      )}
                      <span
                        className={`
                          text-xl font-bold
                          ${index === 0 ? "text-orange-600" : "text-gray-700"}
                        `}
                        style={{ fontFamily: '"Russo One", sans-serif' }}
                      >
                        {player.score || 0}
                      </span>
                      <span className="text-sm text-gray-500">pts</span>
                    </div>

                    {/* Player's cards */}
                    <div className="flex gap-1 mt-2">
                      {(player.hand || []).map((card, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-12 rounded border border-gray-200 bg-white flex flex-col items-center justify-center shadow-sm"
                        >
                          <span
                            className={
                              card.suit === "♥" || card.suit === "♦"
                                ? "text-red-500 font-bold text-sm"
                                : "text-gray-900 font-bold text-sm"
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
                            style={{ fontSize: "10px" }}
                          >
                            {card.suit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Round button with enhanced styling */}
            <Button
              onClick={onNextRound}
              disabled={isPending}
              className="w-full h-14 text-lg font-bold tracking-wide transition-all duration-300 hover:scale-105"
              style={{
                fontFamily: '"Russo One", sans-serif',
                background: "linear-gradient(45deg, #F97316, #FB923C)",
                boxShadow: "0 4px 14px 0 rgba(249, 115, 22, 0.3)",
              }}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  PREPARING NEXT ROUND...
                </span>
              ) : (
                "NEXT ROUND →"
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Custom styles for animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.8;
            }
          }
          
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `,
        }}
      />
    </>
  );
}
