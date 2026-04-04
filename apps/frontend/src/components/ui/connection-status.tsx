import { Wifi, WifiOff } from "lucide-react";
import { Badge } from "./badge";
import { useWebSocketStore } from "@/store";

export function ConnectionStatus() {
  const { isConnected, error } = useWebSocketStore();

  return (
    <div className="fixed top-4 right-4 z-50">
      {isConnected ? (
        <Badge
          variant="secondary"
          className="gap-2 bg-green-100 text-green-800"
        >
          <Wifi className="w-4 h-4" />
          Connected
        </Badge>
      ) : error ? (
        <Badge variant="destructive" className="gap-2">
          <WifiOff className="w-4 h-4" />
          {error}
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-2">
          <WifiOff className="w-4 h-4" />
          Connecting...
        </Badge>
      )}
    </div>
  );
}
