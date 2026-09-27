import type { WebSocket } from "ws";
import type { SportId } from "./sports/registry";

const connections = new Map<string, Set<WebSocket>>();

function getConnectionKey(sportId: SportId, gameId: string): string {
  return `${sportId}:${gameId}`;
}

export function addConnection(sportId: SportId, gameId: string, socket: WebSocket): void {
  const key = getConnectionKey(sportId, gameId);
  const group = connections.get(key) ?? new Set<WebSocket>();
  group.add(socket);
  connections.set(key, group);
}

export function removeConnection(sportId: SportId, gameId: string, socket: WebSocket): void {
  const key = getConnectionKey(sportId, gameId);
  const group = connections.get(key);
  group?.delete(socket);
  if (group?.size === 0) connections.delete(key);
}

export function broadcast(sportId: SportId, gameId: string, event: Record<string, unknown>): void {
  const key = getConnectionKey(sportId, gameId);
  const group = connections.get(key);
  if (!group) return;
  const message = JSON.stringify(event);
  for (const socket of group) {
    if (socket.readyState === 1) socket.send(message);
  }
}

// Backward compatibility for football
export function addConnectionLegacy(matchId: string, socket: WebSocket): void {
  addConnection("football", matchId, socket);
}

export function removeConnectionLegacy(matchId: string, socket: WebSocket): void {
  removeConnection("football", matchId, socket);
}

export function broadcastLegacy(matchId: string, event: Record<string, unknown>): void {
  broadcast("football", matchId, event);
}
