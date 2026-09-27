import type { WebSocket } from "ws";

const connections = new Map<string, Set<WebSocket>>();

export function addConnection(matchId: string, socket: WebSocket): void {
  const group = connections.get(matchId) ?? new Set<WebSocket>();
  group.add(socket);
  connections.set(matchId, group);
}

export function removeConnection(matchId: string, socket: WebSocket): void {
  const group = connections.get(matchId);
  group?.delete(socket);
  if (group?.size === 0) connections.delete(matchId);
}

export function broadcast(matchId: string, event: Record<string, unknown>): void {
  const group = connections.get(matchId);
  if (!group) return;
  const message = JSON.stringify(event);
  for (const socket of group) {
    if (socket.readyState === 1) socket.send(message);
  }
}
