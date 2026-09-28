import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from "react-native";
import { Focusable } from "../components/Focusable";
import { colors } from "../theme";
import { getSports, type SportDefinition } from "../api";

interface SportSelectScreenProps {
  onSportSelect: (sport: SportDefinition) => void;
  onBack?: () => void;
}

export default function SportSelectScreen({ onSportSelect, onBack: _onBack }: SportSelectScreenProps) {
  const [sports, setSports] = useState<SportDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadSports();
  }, []);

  async function loadSports() {
    setLoading(true);
    setFailed(false);
    try {
      const response = await getSports();
      setSports(response.sports);
    } catch (error) {
      console.error("Failed to load sports:", error);
      setFailed(true);
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

  if (failed) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Can't reach the sports server.</Text>
        <Focusable style={styles.sportTile} onPress={loadSports}>
          <Text style={styles.sportLabel}>Retry</Text>
        </Focusable>
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
            <Focusable
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
            </Focusable>
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