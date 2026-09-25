import { useEffect, useRef } from "react";
import { WS_URL } from "./config";
import type { ParentDecisionFrame } from "./types";

// Mirrors useTvDecisionSocket in the web app's App.tsx:
// registers this parentAccountId with the server, then waits for a
// parent_decision frame that matches the pending requestId.
export function useTvDecisionSocket(
  parentAccountId: string,
  requestId: string,
  onDecision: (decision: "approved" | "denied") => void
) {
  const onDecisionRef = useRef(onDecision);
  useEffect(() => {
    onDecisionRef.current = onDecision;
  }, [onDecision]);

  useEffect(() => {
    if (!parentAccountId || !requestId) return;
    let socket: WebSocket | null = null;
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (disposed) return;
      socket = new WebSocket(WS_URL);
      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: "register", parentAccountId }));
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as Partial<ParentDecisionFrame>;
          if (
            payload.type === "parent_decision" &&
            payload.requestId === requestId &&
            payload.decision
          ) {
            onDecisionRef.current(payload.decision);
          }
        } catch {
          // Ignore malformed frames and keep the connection alive.
        }
      };
      socket.onclose = () => {
        if (!disposed) reconnectTimer = setTimeout(connect, 1200);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [parentAccountId, requestId]);
}
