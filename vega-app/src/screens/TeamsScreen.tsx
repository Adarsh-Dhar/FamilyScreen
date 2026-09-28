import React, { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import { Focusable } from "../components/Focusable";
import { getActiveLeagues, getTeams } from "../api";
import type { ActiveLeague, SportId, Team } from "../types";

interface Props {
  sportId: SportId;
  sportLabel: string;
  onBack: () => void;
}

export default function TeamsScreen({ sportId, sportLabel, onBack }: Props) {
  const [leagues, setLeagues] = useState<ActiveLeague[]>([]);
  const [selected, setSelected] = useState<ActiveLeague | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  useEffect(() => {
    getActiveLeagues(sportId)
      .then((r) => setLeagues(r.leagues))
      .catch((e) => console.error("Failed to load leagues:", e))
      .finally(() => setLoading(false));
  }, [sportId]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    getTeams(sportId, selected.leagueId, selected.season)
      .then((r) => setTeams(r.teams))
      .catch((e) => console.error("Failed to load teams:", e))
      .finally(() => setLoading(false));
  }, [sportId, selected]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Focusable style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </Focusable>
        <Text style={styles.title}>{sportLabel} Teams</Text>
      </View>

      <ScrollView horizontal style={styles.chips}>
        {leagues.map((l) => (
          <Focusable
            key={l.leagueId}
            style={[styles.chip, selected?.leagueId === l.leagueId && styles.chipActive]}
            onPress={() => setSelected(l)}
          >
            <Text style={styles.chipText}>{l.name}</Text>
          </Focusable>
        ))}
      </ScrollView>

      {loading && <ActivityIndicator size="large" color="#FF6200" />}
      {!loading && leagues.length === 0 && (
        <Text style={styles.empty}>Teams are available for leagues that have a live game right now.</Text>
      )}
      {!loading && selected && teams.length === 0 && <Text style={styles.empty}>No teams found for this league.</Text>}

      <ScrollView>
        {teams.map((team) => (
          <View key={team.id} style={styles.row}>
            <Text style={styles.teamName}>{team.name}</Text>
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
  chips: { flexGrow: 0, marginBottom: 16 },
  chip: { backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10, borderWidth: 3, borderColor: "transparent" },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontSize: 14 },
  empty: { color: colors.muted, fontSize: 16, marginTop: 20 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 8, padding: 16, marginBottom: 8 },
  teamName: { color: colors.text, fontSize: 16, fontWeight: "600" },
});
