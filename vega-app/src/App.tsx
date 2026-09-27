import React, { useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { colors } from "./theme";
import MatchListScreen from "./screens/MatchListScreen";
import MatchScreen from "./screens/MatchScreen";

// Top-level state machine for the TV app:
//   MatchListScreen -> MatchScreen
// Simple navigation between match list and individual match view
export default function App() {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
  };

  const handleBackToList = () => {
    setSelectedMatchId(null);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      {selectedMatchId ? (
        <MatchScreen matchId={selectedMatchId} onBack={handleBackToList} />
      ) : (
        <MatchListScreen onSelectMatch={handleSelectMatch} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
