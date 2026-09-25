import React, { useRef } from "react";
import { View, StyleSheet } from "react-native";
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
        hasTVPreferredFocus={true}
        allowSystemKeyEvents={true}
        javaScriptEnabled={true}
        source={{ uri: "https://www.youtube.com/tv" }}
        onLoadStart={(e) => console.log("YT load start", e.nativeEvent.url)}
        onError={(e) => console.log("YT load error", e.nativeEvent)}
        onMessage={(event) => {
          if (event.nativeEvent.data === "goBack") onExit();
        }}
        injectedJavaScript={`
          document.addEventListener('keydown', function(e) {
            if (e.keyCode === 27) { // ESC/Back key
              window.ReactNativeWebView.postMessage('goBack');
            }
          });
        `}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  webview: { flex: 1 },
});
