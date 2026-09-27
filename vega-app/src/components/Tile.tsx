import React from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import type { Match } from '../types';

export interface MatchTileProps {
  match: Match;
  isFocused: boolean;
  onFocus: () => void;
  onBlur?: () => void;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

export const MatchTile = ({
  match,
  isFocused,
  onFocus,
  onBlur,
  onPress,
  testID,
  accessibilityLabel,
}: MatchTileProps) => {
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
      <View style={styles.content}>
        <Text style={styles.competition}>{match.competition}</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.teamName}>{match.homeTeam}</Text>
          <Text style={styles.score}>
            {match.homeScore} - {match.awayScore}
          </Text>
          <Text style={styles.teamName}>{match.awayTeam}</Text>
        </View>
        <Text style={styles.time}>{match.elapsedMinutes}'</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tile: {
    width: 280,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  default: {
    backgroundColor: '#1a1a2e',
  },
  focused: {
    backgroundColor: '#252540',
    borderColor: '#FF6200',
    transform: [{scale: 1.05}],
  },
  competition: {
    color: '#888',
    fontSize: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  score: {
    color: '#FF6200',
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  time: {
    color: '#666',
    fontSize: 14,
  },
});
