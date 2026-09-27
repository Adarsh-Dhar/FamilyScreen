import React, { useRef } from "react";
import { View, StyleSheet } from "react-native";
// eslint-disable-next-line @amazon-devices/kepler/sdl-package-version-check-imports
import { WebView } from "@amazon-devices/webview";

interface Props {
  onExit: () => void;
}

export default function YouTubeScreen({ onExit }: Props) {
  const webRef = useRef(null);

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        style={styles.webview}
        allowSystemKeyEvents={true}
        javaScriptEnabled={true}
        source={{ uri: "https://www.youtube.com/tv" }}
        onLoadStart={(e) => console.log("YT load start", e.nativeEvent.url)}
        onError={(e) => console.log("YT load error", e.nativeEvent)}
        onMessage={(event) => {
          if (event.nativeEvent.data === "goBack") onExit();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  webview: { flex: 1 },
});
