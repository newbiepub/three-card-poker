import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Users, Crown, Play, X } from "lucide-react";
import type { Room, Session } from "@/types";
import type { Player } from "@three-card-poker/shared";

interface RoomLobbyProps {
  room: Room;
  session: Session | null;
  players: Player[];
  currentUserId: string;
  isHost: boolean;
  onStartSession: () => void;
  onLeaveRoom: () => void;
  onKickPlayer?: (playerId: string) => void;
}

export function RoomLobby({
  room,
  session,
  players,
  currentUserId,
  isHost,
  onStartSession,
  onLeaveRoom,
  onKickPlayer,
}: RoomLobbyProps) {

  return (
    <div className="min-h-screen bg-background p-4 crt-scanlines">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="glass-card neon-border">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-3xl flex items-center justify-center gap-2">
              {room.name}
              {isHost && <Crown className="w-8 h-8 text-accent" />}
            </CardTitle>
            <CardDescription className="text-lg font-body">
              Room Code:{" "}
              <span className="font-mono text-2xl text-primary font-bold">
                {room.roomCode}
              </span>
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Players List */}
          <Card className="glass-card neon-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players ({players.length}/{room.maxPlayers})
              </CardTitle>
            </CardHeader>
            <CardContent
              className={`space-y-3 ${players.length > 6 ? "grid grid-cols-1 sm:grid-cols-2 gap-3 space-y-0" : "space-y-3"}`}
            >
              <AnimatePresence>
                {players.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                    className={`flex items-center justify-between gap-2 p-3 rounded-lg border transition-all duration-300 ${
                      player.id === currentUserId
                        ? "border-primary bg-primary/10 neon-border"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-full bg-secondary flex items-center justify-center">
                        <span className="text-sm font-bold font-body">
                          {player.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="font-body font-semibold truncate text-left cursor-default">
                              {player.name}
                              {player.id === currentUserId && (
                                <span className="ml-2 text-sm text-muted-foreground">
                                  (You)
                                </span>
                              )}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-body">{player.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {player.id === room.hostId && (
                        <Badge variant="secondary" className="font-body">
                          <Crown className="w-3 h-3 mr-1" />
                          Host
                        </Badge>
                      )}
                      {isHost &&
                        player.id !== currentUserId &&
                        player.id !== room.hostId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onKickPlayer?.(player.id);
                            }}
                            className="p-1 rounded hover:bg-red-100 hover:text-red-500 transition-colors"
                            title="Kick player"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {players.length === 0 && (
                <p className="text-center text-muted-foreground font-body py-8">
                  No players in room yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Game Settings */}
          <Card className="glass-card neon-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl">
                Game Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {session && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-body">Total Rounds:</span>
                    <span className="font-body font-bold">
                      {session.status === "waiting" ? players.length : session.totalRounds}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-body">Current Round:</span>
                    <span className="font-body font-bold">
                      {session.currentRound}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-body">Status:</span>
                    <Badge
                      variant={
                        session.status === "waiting" ? "secondary" : "default"
                      }
                      className="font-body"
                    >
                      {session.status}
                    </Badge>
                  </div>
                </>
              )}

              <div className="pt-4 space-y-2">
                {isHost ? (
                  <>
                    <Button
                      onClick={onStartSession}
                      className="w-full gaming-button"
                      disabled={
                        !session ||
                        session.status !== "waiting" ||
                        players.length < 2
                      }
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {session?.status === "playing"
                        ? "Game in Progress"
                        : "Start Game"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center font-body">
                      Need at least 2 players to start
                    </p>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground font-body">
                      Waiting for the host to start the game...
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leave Room Button */}
        <div className="text-center">
          <Button variant="outline" onClick={onLeaveRoom} className="font-body">
            Leave Room
          </Button>
        </div>
      </div>
    </div>
  );
}
