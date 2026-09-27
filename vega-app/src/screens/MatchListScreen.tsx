import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { colors } from "../theme";
import { getLiveMatches } from "../api";
import { MatchTile } from "../components/Tile";
import type { Match } from "../types";

interface MatchListScreenProps {
  onSelectMatch: (matchId: string) => void;
}

export default function MatchListScreen({ onSelectMatch }: MatchListScreenProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
    // Refresh matches every 30 seconds
    const interval = setInterval(loadMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadMatches() {
    try {
      const response = await getLiveMatches();
      setMatches(response.matches);
    } catch (error) {
      console.error("Failed to load matches:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading live matches...</Text>
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No live matches available</Text>
        <Text style={styles.subText}>Check back when games are in progress</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Live Matches</Text>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {matches.map((match, index) => (
          <MatchTile
            key={match.matchId}
            match={match}
            isFocused={focusedIndex === index}
            onFocus={() => setFocusedIndex(index)}
            onPress={() => onSelectMatch(match.matchId)}
            accessibilityLabel={`${match.homeTeam} vs ${match.awayTeam}`}
          />
        ))}
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
    fontSize: 24,
    textAlign: "center",
    marginTop: 100,
  },
  emptyText: {
    color: colors.text,
    fontSize: 28,
    textAlign: "center",
    marginTop: 100,
    fontWeight: "bold",
  },
  subText: {
    color: colors.text,
    fontSize: 18,
    textAlign: "center",
    marginTop: 10,
    opacity: 0.7,
  },
  header: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
});