import React from "react";
import type { Card } from "@three-card-poker/shared";

interface PlayingCardProps {
  card: Card;
  className?: string;
  isFaceUp?: boolean;
  hideRankCorners?: boolean;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  className = "",
  isFaceUp = true,
  hideRankCorners = false,
}) => {
  const isRed = card.suit === "♥" || card.suit === "♦";
  const colorClass = isRed ? "text-red-500" : "text-slate-900";

  if (!isFaceUp) {
    return (
      <div
        className={`relative bg-blue-800 border-[3px] border-white rounded-xl shadow-md w-full h-full flex items-center justify-center overflow-hidden ${className}`}
      >
        <div 
          className="absolute inset-2 border-2 border-dashed border-white/50 rounded flex items-center justify-center opacity-80"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.2) 20%, transparent 20%), radial-gradient(circle, rgba(255,255,255,0.2) 20%, transparent 20%)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 10px 10px"
          }}
        >
          <div className="w-8 h-8 rounded-full border-4 border-white/40 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white/40"></div>
          </div>
        </div>
      </div>
    );
  }

  // Pip generator helper
  const renderPips = (rank: string) => {
    const Suit = () => <span>{card.suit}</span>;

    // J, Q, K
    if (["J", "Q", "K"].includes(rank)) {
      return (
        <div className="absolute inset-0 pointer-events-none opacity-40">
          {/* Top-Right L-Frame */}
          <div className="absolute top-2 right-2 bottom-10 left-9 border-t-[1.5px] border-r-[1.5px] border-current rounded-tr-sm" />
          {/* Bottom-Left L-Frame */}
          <div className="absolute bottom-2 left-2 top-10 right-9 border-b-[1.5px] border-l-[1.5px] border-current rounded-bl-sm" />
          {/* Clean minimal center suit */}
          <div className="absolute inset-0 flex items-center justify-center opacity-60">
            <span className="text-[40px]"><Suit /></span>
          </div>
        </div>
      );
    }

    // Mathematical Pip Placement Configs (Percentages)
    const X_L = 30;
    const X_C = 50;
    const X_R = 70;

    const Y_T = 20;
    const Y_B = 80;
    const Y_C = 50;
    const Y_UM3 = 35;
    const Y_LM3 = 65;

    const Y_T4 = 18;
    const Y_UM4 = 38;
    const Y_LM4 = 62;
    const Y_B4 = 82;
    const Y_UM10 = 28;
    const Y_LM10 = 72;

    interface PipDef { x: number; y: number; flip?: boolean; isA?: boolean }

    const pips: Record<string, PipDef[]> = {
      "A": [{ x: X_C, y: Y_C, isA: true }],
      "2": [{ x: X_C, y: Y_T }, { x: X_C, y: Y_B, flip: true }],
      "3": [{ x: X_C, y: Y_T }, { x: X_C, y: Y_C }, { x: X_C, y: Y_B, flip: true }],
      "4": [
        { x: X_L, y: Y_T }, { x: X_R, y: Y_T },
        { x: X_L, y: Y_B, flip: true }, { x: X_R, y: Y_B, flip: true }
      ],
      "5": [
        { x: X_L, y: Y_T }, { x: X_R, y: Y_T },
        { x: X_C, y: Y_C },
        { x: X_L, y: Y_B, flip: true }, { x: X_R, y: Y_B, flip: true }
      ],
      "6": [
        { x: X_L, y: Y_T }, { x: X_R, y: Y_T },
        { x: X_L, y: Y_C }, { x: X_R, y: Y_C },
        { x: X_L, y: Y_B, flip: true }, { x: X_R, y: Y_B, flip: true }
      ],
      "7": [
        { x: X_L, y: Y_T }, { x: X_R, y: Y_T },
        { x: X_C, y: Y_UM3 },
        { x: X_L, y: Y_C }, { x: X_R, y: Y_C },
        { x: X_L, y: Y_B, flip: true }, { x: X_R, y: Y_B, flip: true }
      ],
      "8": [
        { x: X_L, y: Y_T }, { x: X_R, y: Y_T },
        { x: X_C, y: Y_UM3 },
        { x: X_L, y: Y_C }, { x: X_R, y: Y_C },
        { x: X_C, y: Y_LM3, flip: true },
        { x: X_L, y: Y_B, flip: true }, { x: X_R, y: Y_B, flip: true }
      ],
      "9": [
        { x: X_L, y: Y_T4 }, { x: X_R, y: Y_T4 },
        { x: X_L, y: Y_UM4 }, { x: X_R, y: Y_UM4 },
        { x: X_C, y: Y_C },
        { x: X_L, y: Y_LM4, flip: true }, { x: X_R, y: Y_LM4, flip: true },
        { x: X_L, y: Y_B4, flip: true }, { x: X_R, y: Y_B4, flip: true }
      ],
      "10": [
        { x: X_L, y: Y_T4 }, { x: X_R, y: Y_T4 },
        { x: X_C, y: Y_UM10 },
        { x: X_L, y: Y_UM4 }, { x: X_R, y: Y_UM4 },
        { x: X_L, y: Y_LM4, flip: true }, { x: X_R, y: Y_LM4, flip: true },
        { x: X_C, y: Y_LM10, flip: true },
        { x: X_L, y: Y_B4, flip: true }, { x: X_R, y: Y_B4, flip: true }
      ]
    };

    const config = pips[rank] || pips["A"];

    return (
      <div className="absolute inset-0 pointer-events-none">
        {config.map((pip, idx) => (
          <div
            key={idx}
            className={`absolute flex items-center justify-center leading-none ${pip.isA ? 'text-[50px] opacity-90' : 'text-lg'}`}
            style={{
              left: `${pip.x}%`,
              top: `${pip.y}%`,
              transform: `translate(-50%, -50%) ${pip.flip ? "rotate(180deg)" : ""}`
            }}
          >
            <Suit />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`relative bg-white border border-slate-300 rounded-xl shadow-lg w-full h-full p-2 select-none font-serif ${colorClass} ${className}`}
    >
      {!hideRankCorners && (
        <>
          <div className="absolute top-1.5 left-1.5 flex flex-col items-center leading-none">
            <span className="text-sm font-bold tracking-tighter">{card.rank}</span>
            <span className="text-[10px] mt-[1px]">{card.suit}</span>
          </div>
          <div className="absolute bottom-1.5 right-1.5 flex flex-col items-center leading-none rotate-180">
            <span className="text-sm font-bold tracking-tighter">{card.rank}</span>
            <span className="text-[10px] mt-[1px]">{card.suit}</span>
          </div>
        </>
      )}
      {renderPips(card.rank)}
    </div>
  );
};
