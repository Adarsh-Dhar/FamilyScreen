import React, { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import { Focusable } from "../components/Focusable";
import { getActiveLeagues, getAllLeagues, getStandings } from "../api";
import type { ActiveLeague, SportId, StandingRow } from "../types";

interface Props {
  sportId: SportId;
  sportLabel: string;
  onBack: () => void;
}

const NO_DRAW_SPORTS = new Set(["basketball", "nba", "baseball", "hockey", "nfl", "afl"]);

export default function StandingsScreen({ sportId, sportLabel, onBack }: Props) {
  const [leagues, setLeagues] = useState<ActiveLeague[]>([]);
  const [selected, setSelected] = useState<ActiveLeague | null>(null);
  const [rows, setRows] = useState<StandingRow[]>([]);
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
      .then((r) => {
        if (r.leagues.length === 0) {
          // Fallback to all leagues if no active games
          return getAllLeagues(sportId).then((all) => setLeagues(all.leagues));
        }
        setLeagues(r.leagues);
      })
      .catch((e) => console.error("Failed to load leagues:", e))
      .finally(() => setLoading(false));
  }, [sportId]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    getStandings(sportId, selected.leagueId, selected.season)
      .then((r) => setRows(r.rows))
      .catch((e) => console.error("Failed to load standings:", e))
      .finally(() => setLoading(false));
  }, [sportId, selected]);

  const showDraws = !NO_DRAW_SPORTS.has(sportId);
  const showWinPct = NO_DRAW_SPORTS.has(sportId);

  // Group rows by group if present
  const groupedRows = rows.reduce((acc, row) => {
    const group = row.group || "Overall";
    if (!acc[group]) acc[group] = [];
    acc[group].push(row);
    return acc;
  }, {} as Record<string, StandingRow[]>);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Focusable style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </Focusable>
        <Text style={styles.title}>{sportLabel} Standings</Text>
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
        <Text style={styles.empty}>Standings are offered for leagues that have a live game right now.</Text>
      )}
      {!loading && selected && rows.length === 0 && <Text style={styles.empty}>No standings returned for this league.</Text>}

      <ScrollView>
        {Object.entries(groupedRows).map(([groupName, groupRows]) => (
          <View key={groupName}>
            {groupName !== "Overall" && <Text style={styles.groupHeader}>{groupName}</Text>}
            {groupRows.map((r) => (
              <View key={`${r.teamId}-${r.position}`} style={styles.row}>
                <Text style={[styles.cell, styles.pos]}>{r.position}</Text>
                <Text style={[styles.cell, styles.team]}>{r.team}</Text>
                <Text style={styles.cell}>P {r.played}</Text>
                <Text style={styles.cell}>W {r.won}</Text>
                {showDraws && <Text style={styles.cell}>D {r.drawn}</Text>}
                <Text style={styles.cell}>L {r.lost}</Text>
                {showWinPct && <Text style={styles.cell}>{r.winPct?.toFixed(1)}%</Text>}
                {!showWinPct && r.points !== null && <Text style={styles.cell}>{r.points} pts</Text>}
              </View>
            ))}
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
  groupHeader: { color: colors.text, fontSize: 18, fontWeight: "bold", marginTop: 20, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 8, padding: 12, marginBottom: 6 },
  cell: { color: colors.text, fontSize: 14, marginLeft: 14 },
  pos: { width: 28, marginLeft: 0, color: colors.muted },
  team: { flex: 1, fontWeight: "bold" },
});
