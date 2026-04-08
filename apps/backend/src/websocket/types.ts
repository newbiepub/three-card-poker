import type { ServerWebSocket } from "bun";

/** Typed WebSocket alias for Bun's WS without custom data */
export type Ws = ServerWebSocket<undefined>;

/** Per-connection metadata stored in connectionInfo map */
export interface WsConnectionInfo {
  roomCode: string;
  roomId: string;
  playerId: string;
  playerName: string;
}

/** Function signature for broadcasting to a room */
export type BroadcastFn = (
  roomCode: string,
  message: unknown,
  excludeWs?: Ws,
) => void;

/** Context passed to every WS handler */
export interface WsHandlerContext {
  ws: Ws;
  data: Record<string, unknown>;
  broadcast: BroadcastFn;
  connectionInfo: Map<Ws, WsConnectionInfo>;
  roomConnections: Map<
    string,
    Map<Ws, { playerId: string; playerName: string }>
  >;
}
