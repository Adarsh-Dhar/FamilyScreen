import React, { useEffect, useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { colors } from "./theme";
import { readSavedAccountId, saveAccountId, clearAccountId } from "./storage";
import { getProfiles } from "./api";
import PairScreen from "./screens/PairScreen";
import BrowseScreen from "./screens/BrowseScreen";
import YouTubeScreen from "./screens/YouTubeScreen";
import type { ParentAccount } from "./types";

// Top-level state machine for the TV app:
//   not paired  -> PairScreen (create code, poll until parent confirms)
//   paired      -> BrowseScreen (search + request playback)
// This mirrors TVHome in the original web app's App.tsx one-for-one.
export default function App() {
  const [accountId, setAccountId] = useState("family-demo");
  const [parentAccountId, setParentAccountId] = useState("");
  const [account, setAccount] = useState<ParentAccount | null>(null);
  const [showYouTube, setShowYouTube] = useState(false);

  useEffect(() => {
    readSavedAccountId("family-demo").then(setAccountId);
  }, []);

  const handlePaired = (paredId: string, paredAccount: ParentAccount) => {
    setParentAccountId(paredId);
    setAccount(paredAccount);
    saveAccountId(paredId);
  };

  const handleUnpair = () => {
    setParentAccountId("");
    setAccount(null);
    clearAccountId(); // Clear the saved account ID so it doesn't auto-pair
  };

  const handleSelectYouTube = () => {
    console.log("handleSelectYouTube called");
    setShowYouTube(true);
  };

  // If we already have a saved parent account id (e.g. app relaunch),
  // skip pairing and try to load profiles directly.
  useEffect(() => {
    if (parentAccountId || !accountId) return;
    let cancelled = false;
    getProfiles(accountId)
      .then((response) => {
        if (!cancelled) {
          setParentAccountId(accountId);
          setAccount(response.parentAccount);
        }
      })
      .catch(() => {
        // Not paired yet, or the account id has no profiles — fall through
        // to PairScreen so the user can pair normally.
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, parentAccountId]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      {showYouTube ? (
        <YouTubeScreen onExit={() => setShowYouTube(false)} />
      ) : account && parentAccountId ? (
        <BrowseScreen account={account} parentAccountId={parentAccountId} onUnpair={handleUnpair} onSelectYouTube={handleSelectYouTube} />
      ) : (
        <PairScreen accountId={accountId} setAccountId={setAccountId} onPaired={handlePaired} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
