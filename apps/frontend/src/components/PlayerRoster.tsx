import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useGameStore } from "@/store/gameStore";
import { usePlayerStore } from "@/store/playerStore";
import { useRoomStore } from "@/store/roomStore";
import { AnimatePresence, motion } from "framer-motion";
import { X, Trophy } from "lucide-react";
import React from "react";

interface PlayerRosterProps {
  onKickPlayer: (playerId: string) => void;
}

export const PlayerRoster: React.FC<PlayerRosterProps> = ({ onKickPlayer }) => {
  const { players, isHost, room, presence } = useRoomStore();
  const { player } = usePlayerStore();
  const { players: gamePlayers } = useGameStore();

  // gamePlayers has the score and hand. players in roomStore has only Player
  const combinedPlayers = players
    .map((p) => {
      const gp = gamePlayers.find((g) => g.id === p.id);
      return {
        ...p,
        cumulatedScore: gp?.cumulatedScore ?? 0,
        score: gp?.score ?? null,
        hasPublishedScore: gp?.hasPublishedScore ?? false,
        hand: gp?.hand ?? [],
      };
    })
    .sort((a, b) => b.cumulatedScore - a.cumulatedScore);

  return (
    <Card className="p-4 glass-dark h-full flex flex-col rounded-2xl border-l-2 border-l-primary/50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold font-heading text-lg text-primary drop-shadow-[0_0_6px_rgba(13,148,136,0.6)]">Players</h3>
        <Badge variant="outline" className="border-primary/30 text-primary">{combinedPlayers.length} / 17</Badge>
      </div>

      <div className="flex-1 overflow-y-auto px-2 -mx-2 py-2 space-y-2">
        <AnimatePresence mode="popLayout">
          {combinedPlayers.map((p) => {
            const status = presence[p.id] || "online"; // assume online if unknown during local dev until heartbeat works
            const isMe = p.id === player?.id;
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors group ${
                  isMe
                    ? "border-primary/50 bg-primary/10 neon-border-glow"
                    : "border-slate-700/50 bg-slate-800/50 hover:border-primary/30 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Status dot */}
                  <div className="relative flex h-3 w-3 shrink-0">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === "online" ? "bg-green-400" : "bg-gray-400"}`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 ${status === "online" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-slate-500"}`}
                    ></span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium font-body text-white truncate block">{p.name}</span>
                      {isMe && (
                        <span className="text-[10px] uppercase text-muted-foreground tracking-wider font-heading shrink-0">
                          (You)
                        </span>
                      )}
                      {p.id === room?.hostId && (
                        <Trophy className="w-3 h-3 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] shrink-0" />
                      )}

                      {isHost && !isMe && p.id !== room?.hostId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onKickPlayer(p.id);
                          }}
                          className="p-1 rounded hover:bg-red-100 hover:text-red-500 transition-colors shrink-0"
                          title="Kick player"
                        >
                          <X className="w-3 h-3 shrink-0" />
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {p.cumulatedScore} pts
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {p.hasPublishedScore && (
                    <Badge
                      className="font-mono bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.3)] shrink-0"
                    >
                      {p.score ?? 0}
                    </Badge>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Card>
  );
};
