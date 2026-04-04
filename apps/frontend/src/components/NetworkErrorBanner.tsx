import { Button } from "./ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export function NetworkErrorBanner() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-6 neon-border border-destructive/50">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-heading text-2xl">Connection Lost</h2>
          <p className="text-muted-foreground font-body">
            Unable to connect to the game server. Please check your internet
            connection and try again.
          </p>
        </div>

        <Button
          onClick={handleRefresh}
          className="w-full gaming-button"
          size="lg"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
