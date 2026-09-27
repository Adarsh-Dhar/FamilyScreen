import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { addConnectionLegacy as addConnection, removeConnectionLegacy as removeConnection, broadcastLegacy as broadcast } from "./lib/sports-socket";
import { pollLiveMatches, pollLiveGames, type MatchState, type GameState, addCommentaryToMatch as addCommentary } from "./lib/sports-data";
import { generateCommentary, type CommentaryContext } from "./lib/gemini";
import { getAllSports, type SportId } from "./lib/sports/registry";

const rawPort = process.env["PORT"] || "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
const webSocketServer = new WebSocketServer({ server, path: "/ws" });

webSocketServer.on("connection", (socket) => {
  let gameId = "";
  let sportId = "football" as const;
  socket.on("message", (message) => {
    try {
      const payload = JSON.parse(message.toString()) as { type?: string; gameId?: string; matchId?: string; sportId?: string };
      if (payload.type === "register" && (payload.gameId || payload.matchId)) {
        gameId = payload.gameId || payload.matchId || "";
        sportId = (payload.sportId as string) || "football";
        addConnection(sportId as any, gameId, socket);
        socket.send(JSON.stringify({ type: "registered", gameId, sportId }));
      }
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid socket message." }));
    }
  });
  socket.on("close", () => {
    if (gameId) removeConnection(sportId as any, gameId, socket);
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
    addCommentary("football", matchId, commentary);
    broadcast(matchId, { type: "commentary", matchId, commentary });
  }
}

async function handleGameUpdate(gameId: string, state: GameState) {
  broadcast(gameId, { type: "game_update", gameId, state });
  
  // Commentary generation only for football
  if (state.sportId === "football") {
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
      addCommentary(state.sportId, gameId, commentary);
      broadcast(gameId, { type: "commentary", gameId, commentary });
    }
  }
}

const POLL_INTERVAL_MS = 60000;

async function startPolling() {
  logger.info("Starting live match polling");
  
  // Poll for all sports
  const allSports = getAllSports();
  
  // Start football polling (legacy)
  await pollLiveMatches(handleMatchUpdate);
  
  // Start multi-sport polling for all sports
  for (const sport of allSports) {
    try {
      await pollLiveGames(sport.id, handleGameUpdate);
      logger.info(`Started polling for ${sport.label}`);
    } catch (error) {
      logger.error({ sport: sport.id, error }, `Failed to start polling for ${sport.label}`);
    }
  }
  
  // Set up interval polling for all sports
  setInterval(async () => {
    // Legacy football polling
    await pollLiveMatches(handleMatchUpdate);
    
    // Multi-sport polling
    for (const sport of allSports) {
      try {
        await pollLiveGames(sport.id, handleGameUpdate);
      } catch (error) {
        logger.error({ sport: sport.id, error }, `Failed to poll ${sport.label}`);
      }
    }
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
