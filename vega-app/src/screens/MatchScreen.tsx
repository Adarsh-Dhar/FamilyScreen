import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, BackHandler } from "react-native";
import { Focusable } from "../components/Focusable";
import { colors } from "../theme";
import { getGameState } from "../api";
import type { SportId, GameState, GameSummary, CommentaryEntry } from "../types";
import { useGameSocket } from "../useMatchSocket";

interface GameScreenProps {
  sportId: SportId;
  hasPredictions: boolean;
  game: GameSummary;
  onBack: () => void;
}

export default function GameScreen({ sportId, hasPredictions, game, onBack }: GameScreenProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGameState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportId, game.gameId]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => backHandler.remove();
  }, [onBack]);

  async function loadGameState() {
    try {
      const state = await getGameState(sportId, game.gameId);
      setGameState(state);
    } catch (error) {
      console.error("Failed to load game state:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleGameUpdate = (updatedState: GameState) => {
    setGameState(updatedState);
  };

  const handleCommentary = (commentary: CommentaryEntry) => {
    if (gameState) {
      setGameState({
        ...gameState,
        commentary: [...gameState.commentary, commentary],
      });
    }
  };

  useGameSocket(sportId, game.gameId, handleGameUpdate, handleCommentary);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Game not found</Text>
        <Focusable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back to Games</Text>
        </Focusable>
      </View>
    );
  }

  const showPredictions = hasPredictions;
  const homeProb = (gameState.currentWinProbability?.home ?? 0) * 100;
  const awayProb = (gameState.currentWinProbability?.away ?? 0) * 100;
  const drawProb = (gameState.currentWinProbability?.draw ?? 0) * 100;
  const hasDraw = drawProb > 0;

  // For individual sports (MMA, F1), use different labels
  const isIndividualSport = sportId === "mma" || sportId === "formula1";
  const homeLabel = isIndividualSport ? "Competitor 1" : "Home";
  const awayLabel = isIndividualSport ? "Competitor 2" : "Away";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Focusable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Focusable>
        <Text style={styles.competition}>{gameState.competition}</Text>
      </View>

      <View style={styles.scoreSection}>
        <Text style={styles.teamName}>{gameState.homeTeam}</Text>
        <View style={styles.scoreBox}>
          <Text style={styles.score}>
            {gameState.homeScore} - {gameState.awayScore}
          </Text>
          <Text style={styles.time}>
            {gameState.periodLabel}
          </Text>
        </View>
        <Text style={styles.teamName}>{gameState.awayTeam}</Text>
      </View>

      {showPredictions && (
        <View style={styles.probabilitySection}>
          <Text style={styles.probabilityLabel}>AI Prediction</Text>
          
          {gameState.aiPredictionStatus === "loading" && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Analyzing match data...</Text>
            </View>
          )}
          
          {gameState.aiPredictionStatus === "unavailable" && (
            <View style={styles.unavailableContainer}>
              <Text style={styles.unavailableText}>Prediction unavailable</Text>
              <Text style={styles.unavailableSubtext}>Not enough data available</Text>
            </View>
          )}
          
          {gameState.aiPredictionStatus === "ready" && gameState.aiPrediction && (
            <>
              <View style={styles.probabilityBar}>
                <View
                  style={[
                    styles.probabilityFill,
                    { width: `${homeProb}%`, backgroundColor: "#0074B8" },
                  ]}
                />
                {hasDraw && (
                  <View
                    style={[
                      styles.probabilityFill,
                      { width: `${drawProb}%`, backgroundColor: "#888888" },
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.probabilityFill,
                    { width: `${awayProb}%`, backgroundColor: "#FF6200" },
                  ]}
                />
              </View>
              <View style={styles.probabilityLabels}>
                <Text style={styles.probabilityText}>{homeProb.toFixed(0)}%</Text>
                {hasDraw && <Text style={styles.probabilityText}>{drawProb.toFixed(0)}%</Text>}
                <Text style={styles.probabilityText}>{awayProb.toFixed(0)}%</Text>
              </View>
              <View style={styles.probabilityTeamLabels}>
                <Text style={styles.teamLabel}>{homeLabel}</Text>
                {hasDraw && <Text style={styles.teamLabel}>Draw</Text>}
                <Text style={styles.teamLabel}>{awayLabel}</Text>
              </View>
              <View style={styles.rationaleContainer}>
                <Text style={styles.rationaleText}>{gameState.aiPrediction.rationale}</Text>
                <Text style={styles.confidenceText}>
                  Confidence: {gameState.aiPrediction.confidence.toUpperCase()}
                </Text>
                <Text style={styles.dataSourcesText}>
                  Based on: {gameState.aiPrediction.dataSources.join(", ")}
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      <View style={styles.commentarySection}>
        <Text style={styles.commentaryHeader}>Live Commentary</Text>
        <ScrollView style={styles.commentaryScroll}>
          {gameState.commentary.length === 0 ? (
            <Text style={styles.noCommentary}>No commentary yet</Text>
          ) : (
            gameState.commentary.map((entry: CommentaryEntry) => (
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
  loadingContainer: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  unavailableContainer: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  unavailableText: {
    color: "#FF6200",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  unavailableSubtext: {
    color: "#666",
    fontSize: 14,
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
  probabilityTeamLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  teamLabel: {
    color: "#888",
    fontSize: 12,
  },
  rationaleContainer: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  rationaleText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  confidenceText: {
    color: "#FF6200",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  dataSourcesText: {
    color: "#666",
    fontSize: 11,
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