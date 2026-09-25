import React, { useEffect, useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { colors } from "./src/theme";
import { readSavedAccountId, saveAccountId } from "./src/storage";
import { getProfiles } from "./src/api";
import PairScreen from "./src/screens/PairScreen";
import BrowseScreen from "./src/screens/BrowseScreen";
import type { ParentAccount } from "./src/types";

// Top-level state machine for the TV app:
//   not paired  -> PairScreen (create code, poll until parent confirms)
//   paired      -> BrowseScreen (search + request playback)
// This mirrors TVHome in the original web app's App.tsx one-for-one.
export default function App() {
  const [accountId, setAccountId] = useState("family-demo");
  const [parentAccountId, setParentAccountId] = useState("");
  const [account, setAccount] = useState<ParentAccount | null>(null);

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
      {account && parentAccountId ? (
        <BrowseScreen account={account} parentAccountId={parentAccountId} onUnpair={handleUnpair} />
      ) : (
        <PairScreen accountId={accountId} setAccountId={setAccountId} onPaired={handlePaired} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});