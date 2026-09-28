import React, { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import { Focusable } from "../components/Focusable";
import { getHeadToHead } from "../api";
import type { SportId, GameSummary } from "../types";

interface Props {
  sportId: SportId;
  game: GameSummary;
  onBack: () => void;
}

export default function H2HScreen({ sportId, game, onBack }: Props) {
  const [h2hGames, setH2hGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  useEffect(() => {
    loadH2H();
  }, [sportId, game.gameId]);

  async function loadH2H() {
    try {
      const response = await getHeadToHead(sportId, game.gameId);
      setH2hGames(response.games || []);
    } catch (error) {
      console.error("Failed to load H2H:", error);
    } finally {
      setLoading(false);
    }
  }

  // Sort meetings newest first and cap at 10
  const sortedGames = [...h2hGames]
    .sort((a, b) => {
      // Try to sort by date if available, otherwise by gameId (assuming newer games have higher IDs)
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateA > 0 && dateB > 0) {
        return dateB - dateA; // Newest first
      }
      // Fallback: sort by gameId in descending order (assuming newer games have higher IDs)
      return Number(b.gameId) - Number(a.gameId);
    })
    .slice(0, 10);

  // Calculate head-to-head summary with score validation
  const summary = sortedGames.reduce((acc, g) => {
    if (g.status === "finished" && typeof g.homeScore === "number" && typeof g.awayScore === "number") {
      const homeWon = g.homeScore > g.awayScore;
      const awayWon = g.awayScore > g.homeScore;
      const isDraw = g.homeScore === g.awayScore;

      // Check if the current game's home team was playing
      const currentHomeTeamId = game.homeTeamId;
      const currentAwayTeamId = game.awayTeamId;

      if (g.homeTeamId === currentHomeTeamId && g.awayTeamId === currentAwayTeamId) {
        if (homeWon) acc.wins++;
        else if (awayWon) acc.losses++;
        else acc.draws++;
      } else if (g.homeTeamId === currentAwayTeamId && g.awayTeamId === currentHomeTeamId) {
        if (homeWon) acc.losses++;
        else if (awayWon) acc.wins++;
        else acc.draws++;
      }
    }
    return acc;
  }, { wins: 0, losses: 0, draws: 0 });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Focusable style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </Focusable>
        <Text style={styles.title}>Head to Head</Text>
      </View>

      <View style={styles.teamsHeader}>
        <Text style={styles.teamName}>{game.homeTeam}</Text>
        <Text style={styles.vsText}>vs</Text>
        <Text style={styles.teamName}>{game.awayTeam}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>All-time Record</Text>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{summary.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{summary.draws}</Text>
            <Text style={styles.statLabel}>Draws</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{summary.losses}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
        </View>
      </View>

      {loading && <ActivityIndicator size="large" color="#FF6200" />}
      {!loading && sortedGames.length === 0 && (
        <Text style={styles.empty}>No previous meetings found</Text>
      )}

      <ScrollView style={styles.gamesList}>
        {sortedGames.map((g, index) => (
          <View key={index} style={styles.gameRow}>
            <Text style={styles.gameDate}>
              Game #{g.gameId.slice(-4)}
            </Text>
            <View style={styles.gameScore}>
              <Text style={styles.team}>{g.homeTeam}</Text>
              <Text style={styles.score}>
                {g.homeScore} - {g.awayScore}
              </Text>
              <Text style={styles.team}>{g.awayTeam}</Text>
            </View>
            <Text style={styles.gameCompetition}>{g.competition || ""}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  back: { padding: 10, marginRight: 10 },
  backText: { color: "#FF6200", fontSize: 16 },
  title: { color: colors.text, fontSize: 26, fontWeight: "bold" },
  teamsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  teamName: { color: colors.text, fontSize: 18, fontWeight: "bold", flex: 1, textAlign: "center" },
  vsText: { color: colors.muted, fontSize: 16, paddingHorizontal: 20 },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryLabel: { color: colors.muted, fontSize: 14, marginBottom: 12 },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: { alignItems: "center" },
  statValue: { color: "#FF6200", fontSize: 32, fontWeight: "bold" },
  statLabel: { color: colors.muted, fontSize: 14, marginTop: 4 },
  empty: { color: colors.muted, fontSize: 16, textAlign: "center", marginTop: 40 },
  gamesList: { flex: 1 },
  gameRow: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  gameDate: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  gameScore: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  team: { color: colors.text, fontSize: 16, fontWeight: "600", flex: 1 },
  score: { color: "#FF6200", fontSize: 20, fontWeight: "bold", paddingHorizontal: 20 },
  gameCompetition: { color: colors.muted, fontSize: 12 },
});
