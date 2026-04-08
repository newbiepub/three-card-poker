import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import { Home } from "./pages/Home";
import { RoomLobbyPage } from "./pages/Room.tsx";
import { GamePage } from "./pages/Game.tsx";
import { useAuthCheck } from "./hooks/useAuthCheck";
import { NetworkErrorBanner } from "./components/NetworkErrorBanner";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  const { isChecking, networkError } = useAuthCheck();

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (networkError) {
    return <NetworkErrorBanner />;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Toaster position="top-center" richColors theme="dark" />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomCode" element={<RoomLobbyPage />} />
          <Route path="/game/:roomCode" element={<GamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </TooltipProvider>
  );
}

export default App;
