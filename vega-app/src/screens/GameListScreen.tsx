import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, BackHandler } from "react-native";
import { Focusable } from "../components/Focusable";
import { colors } from "../theme";
import { getLiveGames, getPastGames, type SportId, type GameSummary } from "../api";

interface GameListScreenProps {
  sportId: SportId;
  sportLabel: string;
  onGameSelect: (game: GameSummary) => void;
  onBack: () => void;
  initialFilter?: GameFilter;
}

type GameFilter = "live" | "past";

export default function GameListScreen({ sportId, sportLabel, onGameSelect, onBack, initialFilter = "live" }: GameListScreenProps) {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GameFilter>(initialFilter);

  useEffect(() => {
    loadGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportId, filter]);

  // Handle hardware back button from remote
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });

    return () => backHandler.remove();
  }, [onBack]);

  async function loadGames() {
    setLoading(true);
    try {
      const response = filter === "live" 
        ? await getLiveGames(sportId)
        : await getPastGames(sportId);
      setGames(response.games);
    } catch (error) {
      console.error("Failed to load games:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6200" />
        <Text style={styles.loadingText}>Loading {sportLabel} games...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Focusable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Focusable>
        <Text style={styles.headerTitle}>{sportLabel} Games</Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <Focusable
          style={[styles.filterButton, filter === "live" && styles.filterButtonActive]}
          onPress={() => setFilter("live")}
        >
          <Text style={[styles.filterButtonText, filter === "live" && styles.filterButtonTextActive]}>
            Live
          </Text>
        </Focusable>
        <Focusable
          style={[styles.filterButton, filter === "past" && styles.filterButtonActive]}
          onPress={() => setFilter("past")}
        >
          <Text style={[styles.filterButtonText, filter === "past" && styles.filterButtonTextActive]}>
            Past
          </Text>
        </Focusable>
      </View>

      {/* Games List */}
      <ScrollView style={styles.scrollView}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6200" />
            <Text style={styles.loadingText}>Loading {filter} {sportLabel} games...</Text>
          </View>
        ) : games.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No {filter} {sportLabel} games available
            </Text>
            <Text style={styles.subText}>
              {filter === "live" ? "Check back when games are in progress" : "No completed games found"}
            </Text>
          </View>
        ) : (
          games.map((game) => (
            <Focusable
              key={game.gameId}
              style={styles.gameTile}
              onPress={() => onGameSelect(game)}
            >
              <View style={styles.gameHeader}>
                <Text style={styles.competition}>{game.competition}</Text>
                <Text style={styles.gameStatus}>
                  {game.periodLabel}
                </Text>
              </View>
              
              <View style={styles.scoreSection}>
                <View style={styles.teamSection}>
                  <Text style={styles.teamName}>{game.homeTeam}</Text>
                </View>
                
                <View style={styles.scoreBox}>
                  <Text style={styles.score}>
                    {game.homeScore} - {game.awayScore}
                  </Text>
                  {game.lines && game.lines.length > 0 && (
                    <Text style={styles.lineScore}>
                      {game.lines.map(l => `${l.label}:${l.home}-${l.away}`).join(' ')}
                    </Text>
                  )}
                </View>
                
                <View style={styles.teamSection}>
                  <Text style={styles.teamName}>{game.awayTeam}</Text>
                </View>
              </View>
            </Focusable>
          ))
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "bold",
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#FF6200",
  },
  filterButtonText: {
    color: "#888",
    fontSize: 16,
    fontWeight: "600",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    color: "#888",
    fontSize: 18,
    textAlign: "center",
  },
  subText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  gameTile: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  gameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  competition: {
    color: "#888",
    fontSize: 14,
  },
  gameStatus: {
    color: "#FF6200",
    fontSize: 14,
    fontWeight: "600",
  },
  scoreSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamSection: {
    flex: 1,
  },
  teamName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  scoreBox: {
    marginHorizontal: 20,
  },
  score: {
    color: "#FF6200",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
  lineScore: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
});