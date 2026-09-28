import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

interface LineScoreProps {
  lines: Array<{ label: string; home: number; away: number }>;
}

export function LineScore({ lines }: LineScoreProps) {
  if (!lines || lines.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Period Scores</Text>
      <View style={styles.lines}>
        {lines.map((line, index) => (
          <View key={index} style={styles.line}>
            <Text style={styles.label}>{line.label}</Text>
            <Text style={styles.score}>{line.home}</Text>
            <Text style={styles.score}>{line.away}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  header: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  lines: {
    gap: 8,
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    width: 40,
  },
  score: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    width: 40,
    textAlign: "center",
  },
});
