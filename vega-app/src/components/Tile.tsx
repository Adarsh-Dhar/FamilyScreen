import React from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';

export interface TileProps {
  label: string;
  icon: ImageSourcePropType;
  isFocused: boolean;
  onFocus: () => void;
  onBlur?: () => void;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

export const Tile = ({
  label,
  icon,
  isFocused,
  onFocus,
  onBlur,
  onPress,
  testID,
  accessibilityLabel,
}: TileProps) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  const handleFocus = () => {
    if (onFocus) {
      onFocus();
    }
  };

  const handleBlur = () => {
    if (onBlur) {
      onBlur();
    }
  };

  return (
    <Pressable
      style={[styles.tile, isFocused ? styles.focused : styles.default]}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={handlePress}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button">
      <View style={styles.topHalf}>
        <Image
          source={icon}
          style={styles.icon}
          resizeMode="contain"
          accessible={false}
        />
      </View>
      <View style={styles.bottomHalf}>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tile: {
    width: 160,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 12,
  },
  topHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  default: {
    backgroundColor: '#0074B8',
  },
  focused: {
    backgroundColor: '#FF6200',
    transform: [{scale: 1.1}],
    opacity: 1,
  },
  icon: {
    width: 40,
    height: 40,
    tintColor: '#FFFFFF',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 26,
    includeFontPadding: false,
  },
});
