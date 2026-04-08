import React, { useState, useEffect } from "react";
import type { Card } from "@three-card-poker/shared";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from "framer-motion";

interface SwipeCardAreaProps {
  cards: Card[];
  onPublishScore: () => void;
  isPublishing: boolean;
  hasPublished: boolean;
  score: number | null;
}

import { PlayingCard } from "./PlayingCard";

const SwipeableCard: React.FC<{
  card: Card;
  isTop: boolean;
  onSwipe: () => void;
  index: number;
  isFaceUp: boolean;
  hideRankCorners?: boolean;
}> = ({ card, isTop, onSwipe, index, isFaceUp, hideRankCorners }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100 || Math.abs(info.offset.y) > 100) {
      onSwipe();
    }
  };

  return (
    <motion.div
      className="absolute"
      style={{
        zIndex: 10 - index,
        x,
        rotate,
        opacity,
      }}
      drag={isTop ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      onTap={() => {
        if (isTop && isFaceUp) {
          onSwipe();
        }
      }}
      whileTap={isTop ? { scale: 1.05, cursor: "grabbing" } : {}}
      animate={{ opacity: 1, scale: 1, y: index * 4, rotate: (index % 2 === 0 ? -1 : 1) * index * 2 }}
      initial={{ opacity: 0, scale: 0.8 }}
      exit={{ 
        x: x.get() > 50 ? 300 : x.get() < -50 ? -300 : 0, 
        y: (x.get() > -50 && x.get() < 50) ? -300 : 0, 
        opacity: 0, 
        transition: { duration: 0.3 } 
      }}
    >
      <div className={`w-32 h-48 cursor-grab active:cursor-grabbing transition-all duration-300 ${isFaceUp ? "shadow-[0_0_20px_rgba(13,148,136,0.3)] rounded-xl" : ""}`}>
        <PlayingCard card={card} isFaceUp={isFaceUp} hideRankCorners={hideRankCorners} />
      </div>
    </motion.div>
  );
};

export const SwipeCardArea: React.FC<SwipeCardAreaProps> = ({
  cards,
  onPublishScore,
  isPublishing,
  hasPublished,
  score,
}) => {
  const [swipedCount, setSwipedCount] = useState(0);

  // Reset when cards change
  useEffect(() => {
    if (cards.length > 0 && !hasPublished) {
      setSwipedCount(0);
    } else if (cards.length > 0 && hasPublished) {
      setSwipedCount(3);
    }
  }, [cards, hasPublished]);

  const handleSwipe = () => {
    if (hasPublished) return;
    setSwipedCount((prev) => {
      // If we just swiped the middle card (prev === 1), reveal both it and the bottom one
      if (prev === 1) return 3;
      return Math.min(prev + 1, 3);
    });
  };

  if (!cards || cards.length !== 3) {
    return (
      <div className="w-full h-48 flex items-center justify-center border-2 border-dashed border-border rounded-xl">
        <p className="text-muted-foreground font-body">
          Select a pile to view your cards
        </p>
      </div>
    );
  }

  const allRevealed = swipedCount === 3;
  const remainingCards = cards.map((c, i) => ({ ...c, originalIndex: i })).slice(swipedCount);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center">
      
      {/* Revealed Cards Area */}
      <div className="flex justify-center gap-2 mb-12 h-40 w-full items-center">
        {cards.slice(0, swipedCount).map((card, idx) => (
          <motion.div
            key={`revealed-${idx}`}
            initial={{ opacity: 0, y: -50, scale: 0.5, rotate: Math.random() * 20 - 10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: (idx - 1) * 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`w-24 h-36 rounded-xl shadow-[0_0_15px_rgba(13,148,136,0.2)] flex items-center justify-center -ml-4 first:ml-0`}
          >
            <PlayingCard card={card} />
          </motion.div>
        ))}
        {swipedCount === 0 && (
          <div className="w-full h-full flex items-center justify-center opacity-50 text-slate-400 font-medium text-sm">
            Cards will appear here
          </div>
        )}
      </div>

      {/* Swipe Stack Area */}
      {!allRevealed && (
        <div className="relative w-32 h-48 mb-8">
          <AnimatePresence>
            {remainingCards.map((card, idx) => (
              <SwipeableCard
                key={card.originalIndex}
                index={idx}
                card={card}
                isTop={idx === 0}
                onSwipe={handleSwipe}
                isFaceUp={card.originalIndex === 0 || card.originalIndex === 2}
                hideRankCorners={card.originalIndex === 2}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Publish Area */}
      <div className="h-20 mt-4 flex items-center justify-center">
        {allRevealed && !hasPublished && (
          <Button
            onClick={onPublishScore}
            disabled={isPublishing}
          className="font-body px-8 py-6 text-lg rounded-xl neon-border-glow-accent neon-pulse bg-accent hover:bg-accent/90 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)]"
          >
            {isPublishing ? "Publishing..." : "Publish Score"}
          </Button>
        )}

        {hasPublished && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <span className="text-3xl font-heading text-primary drop-shadow-[0_0_10px_rgba(13,148,136,0.7)] bg-primary/10 px-6 py-2 rounded-2xl border border-primary/30 font-bold tracking-tight flicker">
              Score: {score}
            </span>
            <span className="text-sm font-medium text-slate-400 mt-3 uppercase tracking-widest">
              Score Published
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
};
