import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { addConnection, removeConnection, broadcast } from "./lib/sports-socket";
import { pollLiveMatches, type MatchState, addCommentary } from "./lib/sports-data";
import { generateCommentary, type CommentaryContext } from "./lib/gemini";

const rawPort = process.env["PORT"] || "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
const webSocketServer = new WebSocketServer({ server, path: "/ws" });

webSocketServer.on("connection", (socket) => {
  let matchId = "";
  socket.on("message", (message) => {
    try {
      const payload = JSON.parse(message.toString()) as { type?: string; matchId?: string };
      if (payload.type === "register" && payload.matchId) {
        matchId = payload.matchId;
        addConnection(matchId, socket);
        socket.send(JSON.stringify({ type: "registered", matchId }));
      }
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid socket message." }));
    }
  });
  socket.on("close", () => {
    if (matchId) removeConnection(matchId, socket);
  });
});

async function handleMatchUpdate(matchId: string, state: MatchState) {
  broadcast(matchId, { type: "match_update", matchId, state });
  
  const recentEvents = state.events.slice(-3).map(e => e.description);
  const scoreChanged = state.events.length > 0 && state.events[state.events.length - 1].type === "goal";
  
  if (scoreChanged) {
    const context: CommentaryContext = {
      homeTeam: state.homeTeam,
      awayTeam: state.awayTeam,
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      elapsedMinutes: state.elapsedMinutes,
      recentEvents,
      scoreChange: scoreChanged,
    };
    
    const commentary = await generateCommentary(context);
    addCommentary(matchId, commentary);
    broadcast(matchId, { type: "commentary", matchId, commentary });
  }
}

const POLL_INTERVAL_MS = 60000;

async function startPolling() {
  logger.info("Starting live match polling");
  await pollLiveMatches(handleMatchUpdate);
  setInterval(async () => {
    await pollLiveMatches(handleMatchUpdate);
  }, POLL_INTERVAL_MS);
}

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

server.listen(port, () => {
  logger.info({ port }, "Server listening");
  startPolling().catch((err) => {
    logger.error({ err }, "Failed to start polling");
  });
});
