import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, BackHandler, ActivityIndicator } from "react-native";
import { Focusable } from "../components/Focusable";
import { colors } from "../theme";
import { getF1RaceResults } from "../api";
import type { GameSummary, F1RaceData, F1RaceResult } from "../types";

interface Props {
  game: GameSummary;
  onBack: () => void;
}

export default function F1RaceScreen({ game, onBack }: Props) {
  const [raceData, setRaceData] = useState<F1RaceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  useEffect(() => {
    loadRaceData();
  }, [game.gameId]);

  async function loadRaceData() {
    try {
      const response = await getF1RaceResults(game.gameId);
      // TODO: Parse the actual API response into F1RaceData format
      // For now, create mock data based on the game
      const mockData: F1RaceData = {
        circuit: game.awayTeam,
        laps: 0,
        winner: undefined,
        fastestLap: undefined,
        podium: [],
        classification: [],
      };
      setRaceData(mockData);
    } catch (error) {
      console.error("Failed to load race data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6200" />
        <Text style={styles.loadingText}>Loading race data...</Text>
      </View>
    );
  }

  if (!raceData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Race data not available</Text>
        <Focusable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </Focusable>
      </View>
    );
  }

  const podium = raceData.podium.slice(0, 3);
  const classification = raceData.classification;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Focusable style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </Focusable>
        <Text style={styles.title}>{game.competition}</Text>
      </View>

      <View style={styles.circuitInfo}>
        <Text style={styles.circuitName}>{raceData.circuit}</Text>
        {raceData.laps > 0 && <Text style={styles.lapsInfo}>{raceData.laps} Laps</Text>}
      </View>

      {podium.length > 0 && (
        <View style={styles.podiumSection}>
          <Text style={styles.sectionTitle}>Podium</Text>
          <View style={styles.podiumContainer}>
            {podium.map((result, index) => (
              <View key={result.position} style={[styles.podiumPlace, styles[`podium${index + 1}`]]}>
                <Text style={styles.positionBadge}>{result.position}</Text>
                <Text style={styles.driverName}>{result.driver}</Text>
                <Text style={styles.teamName}>{result.team}</Text>
                <Text style={styles.timeText}>{result.time}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {raceData.winner && (
        <View style={styles.winnerSection}>
          <Text style={styles.winnerLabel}>Race Winner</Text>
          <Text style={styles.winnerName}>{raceData.winner}</Text>
        </View>
      )}

      {raceData.fastestLap && (
        <View style={styles.fastestLapSection}>
          <Text style={styles.sectionTitle}>Fastest Lap</Text>
          <Text style={styles.fastestLapDriver}>{raceData.fastestLap.driver}</Text>
          <Text style={styles.fastestLapTeam}>{raceData.fastestLap.team}</Text>
          <Text style={styles.fastestLapTime}>{raceData.fastestLap.time} (Lap {raceData.fastestLap.lap})</Text>
        </View>
      )}

      {classification.length > 0 && (
        <View style={styles.classificationSection}>
          <Text style={styles.sectionTitle}>Full Classification</Text>
          <ScrollView style={styles.classificationScroll}>
            {classification.map((result) => (
              <View key={result.position} style={styles.classificationRow}>
                <Text style={styles.classPosition}>{result.position}</Text>
                <Text style={styles.classDriver}>{result.driver}</Text>
                <Text style={styles.classTeam}>{result.team}</Text>
                <Text style={styles.classTime}>{result.time}</Text>
                {result.points !== undefined && <Text style={styles.classPoints}>{result.points} pts</Text>}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  back: { padding: 10, marginRight: 10 },
  backText: { color: "#FF6200", fontSize: 16 },
  title: { color: colors.text, fontSize: 26, fontWeight: "bold" },
  loadingText: { color: colors.text, fontSize: 18, marginTop: 20 },
  errorText: { color: colors.text, fontSize: 24, textAlign: "center", marginTop: 100 },
  backButton: { padding: 16, backgroundColor: colors.card, borderRadius: 8, marginTop: 20 },
  backButtonText: { color: "#FF6200", fontSize: 16, fontWeight: "bold" },
  circuitInfo: { backgroundColor: colors.card, borderRadius: 12, padding: 20, marginBottom: 20 },
  circuitName: { color: colors.text, fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  lapsInfo: { color: colors.muted, fontSize: 14 },
  podiumSection: { marginBottom: 30 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  podiumContainer: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end" },
  podiumPlace: { 
    backgroundColor: colors.card, 
    borderRadius: 12, 
    padding: 16, 
    alignItems: "center",
    minWidth: 100,
  },
  podium1: { backgroundColor: "#FFD700", transform: [{ scale: 1.1 }] },
  podium2: { backgroundColor: "#C0C0C0" },
  podium3: { backgroundColor: "#CD7F32" },
  positionBadge: { 
    color: "#000", 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 8 
  },
  driverName: { color: "#000", fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  teamName: { color: "#333", fontSize: 12, marginBottom: 4 },
  timeText: { color: "#333", fontSize: 12 },
  winnerSection: { backgroundColor: "rgba(255, 98, 0, 0.1)", borderRadius: 12, padding: 20, marginBottom: 20, borderWidth: 2, borderColor: "#FF6200" },
  winnerLabel: { color: "#FF6200", fontSize: 14, marginBottom: 4 },
  winnerName: { color: colors.text, fontSize: 20, fontWeight: "bold" },
  fastestLapSection: { backgroundColor: colors.card, borderRadius: 12, padding: 20, marginBottom: 20 },
  fastestLapDriver: { color: colors.text, fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  fastestLapTeam: { color: colors.muted, fontSize: 14, marginBottom: 4 },
  fastestLapTime: { color: "#FF6200", fontSize: 16, fontWeight: "bold" },
  classificationSection: { flex: 1 },
  classificationScroll: { backgroundColor: colors.card, borderRadius: 12, padding: 16 },
  classificationRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#333" },
  classPosition: { color: colors.muted, fontSize: 14, width: 30, fontWeight: "bold" },
  classDriver: { color: colors.text, fontSize: 14, flex: 1, fontWeight: "600" },
  classTeam: { color: colors.muted, fontSize: 12, width: 80 },
  classTime: { color: colors.text, fontSize: 14, width: 60 },
  classPoints: { color: "#FF6200", fontSize: 14, fontWeight: "bold", width: 50 },
});
