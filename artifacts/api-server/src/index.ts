import app from "./app";
import { logger } from "./lib/logger";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { addConnection, removeConnection } from "./lib/family-socket";

const rawPort = process.env["PORT"] || "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
const webSocketServer = new WebSocketServer({ server, path: "/ws" });

webSocketServer.on("connection", (socket) => {
  let parentAccountId = "";
  socket.on("message", (message) => {
    try {
      const payload = JSON.parse(message.toString()) as { type?: string; parentAccountId?: string };
      if (payload.type === "register" && payload.parentAccountId) {
        parentAccountId = payload.parentAccountId;
        addConnection(parentAccountId, socket);
        socket.send(JSON.stringify({ type: "registered", parentAccountId }));
      }
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid socket message." }));
    }
  });
  socket.on("close", () => {
    if (parentAccountId) removeConnection(parentAccountId, socket);
  });
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
