import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../theme";
import { selectTitle } from "../api";
import { useTvDecisionSocket } from "../useSocket";
import type { ChildProfile, ContentVerdict, Title, TitleSelectionResponse } from "../types";

interface Props {
  title: Title;
  child: ChildProfile;
  parentAccountId: string;
  onClose: () => void;
}

// Mirrors the web app's title detail dialog + now-playing overlay:
// request playback -> show verdict -> if flagged, wait on the socket
// for a parent_decision frame while showing a "waiting" state.
export default function TitleDetailModal({ title, child, parentAccountId, onClose }: Props) {
  const [selection, setSelection] = useState<TitleSelectionResponse | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [notice, setNotice] = useState("");
  const [playing, setPlaying] = useState(false);

  useTvDecisionSocket(parentAccountId, selection?.requestId || "", (decision) => {
    setSelection((current) =>
      current
        ? { ...current, verdict: (decision === "approved" ? "approved" : "blocked") as ContentVerdict }
        : current
    );
    setNotice(
      decision === "approved"
        ? "Approved. Opening on your streaming service…"
        : "Not approved this time. The title will stay closed."
    );
    setPlaying(decision === "approved");
  });

  const requestPlayback = async () => {
    setRequesting(true);
    try {
      const result = await selectTitle({
        titleId: title.id,
        childProfileId: child.id,
        parentAccountId,
      });
      setSelection(result);
      setNotice(
        result.verdict === "approved"
          ? "Ready to watch."
          : result.verdict === "flagged"
          ? "A parent decision is on its way."
          : "This title is outside your family settings."
      );
      setPlaying(result.verdict === "approved");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {playing ? (
          <View style={styles.playingBox}>
            <Text style={styles.eyebrow}>NOW PLAYING</Text>
            <Text style={styles.playingTitle}>{title.title}</Text>
            <Text style={styles.hint}>Opening on {title.service}…</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setPlaying(false)}>
              <Text style={styles.secondaryButtonText}>Back to details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.service}>{title.service}</Text>
            <Text style={styles.cardTitle}>{title.title}</Text>
            <Text style={styles.meta}>
              {title.year} · for {child.name}
            </Text>
            <Text style={styles.overview}>{title.overview || "A new story to share together."}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={requestPlayback}
              disabled={requesting}
              hasTVPreferredFocus
            >
              {requesting ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={styles.primaryButtonText}>Request to watch</Text>
              )}
            </TouchableOpacity>
            {!!notice && (
              <View
                style={[
                  styles.noticeBox,
                  selection?.verdict === "approved" && styles.noticeApproved,
                  selection?.verdict === "blocked" && styles.noticeBlocked,
                ]}
              >
                <Text style={styles.noticeText}>{notice}</Text>
                {!!selection?.reason && <Text style={styles.noticeReason}>{selection.reason}</Text>}
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(20,18,33,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 48,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 40,
    maxWidth: 720,
    width: "100%",
  },
  closeButton: { position: "absolute", right: 20, top: 20, padding: 8 },
  closeButtonText: { color: colors.text, fontSize: 18 },
  service: { color: colors.secondary, fontWeight: "700", fontSize: 12, letterSpacing: 1 },
  cardTitle: { color: colors.text, fontSize: 40, fontWeight: "700", marginTop: 12 },
  meta: { color: colors.muted, marginTop: 8, fontWeight: "700" },
  overview: { color: colors.muted, marginTop: 20, fontSize: 15, lineHeight: 22 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  primaryButtonText: { color: colors.primaryText, fontWeight: "700", fontSize: 15 },
  noticeBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(245,163,92,0.16)",
  },
  noticeApproved: { backgroundColor: "rgba(79,209,165,0.18)" },
  noticeBlocked: { backgroundColor: "rgba(226,89,107,0.14)" },
  noticeText: { color: colors.text, fontWeight: "700" },
  noticeReason: { color: colors.muted, marginTop: 4, fontSize: 13 },
  playingBox: { alignItems: "center" },
  eyebrow: { color: colors.secondary, fontWeight: "700", letterSpacing: 2 },
  playingTitle: { color: colors.text, fontSize: 56, fontWeight: "700", marginTop: 16 },
  hint: { color: colors.muted, marginTop: 12, fontSize: 16 },
  secondaryButton: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: colors.text, fontWeight: "700" },
});
