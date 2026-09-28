import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { addConnection, removeConnection, broadcast } from "./lib/sports-socket";
import { pollLiveGames, addCommentary, setUpdateHandler, isSportActive, touchSport, type GameState } from "./lib/sports-data";
import { generateCommentary } from "./lib/gemini";
import { getTeamGameSports, SPORTS_REGISTRY, type SportId } from "./lib/sports/registry";

const port = Number(process.env["PORT"] || "8080");
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);

const server = createServer(app);
const webSocketServer = new WebSocketServer({ server, path: "/ws" });

webSocketServer.on("connection", (socket) => {
  let registered: { sportId: SportId; gameId: string } | null = null;

  socket.on("message", (message) => {
    try {
      const payload = JSON.parse(message.toString()) as { type?: string; gameId?: string; sportId?: string };
      if (payload.type !== "register" || !payload.gameId) return;
      const sportId = (payload.sportId ?? "football") as SportId;
      if (!(sportId in SPORTS_REGISTRY)) throw new Error("unknown sport");
      if (registered) removeConnection(registered.sportId, registered.gameId, socket);
      registered = { sportId, gameId: payload.gameId };
      touchSport(sportId);
      addConnection(sportId, payload.gameId, socket);
      socket.send(JSON.stringify({ type: "registered", gameId: payload.gameId, sportId }));
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid socket message." }));
    }
  });

  socket.on("close", () => {
    if (registered) removeConnection(registered.sportId, registered.gameId, socket);
  });
});

/** Commentary fires on a score change in ANY sport ("goal" for football, "score" for the rest). */
const isScoring = (type: string): boolean => type === "goal" || type === "score";

async function handleGameUpdate(gameId: string, state: GameState): Promise<void> {
  const { sportId } = state;
  broadcast(sportId, gameId, { type: "game_update", gameId, sportId, state });

  const last = state.events[state.events.length - 1];
  if (!last || !isScoring(last.type) || state.status !== "live") return;

  const text = await generateCommentary({
    sport: SPORTS_REGISTRY[sportId].label,
    homeTeam: state.homeTeam,
    awayTeam: state.awayTeam,
    homeScore: state.homeScore,
    awayScore: state.awayScore,
    elapsedMinutes: state.elapsedMinutes,
    periodLabel: state.periodLabel,
    recentEvents: state.events.slice(-3).map((e) => e.description),
    scoreChange: true,
  });
  const entry = addCommentary(sportId, gameId, text);
  if (entry) broadcast(sportId, gameId, { type: "commentary", gameId, sportId, commentary: entry });
}

const POLL_INTERVAL_MS = Number(process.env["POLL_INTERVAL_MS"] ?? 120_000);

/** Poll only team sports somebody is looking at (F1/MMA have no live=all). Sequential so sports don't fire at once. */
async function pollAll(): Promise<void> {
  for (const sport of getTeamGameSports().filter((s) => isSportActive(s.id))) {
    try {
      await pollLiveGames(sport.id);
    } catch (error) {
      logger.error({ sport: sport.id, error }, `Failed to poll ${sport.label}`);
    }
  }
}

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

setUpdateHandler((id, state) => void handleGameUpdate(id, state));

server.listen(port, () => {
  logger.info({ port }, "Server listening");
  setInterval(() => void pollAll(), POLL_INTERVAL_MS);
});
