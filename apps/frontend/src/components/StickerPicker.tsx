import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocketStore } from "@/store/websocketStore";

const STICKERS = ["😂", "🔥", "🤡", "💀", "😭", "👀", "🚀", "😎"];

export const StickerPicker: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { send } = useWebSocketStore();

  const handleSendSticker = (sticker: string) => {
    send({ type: "sendSticker", sticker });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-secondary text-2xl flex items-center justify-center hover:bg-secondary/80 transition shadow-lg border border-border"
        title="Send Reaction"
      >
        😊
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full mb-2 right-0 bg-popover border border-border rounded-xl shadow-xl p-3 w-max max-w-[200px] sm:max-w-[300px]"
          >
            <div className="flex flex-wrap gap-2 justify-center">
              {STICKERS.map((sticker) => (
                <button
                  key={sticker}
                  onClick={() => handleSendSticker(sticker)}
                  className="w-10 h-10 text-2xl flex items-center justify-center hover:bg-muted rounded-lg transition"
                >
                  {sticker}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
