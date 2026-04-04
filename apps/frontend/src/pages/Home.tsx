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
import { NameEntryModal } from "@/components/player/NameEntryModal";
import { RoomCodeInput } from "@/components/room/RoomCodeInput";
import { Crown, Users, ArrowRight, Layers, Smile, ShieldCheck, Wifi } from "lucide-react";
import { useRegisterPlayer } from "@/api/players";
import { useCreateRoom, useJoinRoom } from "@/api/rooms";
import { usePlayerStore, useWebSocketStore } from "@/store";
import { useNavigate } from "react-router-dom";

export function Home() {
  const [showNameModal, setShowNameModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomName, setRoomName] = useState("");
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
        totalRounds: 10, // Will be overridden by v2 rule: rounds = number of players
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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="relative container mx-auto px-4 py-[var(--space-3xl)]">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
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
                className="text-xl text-muted-foreground font-body mt-6"
              >
                Private rooms. Real-time multiplayer. Vietnamese three-card poker with friends.
              </motion.p>
            </motion.div>
            
            {isAuthenticated && player && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center pt-6"
              >
                <div className="group relative inline-flex items-center gap-4 px-6 py-3 rounded-full bg-white/60 backdrop-blur-xl border border-primary/20 shadow-[0_8px_32px_rgba(13,148,136,0.15)] hover:shadow-[0_8px_32px_rgba(234,88,12,0.2)] transition-all duration-500 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                    </span>
                    <span className="text-secondary-foreground font-body font-medium">
                      Welcome back, <strong className="text-primary">{player.name}</strong>
                    </span>
                  </div>

                  <div className="relative w-px h-5 bg-primary/20"></div>

                  <button
                    onClick={() => {
                      disconnect();
                      logout();
                    }}
                    className="relative text-sm font-bold text-accent hover:text-orange-600 transition-colors flex items-center gap-1 group/btn"
                  >
                    Not you?
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-[var(--space-3xl)]">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Create Room Card */}
          <Card className="transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <CardTitle className="font-heading text-2xl flex items-center gap-2">
                <Crown className="w-6 h-6 text-accent" />
                Host a Game
              </CardTitle>
              <CardDescription className="font-body text-base">
                Set up a private room and invite friends with a code.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col justify-between h-[calc(100%-80px)]">
              <div className="space-y-4">
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
              </div>
              
              <div className="pt-4 pt-auto mt-auto">
                <Button
                  onClick={handleCreateRoom}
                  disabled={!player || isLoading}
                  className="w-full gaming-button text-white"
                >
                  {isLoading ? "Creating..." : "Create Room"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Join Room Card */}
          <Card className="transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <CardTitle className="font-heading text-2xl flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Join a Game
              </CardTitle>
              <CardDescription className="font-body text-base">
                Enter the 6-digit room code from your host.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col justify-between h-[calc(100%-80px)]">
              <div className="flex-grow flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="flex gap-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-8 h-10 border-2 border-dashed border-primary/30 rounded-md flex items-center justify-center bg-primary/5"></div>
                    ))}
                </div>
                <p className="text-muted-foreground font-body text-sm mt-4">
                  Ask the room host for the code
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Button
                  onClick={() => setShowJoinModal(true)}
                  disabled={!player}
                  className="w-full gaming-button text-white"
                >
                  Join Room
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-[var(--space-3xl)] text-center">
          <h2 className="font-heading text-3xl mb-12">Powered by Bài Cào Engine</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="space-y-3 flex flex-col items-center">
              <div className="p-4 rounded-full bg-primary/10 mb-2 text-primary shadow-[0_0_15px_rgba(13,148,136,0.15)]">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-xl">Swipe to Reveal</h3>
              <p className="text-muted-foreground font-body text-sm max-w-xs">
                Gesture-driven card reveal animations tailored for the perfect mobile experience.
              </p>
            </div>
            <div className="space-y-3 flex flex-col items-center">
              <div className="p-4 rounded-full bg-primary/10 mb-2 text-primary shadow-[0_0_15px_rgba(13,148,136,0.15)]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-xl">Fair & Protected</h3>
              <p className="text-muted-foreground font-body text-sm max-w-xs">
                Shuffled deck rules (Max 17 players) with backend mutex locking for fast, reliable pile selection.
              </p>
            </div>
            <div className="space-y-3 flex flex-col items-center">
              <div className="p-4 rounded-full bg-primary/10 mb-2 text-primary shadow-[0_0_15px_rgba(13,148,136,0.15)]">
                <Smile className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-xl">Live Reactions</h3>
              <p className="text-muted-foreground font-body text-sm max-w-xs">
                Send reactive stickers and memes instantly into the room after every hand.
              </p>
            </div>
            <div className="space-y-3 flex flex-col items-center">
              <div className="p-4 rounded-full bg-primary/10 mb-2 text-primary shadow-[0_0_15px_rgba(13,148,136,0.15)]">
                <Wifi className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-xl">Offline Resilience</h3>
              <p className="text-muted-foreground font-body text-sm max-w-xs">
                Auto-reconnect, secure session recovery, and auto-play logic keeps the game flowing.
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
