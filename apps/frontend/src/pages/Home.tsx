import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NameEntryModal } from "@/components/player/NameEntryModal";
import { RoomCodeInput } from "@/components/room/RoomCodeInput";
import { Crown, Users, Play, ArrowRight } from "lucide-react";
import { useRegisterPlayer } from "@/api/players";
import { useCreateRoom, useJoinRoom } from "@/api/rooms";
import { usePlayerStore, useWebSocketStore } from "@/store";
import { useNavigate } from "react-router-dom";

export function Home() {
  const [showNameModal, setShowNameModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [totalRounds, setTotalRounds] = useState("10");
  const [joinError, setJoinError] = useState("");

  const {
    player,
    isAuthenticated,
    setPlayer: setPlayerInStore,
    logout,
  } = usePlayerStore();
  const { disconnect } = useWebSocketStore();
  const registerPlayerMutation = useRegisterPlayer();
  const createRoomMutation = useCreateRoom();
  const joinRoomMutation = useJoinRoom();
  const navigate = useNavigate();

  const isLoading =
    registerPlayerMutation.isPending ||
    createRoomMutation.isPending ||
    joinRoomMutation.isPending;

  // Check for existing player on mount
  useEffect(() => {
    if (!isAuthenticated && !showNameModal) {
      setShowNameModal(true);
    }
  }, [isAuthenticated, showNameModal]);

  const handlePlayerRegister = async (name: string) => {
    try {
      const result = await registerPlayerMutation.mutateAsync(name);
      setPlayerInStore(result.player);
      setShowNameModal(false);
    } catch (error) {
      console.error("Failed to register player:", error);
    }
  };

  const handleCreateRoom = async () => {
    if (!player) return;

    try {
      const result = await createRoomMutation.mutateAsync({
        hostName: player.name,
        roomName: roomName || `${player.name}'s Room`,
        totalRounds: parseInt(totalRounds),
      });

      localStorage.setItem(
        "current-room",
        JSON.stringify({
          room: result.room,
          session: result.session,
          isHost: true,
        }),
      );

      navigate(`/room/${result.room.roomCode}`);
    } catch (error) {
      console.error("Failed to create room:", error);
    }
  };

  const handleJoinRoom = async (code: string) => {
    if (!player) return;

    try {
      const result = await joinRoomMutation.mutateAsync({
        roomCode: code,
        playerName: player.name,
      });

      localStorage.setItem(
        "current-room",
        JSON.stringify({
          room: result.room,
          session: result.session,
          isHost: result.isHost,
        }),
      );

      navigate(`/room/${code}`);
      setShowJoinModal(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to join room";
      setJoinError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-background crt-scanlines">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="relative container mx-auto px-4 py-24">
          <div className="text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="hero-title">Three Card Poker</h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-body mt-6"
              >
                Experience the thrill of online multiplayer poker with friends.
                Create rooms, join games, and compete in exciting card matches!
              </motion.p>
            </motion.div>
            {isAuthenticated && player && (
              <div className="flex items-center justify-center gap-4">
                <Badge
                  variant="secondary"
                  className="text-lg py-2 px-4 font-body"
                >
                  Welcome back, {player.name}!
                </Badge>
                <Button
                  variant="ghost"
                  onClick={() => {
                    disconnect();
                    logout();
                  }}
                  className="font-body"
                >
                  Not you?
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Create Room Card */}
          <Card className="glass-card hover:shadow-2xl transition-all duration-300 hover:scale-105 neon-border">
            <CardHeader>
              <CardTitle className="font-heading text-2xl flex items-center gap-2">
                <Crown className="w-6 h-6 text-accent" />
                Create Room
              </CardTitle>
              <CardDescription className="font-body">
                Host your own game and invite friends to play
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomName" className="font-body">
                  Room Name (Optional)
                </Label>
                <Input
                  id="roomName"
                  placeholder={`${player?.name || "Host"}'s Room`}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="font-body"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rounds" className="font-body">
                  Number of Rounds
                </Label>
                <select
                  id="rounds"
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(e.target.value)}
                  className="w-full p-2 border rounded-md font-body"
                >
                  <option value="5">5 Rounds</option>
                  <option value="10">10 Rounds</option>
                  <option value="15">15 Rounds</option>
                  <option value="20">20 Rounds</option>
                </select>
              </div>
              <Button
                onClick={handleCreateRoom}
                disabled={!player || isLoading}
                className="w-full gaming-button"
              >
                {isLoading ? "Creating..." : "Create Room"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Join Room Card */}
          <Card className="glass-card hover:shadow-2xl transition-all duration-300 hover:scale-105 neon-border">
            <CardHeader>
              <CardTitle className="font-heading text-2xl flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Join Room
              </CardTitle>
              <CardDescription className="font-body">
                Enter a 6-digit code to join an existing game
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <span className="text-2xl font-mono font-bold text-primary">
                    000000
                  </span>
                </div>
                <p className="text-muted-foreground font-body">
                  Ask the room host for the code
                </p>
              </div>
              <Button
                onClick={() => setShowJoinModal(true)}
                disabled={!player}
                className="w-full gaming-button"
              >
                Join Room
                <Play className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-20 text-center">
          <h2 className="font-heading text-3xl mb-8">Game Features</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="space-y-2">
              <div className="text-4xl mb-4">🎴</div>
              <h3 className="font-heading text-xl">Real-time Gameplay</h3>
              <p className="text-muted-foreground font-body">
                Play with friends in real-time with smooth card animations
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="font-heading text-xl">Score Tracking</h3>
              <p className="text-muted-foreground font-body">
                Track your wins, losses, and climb the leaderboard
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="font-heading text-xl">Private Rooms</h3>
              <p className="text-muted-foreground font-body">
                Create private rooms with secure 6-digit codes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <NameEntryModal
        isOpen={showNameModal}
        onSubmit={handlePlayerRegister}
        isLoading={registerPlayerMutation.isPending}
      />

      <RoomCodeInput
        isOpen={showJoinModal}
        onJoin={handleJoinRoom}
        isLoading={isLoading}
        error={joinError}
        onClose={() => setShowJoinModal(false)}
      />
    </div>
  );
}
