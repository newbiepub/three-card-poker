import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Pile } from "@three-card-poker/shared";
import { Lock } from "lucide-react";
import { useRoomStore } from "@/store/roomStore";

interface PileGridProps {
  piles: Pile[];
  onClaimPile: (pileId: string) => void;
  isClaiming: boolean;
  selectedPileId: string | null;
}

export const PileGrid: React.FC<PileGridProps> = ({
  piles,
  onClaimPile,
  isClaiming,
  selectedPileId,
}) => {
  const { players } = useRoomStore();

  const getClaimerName = (playerId: string) => {
    return players.find((p) => p.id === playerId)?.name || "Unknown";
  };

  return (
    <div className="w-full">
      <h3 className="font-semibold mb-6 font-heading text-xl text-primary drop-shadow-[0_0_8px_rgba(13,148,136,0.6)] text-center">
        Select a Pile
      </h3>

      {/* 
        Responsive grid:
        - Mobile: 2 cols
        - Tablet: 3 cols
        - Desktop: 4 or flexible cols
      */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:flex-wrap lg:justify-center gap-8 lg:gap-12 px-4 py-8">
        <AnimatePresence>
          {piles.map((pile) => {
            const isClaimedByOther =
              pile.claimedBy && pile.claimedBy !== selectedPileId;
            const isClaimedByMe = pile.id === selectedPileId;
            const isClickable =
              !pile.claimedBy && !selectedPileId && !isClaiming;

            return (
              <motion.button
                key={pile.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={isClickable ? { scale: 1.05 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
                onClick={() => isClickable && onClaimPile(pile.id)}
                disabled={!isClickable}
                className={`
                  relative w-full lg:w-24 aspect-[2.5/3.5] rounded-xl transition-all duration-300
                  flex flex-col items-center justify-center overflow-visible
                  ${
                    isClaimedByOther
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer"
                  }
                `}
              >
                {/* Pile generic design (Face down stack) */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Bottom Card */}
                  <div className="absolute w-[90%] h-[95%] border border-slate-700/80 rounded-lg bg-slate-800 -rotate-12 translate-y-2 -translate-x-3 transition-transform duration-300 group-hover:-rotate-[15deg] group-hover:-translate-x-4 shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
                  
                  {/* Middle Card */}
                  <div className="absolute w-[90%] h-[95%] border border-slate-600/80 rounded-lg bg-slate-700 rotate-6 translate-y-1 translate-x-2 transition-transform duration-300 group-hover:rotate-12 group-hover:translate-x-4 shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
                  
                  {/* Top Card */}
                  <div className={`
                    absolute w-[90%] h-[95%] border-2 rounded-lg flex flex-col items-center justify-center z-10 shadow-[0_8px_16px_rgba(0,0,0,0.6)] transition-all duration-300
                   ${isClaimedByMe 
                      ? "border-primary bg-primary/10 neon-border-glow" 
                      : "border-primary/40 bg-slate-900 hover:neon-border-glow hover:bg-slate-800"}
                    ${!isClaimedByOther && !isClaimedByMe && "group-hover:-translate-y-2 group-hover:shadow-[0_12px_24px_rgba(13,148,136,0.4)]"}
                  `}>
                    {!isClaimedByOther && !isClaimedByMe && (
                      <div className="w-10 h-10 rounded-full border-2 border-slate-600/50 flex items-center justify-center bg-slate-700/50">
                        <span className="text-2xl font-bold text-slate-300 opacity-90 drop-shadow-md">
                          ?
                        </span>
                      </div>
                    )}
                    
                    {isClaimedByOther && pile.claimedBy && (
                      <div className="flex flex-col items-center justify-center p-2 text-center">
                        <Lock className="w-8 h-8 text-slate-400 mb-2 drop-shadow-md" />
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-300 truncate w-full tracking-wide">
                          {getClaimerName(pile.claimedBy)}
                        </span>
                      </div>
                    )}

                    {isClaimedByMe && (
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-primary px-3 py-1 rounded-full text-primary-foreground text-xs font-bold uppercase tracking-widest shadow-lg">
                          Selected
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
