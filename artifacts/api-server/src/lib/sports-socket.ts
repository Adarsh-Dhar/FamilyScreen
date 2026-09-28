import type { WebSocket } from "ws";
import type { SportId } from "./sports/registry";

const connections = new Map<string, Set<WebSocket>>();

const keyOf = (sportId: SportId, gameId: string): string => `${sportId}:${gameId}`;

export function addConnection(sportId: SportId, gameId: string, socket: WebSocket): void {
  const key = keyOf(sportId, gameId);
  const group = connections.get(key) ?? new Set<WebSocket>();
  group.add(socket);
  connections.set(key, group);
}

export function removeConnection(sportId: SportId, gameId: string, socket: WebSocket): void {
  const key = keyOf(sportId, gameId);
  const group = connections.get(key);
  group?.delete(socket);
  if (group?.size === 0) connections.delete(key);
}

export function broadcast(sportId: SportId, gameId: string, event: Record<string, unknown>): void {
  const group = connections.get(keyOf(sportId, gameId));
  if (!group) return;
  const message = JSON.stringify(event);
  for (const socket of group) {
    if (socket.readyState === 1) socket.send(message);
  }
}
