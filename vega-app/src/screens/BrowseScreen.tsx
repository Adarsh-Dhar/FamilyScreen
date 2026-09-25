import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../theme";
import { searchTitles } from "../api";
import TitleDetailModal from "./TitleDetailModal";
import { Tile } from "../components/Tile";
import type { ChildProfile, ParentAccount, Title } from "../types";

interface Props {
  account: ParentAccount;
  parentAccountId: string;
  onUnpair: () => void;
  onSelectYouTube: () => void;
}

// Mirrors the web app's post-pairing TVHome state: profile switcher,
// search box, result grid, and the title detail modal.
export default function BrowseScreen({ account, parentAccountId, onUnpair, onSelectYouTube }: Props) {
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(
    account.children[0] || null
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Title[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTitle, setActiveTitle] = useState<Title | null>(null);
  const [youTubeFocused, setYouTubeFocused] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const response = await searchTitles(query.trim());
        if (!cancelled) setResults(response.results);
      } catch {
        if (!cancelled) setError("The catalog could not be reached.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300); // debounce so we don't fire a request per keystroke
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (!account.children.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No profiles yet</Text>
        <Text style={styles.subtitle}>Add a child profile from the parent app to start browsing.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>What sounds good?</Text>
        <TouchableOpacity onPress={onUnpair}>
          <Text style={styles.unpair}>Unpair TV</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileRow}>
        {account.children.map((child) => (
          <TouchableOpacity
            key={child.id}
            onPress={() => setSelectedChild(child)}
            style={[styles.profileChip, selectedChild?.id === child.id && styles.profileChipActive]}
          >
            <Text
              style={[
                styles.profileChipText,
                selectedChild?.id === child.id && styles.profileChipTextActive,
              ]}
            >
              {child.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.quickAccessRow}>
        <Tile
          label="YouTube"
          icon={require("../assets/vega.png")}
          isFocused={youTubeFocused}
          onFocus={() => {
            console.log("YouTube tile focused");
            setYouTubeFocused(true);
          }}
          onBlur={() => {
            console.log("YouTube tile blurred");
            setYouTubeFocused(false);
          }}
          onPress={() => {
            console.log("YouTube tile pressed");
            onSelectYouTube();
          }}
          hasTVPreferredFocus={true}
        />
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search the shared catalog"
        placeholderTextColor={colors.muted}
        style={styles.search}
        autoCapitalize="none"
      />

      {loading && <ActivityIndicator color={colors.secondary} style={{ marginTop: 24 }} />}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!loading && query.trim().length > 1 && !error && !results.length && (
        <Text style={styles.subtitle}>No stories matched that.</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        numColumns={4}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 48 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setActiveTitle(item)}>
            <View style={styles.poster}>
              <Text style={styles.posterInitials}>
                {item.title.split(" ").slice(0, 2).map((w) => w[0]).join("")}
              </Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardMeta}>
              {item.year} · {item.service}
            </Text>
          </TouchableOpacity>
        )}
      />

      {activeTitle && selectedChild && (
        <TitleDetailModal
          title={activeTitle}
          child={selectedChild}
          parentAccountId={parentAccountId}
          onClose={() => setActiveTitle(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 48 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.text, fontSize: 40, fontWeight: "700" },
  subtitle: { color: colors.muted, marginTop: 12, fontSize: 15 },
  unpair: { color: colors.muted, fontWeight: "700" },
  profileRow: { flexDirection: "row", gap: 8, marginTop: 24 },
  profileChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  profileChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  profileChipText: { color: colors.muted, fontWeight: "700" },
  profileChipTextActive: { color: colors.background },
  quickAccessRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 24,
  },
  search: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
  },
  error: { color: colors.destructive, marginTop: 12 },
  card: { width: "23%", marginRight: "2%", marginBottom: 20 },
  poster: {
    aspectRatio: 2 / 3,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: "flex-end",
    padding: 12,
  },
  posterInitials: { color: colors.text, fontSize: 24, fontWeight: "700" },
  cardTitle: { color: colors.text, fontWeight: "700", marginTop: 8 },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
