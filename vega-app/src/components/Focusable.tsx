import React, { useState } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

type FocusableProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
};

const DEFAULT_FOCUS: ViewStyle = { borderWidth: 3, borderColor: "#FF6200", transform: [{ scale: 1.03 }] };

/** Pressable with a visible D-pad focus ring. Use it for EVERY tappable thing on a TV screen. */
export function Focusable({ style, focusedStyle, onFocus, onBlur, children, ...rest }: FocusableProps) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[style, focused && (focusedStyle ?? DEFAULT_FOCUS)]}
    >
      {children}
    </Pressable>
  );
}
