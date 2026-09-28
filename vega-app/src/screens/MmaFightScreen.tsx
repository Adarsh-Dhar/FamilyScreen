import React, { useEffect } from "react";
import { StyleSheet, Text, View, BackHandler } from "react-native";
import { Focusable } from "../components/Focusable";
import { colors } from "../theme";
import type { GameSummary } from "../types";

interface Props {
  game: GameSummary;
  onBack: () => void;
}

export default function MmaFightScreen({ game, onBack }: Props) {
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const isFinished = game.status === "finished";
  const winner = game.winner;
  const method = game.method;
  const round = game.round;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Focusable style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </Focusable>
        <Text style={styles.title}>{game.competition}</Text>
      </View>

      <View style={styles.fightCard}>
        <View style={[styles.fighterSection, winner === "home" && styles.winnerSection]}>
          <Text style={[styles.fighterName, winner === "home" && styles.winnerText]}>
            {game.homeTeam}
          </Text>
          {winner === "home" && <Text style={styles.winnerLabel}>WINNER</Text>}
        </View>

        <View style={styles.vsSection}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={[styles.fighterSection, winner === "away" && styles.winnerSection]}>
          <Text style={[styles.fighterName, winner === "away" && styles.winnerText]}>
            {game.awayTeam}
          </Text>
          {winner === "away" && <Text style={styles.winnerLabel}>WINNER</Text>}
        </View>
      </View>

      {isFinished && (
        <View style={styles.resultSection}>
          <Text style={styles.resultLabel}>Result</Text>
          <Text style={styles.resultText}>
            {winner === "home" && `${game.homeTeam} wins`}
            {winner === "away" && `${game.awayTeam} wins`}
            {winner === "draw" && "Draw"}
            {!winner && "No result"}
          </Text>
          {method && <Text style={styles.methodText}>Method: {method}</Text>}
          {round && <Text style={styles.roundText}>Round: {round}</Text>}
        </View>
      )}

      {!isFinished && (
        <View style={styles.statusSection}>
          <Text style={styles.statusText}>
            {game.periodLabel === "NS" ? "Scheduled" : "Live"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 30 },
  back: { padding: 10, marginRight: 10 },
  backText: { color: "#FF6200", fontSize: 16 },
  title: { color: colors.text, fontSize: 26, fontWeight: "bold" },
  fightCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 30,
    marginBottom: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fighterSection: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
  },
  winnerSection: {
    backgroundColor: "rgba(255, 98, 0, 0.1)",
    borderWidth: 2,
    borderColor: "#FF6200",
  },
  fighterName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  winnerText: {
    color: "#FF6200",
  },
  winnerLabel: {
    color: "#FF6200",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 8,
  },
  vsSection: {
    paddingHorizontal: 20,
  },
  vsText: {
    color: colors.muted,
    fontSize: 24,
    fontWeight: "bold",
  },
  resultSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  resultLabel: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 8,
  },
  resultText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  methodText: {
    color: colors.text,
    fontSize: 16,
    marginBottom: 4,
  },
  roundText: {
    color: colors.text,
    fontSize: 16,
  },
  statusSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  statusText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "bold",
  },
});
