import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { colors, typography, spacing } from '../theme';
import { calculateDiagnosticResult, levelDescriptions } from '../services/elo';

export default function DiagnosticResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const accuracy = parseFloat(params.accuracy as string) || 0;
  const avgTime = parseFloat(params.avgTime as string) || 0;
  const correctCount = parseInt(params.correctCount as string) || 0;

  const result = calculateDiagnosticResult(accuracy, avgTime);
  const description = levelDescriptions[result.level] || '';
  const knownChunks = correctCount * 4;

  const circumference = 339.292;
  const ringOffset = circumference * (1 - accuracy);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 准确率环 */}
        <View style={styles.ringContainer}>
          <Svg width={120} height={120} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Defs>
              <LinearGradient id="resultGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={colors.primary} />
                <Stop offset="100%" stopColor={colors.accentSky} />
              </LinearGradient>
            </Defs>
            <Circle cx={60} cy={60} r={54} stroke={colors.surfaceContainerHigh} strokeWidth={6} fill="none" />
            <Circle
              cx={60} cy={60} r={54}
              stroke="url(#resultGrad)" strokeWidth={6} fill="none"
              strokeDasharray={circumference} strokeDashoffset={ringOffset} strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.levelText}>{result.level}</Text>
        </View>

        <Text style={styles.title}>神经校准完成</Text>
        <Text style={styles.description}>{description}</Text>

        {/* 统计卡组 */}
        <View style={styles.statsRow}>
          <StatCard value={`${Math.round(accuracy * 100)}%`} label="准确率" />
          <StatCard value={`${avgTime.toFixed(1)}s`} label="平均反应" />
          <StatCard value={`${knownChunks}`} label="已知组块" />
        </View>

        <Button title="开始学习路径" onPress={() => router.replace('/(tabs)/home')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['4xl'],
  },
  ringContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  levelText: {
    position: 'absolute',
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.primary,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeights.normal,
    marginBottom: spacing['2xl'],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['3xl'],
  },
});
