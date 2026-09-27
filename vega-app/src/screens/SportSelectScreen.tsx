import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { colors } from "../theme";
import { getSports, type SportDefinition } from "../api";

interface SportSelectScreenProps {
  onSportSelect: (sport: SportDefinition) => void;
}

// Fallback sports data in case API fails
const FALLBACK_SPORTS: SportDefinition[] = [
  { id: "football", label: "Football", icon: "⚽", kind: "team-game", hasPredictions: true, hasLiveGames: true, hasStandings: true, hasTeams: true, hasHeadToHead: true, description: "Live football scores, standings, and AI predictions" },
  { id: "basketball", label: "Basketball", icon: "🏀", kind: "team-game", hasPredictions: false, hasLiveGames: true, hasStandings: true, hasTeams: true, hasHeadToHead: true, description: "Live basketball scores and standings" },
  { id: "baseball", label: "Baseball", icon: "⚾", kind: "team-game", hasPredictions: false, hasLiveGames: true, hasStandings: true, hasTeams: true, hasHeadToHead: true, description: "Live baseball scores and standings" },
  { id: "hockey", label: "Hockey", icon: "🏒", kind: "team-game", hasPredictions: false, hasLiveGames: true, hasStandings: true, hasTeams: true, hasHeadToHead: true, description: "Live hockey scores and standings" },
  { id: "handball", label: "Handball", icon: "🤾", kind: "team-game", hasPredictions: false, hasLiveGames: true, hasStandings: true, hasTeams: true, hasHeadToHead: true, description: "Live handball scores and standings" },
  { id: "volleyball", label: "Volleyball", icon: "🏐", kind: "team-game", hasPredictions: false, hasLiveGames: true, hasStandings: true, hasTeams: true, hasHeadToHead: true, description: "Live volleyball scores and standings" },
  { id: "rugby", label: "Rugby", icon: "🏉", kind: "team-game", hasPredictions: false, hasLiveGames: true, hasStandings: true, hasTeams: true, hasHeadToHead: true, description: "Live rugby scores and standings" },
  { id: "afl", label: "AFL", icon: "🦘", kind: "team-game", hasPredictions: false, hasLiveGames: true, hasStandings: true, hasTeams: true, hasHeadToHead: true, description: "Live AFL scores and standings" },
  { id: "nfl", label: "NFL", icon: "🏈", kind: "team-game", hasPredictions: false, hasLiveGames: true, hasStandings: true, hasTeams: true, hasHeadToHead: true, description: "Live NFL scores and standings" },
  { id: "nba", label: "NBA", icon: "🏀", kind: "team-game", hasPredictions: false, hasLiveGames: true, hasStandings: true, hasTeams: true, hasHeadToHead: true, description: "Live NBA scores, standings, and player stats" },
  { id: "formula1", label: "Formula 1", icon: "🏎️", kind: "motorsport", hasPredictions: false, hasLiveGames: false, hasStandings: true, hasTeams: true, hasHeadToHead: false, description: "F1 races, driver standings, and team rankings" },
  { id: "mma", label: "MMA", icon: "🥊", kind: "combat", hasPredictions: false, hasLiveGames: false, hasStandings: false, hasTeams: false, hasHeadToHead: false, description: "MMA fights and fighter rankings" },
];

export default function SportSelectScreen({ onSportSelect, onBack }: SportSelectScreenProps) {
  const [sports, setSports] = useState<SportDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSports();
  }, []);

  async function loadSports() {
    try {
      const response = await getSports();
      setSports(response.sports);
    } catch (error) {
      console.error("Failed to load sports from API, using fallback:", error);
      setSports(FALLBACK_SPORTS);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6200" />
        <Text style={styles.loadingText}>Loading sports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Sport</Text>
      </View>

      {/* Sports Grid */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.grid}>
          {sports.map((sport) => (
            <Pressable
              key={sport.id}
              style={styles.sportTile}
              onPress={() => onSportSelect(sport)}
            >
              <Text style={styles.sportIcon}>{sport.icon}</Text>
              <Text style={styles.sportLabel}>{sport.label}</Text>
              <Text style={styles.sportDescription}>{sport.description}</Text>
              {sport.hasPredictions && (
                <View style={styles.predictionBadge}>
                  <Text style={styles.predictionBadgeText}>AI Predictions</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
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
    fontSize: 18,
    marginTop: 20,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
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
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  sportTile: {
    width: "48%",
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    alignItems: "center",
    minHeight: 150,
  },
  sportIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  sportLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  sportDescription: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  predictionBadge: {
    backgroundColor: "#FF6200",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  predictionBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});