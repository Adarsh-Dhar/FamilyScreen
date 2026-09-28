import React, { useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { colors } from "./theme";
import SportSelectScreen from "./screens/SportSelectScreen";
import SportFeatureScreen from "./screens/SportFeatureScreen";
import GameListScreen from "./screens/GameListScreen";
import StandingsScreen from "./screens/StandingsScreen";
import TeamsScreen from "./screens/TeamsScreen";
import GameScreen from "./screens/MatchScreen";
import type { GameSummary, SportDefinition, SportFeature } from "./types";

// Sport select → features → (game list → game detail | standings | teams)
type Nav =
  | { screen: "sports" }
  | { screen: "features"; sport: SportDefinition }
  | { screen: "games"; sport: SportDefinition; filter: "live" | "past" }
  | { screen: "standings"; sport: SportDefinition }
  | { screen: "teams"; sport: SportDefinition }
  | { screen: "game"; sport: SportDefinition; filter: "live" | "past"; game: GameSummary };

export default function App() {
  const [nav, setNav] = useState<Nav>({ screen: "sports" });

  const openFeature = (sport: SportDefinition, feature: SportFeature) => {
    if (feature === "standings") return setNav({ screen: "standings", sport });
    if (feature === "teams") return setNav({ screen: "teams", sport });
    return setNav({ screen: "games", sport, filter: feature });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />

      {nav.screen === "sports" && <SportSelectScreen onSportSelect={(sport) => setNav({ screen: "features", sport })} />}

      {nav.screen === "features" && (
        <SportFeatureScreen sport={nav.sport} onSelect={(f) => openFeature(nav.sport, f)} onBack={() => setNav({ screen: "sports" })} />
      )}

      {nav.screen === "games" && (
        <GameListScreen
          sportId={nav.sport.id}
          sportLabel={nav.sport.label}
          initialFilter={nav.filter}
          onGameSelect={(game) => setNav({ screen: "game", sport: nav.sport, filter: nav.filter, game })}
          onBack={() => setNav({ screen: "features", sport: nav.sport })}
        />
      )}

      {nav.screen === "standings" && (
        <StandingsScreen sportId={nav.sport.id} sportLabel={nav.sport.label} onBack={() => setNav({ screen: "features", sport: nav.sport })} />
      )}

      {nav.screen === "teams" && (
        <TeamsScreen sportId={nav.sport.id} sportLabel={nav.sport.label} onBack={() => setNav({ screen: "features", sport: nav.sport })} />
      )}

      {nav.screen === "game" && (
        <GameScreen
          sportId={nav.sport.id}
          hasPredictions={nav.sport.hasPredictions}
          game={nav.game}
          onBack={() => setNav({ screen: "games", sport: nav.sport, filter: nav.filter })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
