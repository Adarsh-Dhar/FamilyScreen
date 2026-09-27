import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, BackHandler } from "react-native";
import { colors } from "../theme";
import { getMatchState } from "../api";
import { useMatchSocket } from "../useMatchSocket";
import type { MatchState, CommentaryEntry } from "../types";

interface MatchScreenProps {
  matchId: string;
  onBack: () => void;
}

export default function MatchScreen({ matchId, onBack }: MatchScreenProps) {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatchState();
  }, [matchId]);

  // Handle hardware back button from remote
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true; // Prevent default behavior (exiting app)
    });

    return () => backHandler.remove();
  }, [onBack]);

  async function loadMatchState() {
    try {
      const state = await getMatchState(matchId);
      setMatchState(state);
    } catch (error) {
      console.error("Failed to load match state:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleMatchUpdate = (updatedState: MatchState) => {
    setMatchState(updatedState);
  };

  const handleCommentary = (commentary: CommentaryEntry) => {
    if (matchState) {
      setMatchState({
        ...matchState,
        commentary: [...matchState.commentary, commentary],
      });
    }
  };

  // Use WebSocket for live updates
  useMatchSocket(matchId, handleMatchUpdate, handleCommentary);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading match...</Text>
      </View>
    );
  }

  if (!matchState) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Match not found</Text>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back to Matches</Text>
        </Pressable>
      </View>
    );
  }

  const homeProb = matchState.currentWinProbability.home * 100;
  const awayProb = matchState.currentWinProbability.away * 100;

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.competition}>{matchState.competition}</Text>
      </View>

      {/* Score and time */}
      <View style={styles.scoreSection}>
        <Text style={styles.teamName}>{matchState.homeTeam}</Text>
        <View style={styles.scoreBox}>
          <Text style={styles.score}>
            {matchState.homeScore} - {matchState.awayScore}
          </Text>
          <Text style={styles.time}>
            {matchState.status === 'live' && matchState.elapsedMinutes > 0 
              ? `${matchState.elapsedMinutes}'` 
              : matchState.status === 'live' 
                ? 'Live' 
                : matchState.status === 'finished' 
                  ? 'FT' 
                  : 'NS'}
          </Text>
        </View>
        <Text style={styles.teamName}>{matchState.awayTeam}</Text>
      </View>

      {/* Win probability bar */}
      <View style={styles.probabilitySection}>
        <Text style={styles.probabilityLabel}>Win Probability</Text>
        <View style={styles.probabilityBar}>
          <View
            style={[
              styles.probabilityFill,
              { width: `${homeProb}%`, backgroundColor: "#0074B8" },
            ]}
          />
          <View
            style={[
              styles.probabilityFill,
              { width: `${awayProb}%`, backgroundColor: "#FF6200" },
            ]}
          />
        </View>
        <View style={styles.probabilityLabels}>
          <Text style={styles.probabilityText}>{homeProb.toFixed(0)}%</Text>
          <Text style={styles.probabilityText}>{awayProb.toFixed(0)}%</Text>
        </View>
      </View>

      {/* Commentary feed */}
      <View style={styles.commentarySection}>
        <Text style={styles.commentaryHeader}>Live Commentary</Text>
        <ScrollView style={styles.commentaryScroll}>
          {matchState.commentary.length === 0 ? (
            <Text style={styles.noCommentary}>No commentary yet</Text>
          ) : (
            matchState.commentary.map((entry: CommentaryEntry) => (
              <View key={entry.id} style={styles.commentaryItem}>
                <Text style={styles.commentaryTime}>
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Text style={styles.commentaryText}>{entry.text}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingText: {
    color: colors.text,
    fontSize: 24,
    textAlign: "center",
    marginTop: 100,
  },
  errorText: {
    color: colors.text,
    fontSize: 24,
    textAlign: "center",
    marginTop: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  backButtonText: {
    color: "#FF6200",
    fontSize: 18,
    fontWeight: "bold",
  },
  competition: {
    color: "#888",
    fontSize: 16,
  },
  scoreSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    padding: 20,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
  },
  teamName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  scoreBox: {
    alignItems: "center",
    marginHorizontal: 20,
  },
  score: {
    color: "#FF6200",
    fontSize: 36,
    fontWeight: "bold",
  },
  time: {
    color: "#FF6200",
    fontSize: 18,
    marginTop: 4,
    fontWeight: "600",
  },
  probabilitySection: {
    marginBottom: 30,
  },
  probabilityLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  probabilityBar: {
    height: 30,
    flexDirection: "row",
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#1a1a2e",
  },
  probabilityFill: {
    height: "100%",
  },
  probabilityLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  probabilityText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  commentarySection: {
    flex: 1,
  },
  commentaryHeader: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  commentaryScroll: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
  },
  noCommentary: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
  commentaryItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  commentaryTime: {
    color: "#888",
    fontSize: 12,
    marginBottom: 4,
  },
  commentaryText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
});