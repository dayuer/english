import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '../../theme';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  variant?: 'default' | 'success';
  style?: ViewStyle;
}

export function ProgressBar({ progress, variant = 'default', style }: ProgressBarProps) {
  const boundedProgress = Math.min(Math.max(progress, 0), 100);
  const isSuccess = variant === 'success';

  return (
    <View style={[styles.track, style]}>
      <View
        style={[
          styles.fill,
          { width: `${boundedProgress}%`, backgroundColor: isSuccess ? colors.accentEmerald : colors.primary },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.full,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
});
