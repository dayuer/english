import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, radii, spacing, typography } from '../../theme';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';

const WORD_ANALYSIS = [
  { word: "I'd", phonetic: '/aɪd/', status: 'perfect' as const },
  { word: 'like', phonetic: '/laɪk/', status: 'perfect' as const },
  { word: 'an', phonetic: '/ən/', status: 'good' as const, note: 'Vowel slightly short' },
  { word: 'iced', phonetic: '/aɪst/', status: 'practice' as const, note: 'Missing final /t/' },
];

export default function AnalysisScreen() {
  const score = 92;
  const CIRCLE_RADIUS = 70;
  const circumference = 2 * Math.PI * CIRCLE_RADIUS;
  const ringOffset = circumference * (1 - score / 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Pronunciation Analysis</Text>

        {/* Score Ring */}
        <View style={styles.scoreContainer}>
          <View style={styles.ringWrapper}>
            <Svg width={160} height={160} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Defs>
                <LinearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={colors.primary} />
                  <Stop offset="100%" stopColor={colors.primaryDim} />
                </LinearGradient>
              </Defs>
              <Circle cx={80} cy={80} r={CIRCLE_RADIUS} stroke={colors.surfaceContainerHigh} strokeWidth={6} fill="none" />
              <Circle
                cx={80} cy={80} r={CIRCLE_RADIUS}
                stroke="url(#scoreGrad)" strokeWidth={6} fill="none"
                strokeDasharray={circumference} strokeDashoffset={ringOffset} strokeLinecap="round"
              />
            </Svg>
            <View style={styles.scoreInner}>
              <Text style={styles.scoreNumber}>{score}</Text>
              <Text style={styles.scoreSuffix}>%</Text>
            </View>
          </View>
          <Text style={styles.scoreLabel}>ACCURACY</Text>
        </View>

        {/* Result */}
        <Text style={styles.resultTitle}>Excellent Clarity</Text>
        <Text style={styles.resultDesc}>
          Your pronunciation demonstrates strong muscle memory. Focus on vowel precision and final consonants.
        </Text>

        {/* Phonemic Breakdown */}
        <Card style={styles.analysisCard}>
          <View style={styles.analysisHeader}>
            <Icon name="volume-up" color={colors.primary} size={18} />
            <Text style={styles.analysisTitle}>PHONEMIC BREAKDOWN</Text>
          </View>

          {WORD_ANALYSIS.map((item, i) => (
            <View key={i} style={styles.wordRow}>
              <View style={[styles.accentBar, { backgroundColor: statusColor(item.status) }]} />
              <View style={styles.wordInfo}>
                <View style={styles.wordTop}>
                  <Text style={styles.wordName}>{item.word}</Text>
                  <Text style={styles.phonetic}>{item.phonetic}</Text>
                </View>
                {item.note && (
                  <Text style={[styles.wordNote, { color: statusColor(item.status) }]}>{item.note}</Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.status)}15` }]}>
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                  {item.status === 'perfect' ? 'Perfect' : item.status === 'good' ? 'Good' : 'Practice'}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function statusColor(status: 'perfect' | 'good' | 'practice') {
  switch (status) {
    case 'perfect': return colors.statusPerfect;
    case 'good': return colors.statusGood;
    case 'practice': return colors.statusPractice;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['4xl'],
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    alignSelf: 'flex-start',
    marginBottom: spacing['2xl'],
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  ringWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreInner: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
  },
  scoreSuffix: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.primary,
  },
  scoreLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
  resultTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  resultDesc: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing['2xl'],
  },
  analysisCard: {
    padding: spacing.xl,
    width: '100%',
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  analysisTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingLeft: spacing.sm,
  },
  accentBar: {
    width: 3,
    height: 40,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  wordInfo: {
    flex: 1,
  },
  wordTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  wordName: {
    fontSize: typography.sizes.lg,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  phonetic: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  wordNote: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
});
