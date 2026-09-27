import React, { useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { colors } from "./theme";
import SportSelectScreen from "./screens/SportSelectScreen";
import GameListScreen from "./screens/GameListScreen";
import GameScreen, { MatchScreen } from "./screens/MatchScreen";
import MatchListScreen from "./screens/MatchListScreen";
import type { SportDefinition, GameSummary } from "./types";

type NavigationState = 
  | { screen: "sport-select" }
  | { screen: "game-list"; sport: SportDefinition }
  | { screen: "game-detail"; sport: SportDefinition; game: GameSummary }
  | { screen: "legacy-match-list" }
  | { screen: "legacy-match-detail"; matchId: string };

export default function App() {
  const [navState, setNavState] = useState<NavigationState>({ screen: "sport-select" });

  const handleSportSelect = (sport: SportDefinition) => {
    setNavState({ screen: "game-list", sport });
  };

  const handleGameSelect = (game: GameSummary) => {
    if (navState.screen === "game-list") {
      setNavState({ screen: "game-detail", sport: navState.sport, game });
    }
  };

  const handleBackToGameList = () => {
    if (navState.screen === "game-detail") {
      setNavState({ screen: "game-list", sport: navState.sport });
    }
  };

  const handleBackToSportSelect = () => {
    setNavState({ screen: "sport-select" });
  };

  // Legacy football navigation (for backward compatibility)
  const handleSelectMatch = (matchId: string) => {
    setNavState({ screen: "legacy-match-detail", matchId });
  };

  const handleBackToMatchList = () => {
    setNavState({ screen: "legacy-match-list" });
  };

  const handleBackFromLegacy = () => {
    setNavState({ screen: "sport-select" });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      
      {navState.screen === "sport-select" && (
        <SportSelectScreen 
          onSportSelect={handleSportSelect}
          onBack={() => {}} // No back button on home screen
        />
      )}
      
      {navState.screen === "game-list" && (
        <GameListScreen
          sportId={navState.sport.id}
          sportLabel={navState.sport.label}
          onGameSelect={handleGameSelect}
          onBack={handleBackToSportSelect}
        />
      )}
      
      {navState.screen === "game-detail" && (
        <GameScreen
          sportId={navState.sport.id}
          game={navState.game}
          onBack={handleBackToGameList}
        />
      )}
      
      {navState.screen === "legacy-match-list" && (
        <MatchListScreen
          onSelectMatch={handleSelectMatch}
          onBack={handleBackFromLegacy}
        />
      )}
      
      {navState.screen === "legacy-match-detail" && (
        <MatchScreen
          matchId={navState.matchId}
          onBack={handleBackToMatchList}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
