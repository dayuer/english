import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Animated } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Button } from '../components/ui/Button';
import { NeuralCanvas } from '../components/interstitial/NeuralCanvas';

const BREATH_CYCLE = [
  { text: '深吸气... 4秒', duration: 4000 },
  { text: '屏息... 7秒', duration: 7000 },
  { text: '缓慢呼气... 8秒', duration: 8000 },
];

export default function InterstitialScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const errorRate = parseFloat(params.errorRate as string) || 0;
  const lessonId = (params.lessonId as string) || '';
  const [phase, setPhase] = useState<'showcase' | 'breathing' | 'ready'>('showcase');
  const [showButton, setShowButton] = useState(false);
  const [breathText, setBreathText] = useState(BREATH_CYCLE[0].text);
  const breathScale = useState(new Animated.Value(0.7))[0];

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (errorRate > 0.4) {
      timers.push(setTimeout(() => setPhase('breathing'), 2000));
      timers.push(setTimeout(() => setPhase('ready'), 7000));
    } else {
      timers.push(setTimeout(() => setPhase('ready'), 3500));
    }

    timers.push(setTimeout(() => setShowButton(true), errorRate > 0.4 ? 7500 : 4000));

    return () => timers.forEach(clearTimeout);
  }, [errorRate]);

  useEffect(() => {
    if (phase !== 'breathing') return;

    let cycleIndex = 0;
    const interval = setInterval(() => {
      cycleIndex = (cycleIndex + 1) % BREATH_CYCLE.length;
      setBreathText(BREATH_CYCLE[cycleIndex].text);
    }, 3000);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathScale, { toValue: 1.2, duration: 3000, useNativeDriver: true }),
        Animated.timing(breathScale, { toValue: 0.7, duration: 5000, useNativeDriver: true }),
      ])
    );
    animation.start();

    return () => {
      clearInterval(interval);
      animation.stop();
    };
  }, [phase]);

  const handleContinue = useCallback(() => {
    router.replace({
      pathname: '/lesson/complete',
      params: lessonId ? { id: lessonId } : {},
    });
  }, [router, lessonId]);

  return (
    <View style={styles.container}>
      <NeuralCanvas width={width} height={height} particleCount={30} />

      {phase === 'showcase' && (
        <View style={styles.showcaseContainer}>
          <Text style={styles.chunkLabel}>新组块已连结</Text>
          <Text style={styles.chunkText}>"I'd like a..."</Text>
        </View>
      )}

      {phase === 'breathing' && (
        <View style={styles.breathContainer}>
          <Animated.View
            style={[
              styles.breathCircle,
              { transform: [{ scale: breathScale }] },
            ]}
          />
          <Text style={styles.breathText}>{breathText}</Text>
        </View>
      )}

      {showButton && (
        <View style={styles.buttonContainer}>
          <Button title="继续" onPress={handleContinue} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showcaseContainer: {
    alignItems: 'center',
    zIndex: 2,
  },
  chunkLabel: {
    fontSize: typography.sizes.sm,
    color: colors.accentEmerald,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  chunkText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  breathContainer: {
    alignItems: 'center',
    zIndex: 2,
  },
  breathCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.primary}15`,
    marginBottom: spacing.xl,
  },
  breathText: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 60,
    zIndex: 3,
  },
});
