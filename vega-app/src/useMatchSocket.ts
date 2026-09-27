import { useEffect, useRef } from "react";
import { WS_URL } from "./config";
import type { MatchState, CommentaryEntry } from "./types";

// WebSocket hook for live match updates
// Registers with matchId and receives match_update and commentary frames
export function useMatchSocket(
  matchId: string,
  onMatchUpdate: (state: MatchState) => void,
  onCommentary: (commentary: CommentaryEntry) => void
) {
  const onMatchUpdateRef = useRef(onMatchUpdate);
  const onCommentaryRef = useRef(onCommentary);

  useEffect(() => {
    onMatchUpdateRef.current = onMatchUpdate;
    onCommentaryRef.current = onCommentary;
  }, [onMatchUpdate, onCommentary]);

  useEffect(() => {
    if (!matchId) return;
    let socket: WebSocket | null = null;
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (disposed) return;
      socket = new WebSocket(WS_URL);
      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: "register", matchId }));
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === "match_update" && payload.state) {
            onMatchUpdateRef.current(payload.state);
          } else if (payload.type === "commentary" && payload.commentary) {
            onCommentaryRef.current(payload.commentary);
          }
        } catch (error) {
          // Ignore malformed frames and keep the connection alive.
          console.error("WebSocket message error:", error);
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
  }, [matchId]);
}
