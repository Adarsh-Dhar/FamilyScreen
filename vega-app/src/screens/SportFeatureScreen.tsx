import React, { useEffect } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import { Focusable } from "../components/Focusable";
import type { SportDefinition, SportFeature } from "../types";

interface Props {
  sport: SportDefinition;
  onSelect: (feature: SportFeature) => void;
  onBack: () => void;
}

/** One screen for every sport: the tiles come from the sport's registry flags, not per-sport code. */
export function featuresFor(sport: SportDefinition): Array<{ id: SportFeature; label: string; hint: string }> {
  const items: Array<{ id: SportFeature; label: string; hint: string }> = [
    { id: "live", label: sport.kind === "team-game" ? "Live Games" : "Today", hint: "Scores and AI commentary" },
    { id: "past", label: "Past Games", hint: "Yesterday's results" },
  ];
  if (sport.hasStandings && sport.kind === "team-game") {
    items.push({ id: "standings", label: "Standings", hint: "League tables" });
  }
  return items;
}

export default function SportFeatureScreen({ sport, onSelect, onBack }: Props) {
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Focusable style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </Focusable>
        <Text style={styles.title}>
          {sport.icon} {sport.label}
        </Text>
      </View>
      <View style={styles.grid}>
        {featuresFor(sport).map((f) => (
          <Focusable key={f.id} style={styles.tile} onPress={() => onSelect(f.id)}>
            <Text style={styles.tileLabel}>{f.label}</Text>
            <Text style={styles.tileHint}>{f.hint}</Text>
          </Focusable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 30 },
  back: { padding: 10, marginRight: 10 },
  backText: { color: "#FF6200", fontSize: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: "bold" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  tile: { backgroundColor: colors.card, borderRadius: 12, padding: 24, width: 260, borderWidth: 3, borderColor: "transparent" },
  tileLabel: { color: colors.text, fontSize: 22, fontWeight: "bold" },
  tileHint: { color: colors.muted, fontSize: 14, marginTop: 6 },
});
