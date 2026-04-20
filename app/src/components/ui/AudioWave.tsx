import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface AudioWaveProps {
  barCount?: number;
  playing?: boolean;
}

export function AudioWave({ barCount = 9, playing = true }: AudioWaveProps) {
  const bars = useRef(Array.from({ length: barCount }, () => new Animated.Value(12))).current;

  useEffect(() => {
    if (!playing) return;

    const animations = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 100),
          Animated.timing(bar, {
            toValue: 36,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: 12,
            duration: 600,
            useNativeDriver: false,
          }),
        ])
      )
    );

    const combined = Animated.parallel(animations);
    combined.start();

    return () => combined.stop();
  }, [playing]);

  return (
    <View style={styles.container}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            { height: bar },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    height: 48,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.accentIndigo,
  },
});
