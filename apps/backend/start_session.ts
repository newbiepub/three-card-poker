import { SessionService } from "./src/services/sessionService.ts";
import { PresenceService } from "./src/services/presenceService.ts";

async function main() {
  const sessionId = "session-1hx0lcmvp";
  console.log("Starting session", sessionId);
  await SessionService.startSession(sessionId, 2, ["player-ly01f77n6"]);
  console.log("Session started!");
  
  // Set host presence as well
  await PresenceService.setOnline("oqqkzsism", "player-ly01f77n6");
  process.exit(0);
}

main().catch(console.error);
