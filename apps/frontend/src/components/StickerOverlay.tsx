import React, { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { useRoomStore } from "@/store/roomStore";

// The overlay should render above everything but let pointer events pass through
export const StickerOverlay: React.FC = () => {
  const { stickers, removeSticker } = useGameStore();
  const { players } = useRoomStore();

  const getPlayerName = (playerId: string) => {
    return players.find((p) => p.id === playerId)?.name || "Unknown";
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {stickers.map((st) => (
        <StickerItem
          key={st.id}
          sticker={st}
          playerName={getPlayerName(st.playerId)}
          onComplete={() => removeSticker(st.id)}
        />
      ))}
    </div>
  );
};

const StickerItem: React.FC<{
  sticker: { id: string; sticker: string; timestamp: number };
  playerName: string;
  onComplete: () => void;
}> = ({ sticker, playerName, onComplete }) => {
  // Clean up slightly after the animation finishes
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // randomize horizontal start position loosely
  const [leftPercent] = useState(() => 10 + Math.random() * 80);

  return (
    <div
      className="absolute bottom-0 sticker-overlay-item flex flex-col items-center"
      style={{ left: `${leftPercent}%` }}
    >
      <span className="text-6xl filter drop-shadow-xl mb-1">
        {sticker.sticker}
      </span>
      <span className="text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-md">
        {playerName}
      </span>
    </div>
  );
};
