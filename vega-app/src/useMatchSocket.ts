import { useEffect, useRef } from "react";
import { WS_URL } from "./config";
import type { MatchState, CommentaryEntry, GameState, SportId } from "./types";

// WebSocket hook for live game updates (multi-sport)
// Registers with sportId + gameId and receives game_update and commentary frames
export function useGameSocket(
  sportId: SportId,
  gameId: string,
  onGameUpdate: (state: GameState) => void,
  onCommentary: (commentary: CommentaryEntry) => void
) {
  const onGameUpdateRef = useRef(onGameUpdate);
  const onCommentaryRef = useRef(onCommentary);

  useEffect(() => {
    onGameUpdateRef.current = onGameUpdate;
    onCommentaryRef.current = onCommentary;
  }, [onGameUpdate, onCommentary]);

  useEffect(() => {
    if (!gameId || !sportId) return;
    let socket: WebSocket | null = null;
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (disposed) return;
      socket = new WebSocket(WS_URL);
      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: "register", sportId, gameId }));
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === "game_update" && payload.state) {
            onGameUpdateRef.current(payload.state);
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
  }, [sportId, gameId]);
}

// Legacy football WebSocket hook (for backward compatibility)
export function useMatchSocket(
  matchId: string,
  onMatchUpdate: (state: MatchState) => void,
  onCommentary: (commentary: CommentaryEntry) => void
) {
  return useGameSocket("football", matchId, onMatchUpdate, onCommentary);
}
