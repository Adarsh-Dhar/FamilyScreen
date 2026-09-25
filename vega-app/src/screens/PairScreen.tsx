import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../theme";
import { createPairing, getPairingStatus } from "../api";
import { API_BASE_URL } from "../config";
import type { PairSession, ParentAccount } from "../types";

interface Props {
  accountId: string;
  setAccountId: (value: string) => void;
  onPaired: (parentAccountId: string, account: ParentAccount) => void;
}

// Simplified TV pairing flow:
// 1. Automatically create a pairing code using default account ID
// 2. Display the code and poll until parent confirms it on their device
export default function PairScreen({ accountId, setAccountId, onPaired }: Props) {
  const [session, setSession] = useState<PairSession | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [testStatus, setTestStatus] = useState("");
  const retryCountRef = useRef(0);

  const startPairing = async () => {
    setCreating(true);
    setError("");
    retryCountRef.current = 0; // Reset retry count on successful network
    try {
      const defaultAccountId = "family-demo";
      console.log("Starting pairing with account:", defaultAccountId);
      
      const newSession = await createPairing(defaultAccountId);
      console.log("Pairing session created:", newSession);
      setSession(newSession);
      setTestStatus("Pairing successful!");
    } catch (err) {
      console.error("Pairing error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error message:", errorMessage);
      setError(`API Error: ${errorMessage}`);
      setTestStatus(`API failed: ${errorMessage}`);
    } finally {
      setCreating(false);
    }
  };

  const testNetwork = async () => {
    setTestStatus("Testing network connectivity...");
    try {
      // Try a simple fetch to test if network works at all
      const response = await fetch(`${API_BASE_URL}/api/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentAccountId: "test" }),
      });
      
      if (response.ok) {
        setTestStatus("Network OK! Testing pairing API...");
        await startPairing();
      } else {
        setTestStatus(`Network error: ${response.status}`);
        setError(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setTestStatus(`Network failed: ${errorMessage}`);
      setError(`Network Error: ${errorMessage}`);
      
      // Auto-retry after 3 seconds if network fails (max 3 retries)
      if (retryCountRef.current < 3) {
        const nextRetry = retryCountRef.current + 1;
        setTimeout(() => {
          retryCountRef.current = nextRetry;
          setTestStatus(`Retrying network connection (${nextRetry}/3)...`);
          setError("");
          testNetwork();
        }, 3000);
      } else {
        setTestStatus("Network connection failed after 3 attempts");
        setError("Please check your network connection and try again");
      }
    }
  };

  useEffect(() => {
    testNetwork();
  }, []);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(async () => {
      try {
        const status = await getPairingStatus(session.code);
        if (status.confirmed && status.parentAccount) {
          clearInterval(interval);
          onPaired(session.parentAccountId, status.parentAccount);
        }
      } catch {
        // Keep polling — a transient network blip shouldn't reset pairing.
      }
    }, 1800);
    return () => clearInterval(interval);
  }, [session, onPaired]);

  const handleRestart = () => {
    setSession(null);
    setError("");
    setTestStatus("");
    retryCountRef.current = 0; // Reset retry count on manual retry
    testNetwork();
  };

  if (creating) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Setting up pairing...</Text>
        <ActivityIndicator color={colors.secondary} style={{ marginTop: 24 }} />
        {testStatus && <Text style={styles.subtitle}>{testStatus}</Text>}
      </View>
    );
  }

  if (session) {
    return (
      <View style={styles.container}>
        <Text style={styles.eyebrow}>TV PAIRING CODE</Text>
        <Text style={styles.code}>{session.code}</Text>
        <Text style={styles.hint}>Enter this code on the parent app to connect.</Text>
        <ActivityIndicator color={colors.secondary} style={{ marginTop: 24 }} />
        <TouchableOpacity style={styles.linkButton} onPress={handleRestart}>
          <Text style={styles.linkButtonText}>Generate new code</Text>
        </TouchableOpacity>
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Error loading pairing</Text>
      {testStatus && <Text style={styles.subtitle}>{testStatus}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.primaryButton} onPress={handleRestart}>
        <Text style={styles.primaryButtonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 64,
    justifyContent: "center",
    maxWidth: 720,
  },
  eyebrow: {
    color: colors.secondary,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 16,
  },
  code: {
    color: colors.text,
    fontSize: 72,
    fontWeight: "700",
    letterSpacing: 8,
  },
  hint: { color: colors.muted, marginTop: 16, fontSize: 16 },
  linkButton: { marginTop: 32 },
  linkButtonText: { color: colors.muted, fontWeight: "700" },
  title: { color: colors.text, fontSize: 48, fontWeight: "700", marginBottom: 16 },
  subtitle: { color: colors.muted, fontSize: 16, marginBottom: 32, lineHeight: 24 },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonText: { color: colors.primaryText, fontWeight: "700", fontSize: 16 },
  error: { color: colors.destructive, marginTop: 12, fontSize: 13 },
});
