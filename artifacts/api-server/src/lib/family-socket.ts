import type { WebSocket } from "ws";

const connections = new Map<string, Set<WebSocket>>();

export function addConnection(parentAccountId: string, socket: WebSocket): void {
  const group = connections.get(parentAccountId) ?? new Set<WebSocket>();
  group.add(socket);
  connections.set(parentAccountId, group);
}

export function removeConnection(parentAccountId: string, socket: WebSocket): void {
  const group = connections.get(parentAccountId);
  group?.delete(socket);
  if (group?.size === 0) connections.delete(parentAccountId);
}

export function broadcast(parentAccountId: string, event: Record<string, unknown>): void {
  const group = connections.get(parentAccountId);
  if (!group) return;
  const message = JSON.stringify(event);
  for (const socket of group) {
    if (socket.readyState === 1) socket.send(message);
  }
}