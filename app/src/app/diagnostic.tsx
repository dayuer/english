import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ProgressBar } from '../components/ui/ProgressBar';
import { AudioWave } from '../components/ui/AudioWave';
import { Icon } from '../components/ui/Icon';
import { AssemblyQuestion } from '../components/exercise/AssemblyQuestion';
import { colors, typography, spacing, radii, shadows } from '../theme';
import { useDiagnosticStore } from '../stores/diagnostic.store';
import { hapticSuccess, hapticError } from '../services/haptics';
import diagnosticData from '../../assets/diagnostic-quest.json';

type DiagnosticData = {
  questions: {
    type: 'intention' | 'assembly';
    instruction: string;
    audio?: string;
    options?: { text: string; correct: boolean }[];
    fragments?: string[];
    answer?: string[];
    distractors?: string[];
  }[];
  mapNodes: { id: number; icon: string; label: string; concept: string }[];
  sampleLesson: object;
};

const data = diagnosticData as DiagnosticData;

export default function DiagnosticScreen() {
  const router = useRouter();
  const {
    questions, currentIndex, currentElapsed,
    setQuestions, startTimer, stopTimer,
    recordAnswer, nextQuestion, reset, getResults,
  } = useDiagnosticStore();

  const answeredRef = useRef(false);

  useEffect(() => {
    reset();
    setQuestions(data.questions);
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      answeredRef.current = false;
      startTimer();
    }
    return () => stopTimer();
  }, [currentIndex, questions.length]);

  const handleAnswer = useCallback(
    async (correct: boolean) => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      stopTimer();
      recordAnswer(correct);

      correct ? await hapticSuccess() : await hapticError();

      setTimeout(() => {
        const hasMore = nextQuestion();
        if (!hasMore) {
          const results = getResults();
          router.replace({
            pathname: '/diagnostic-result',
            params: {
              accuracy: results.accuracy.toString(),
              avgTime: results.avgTime.toString(),
              correctCount: results.correctCount.toString(),
              totalQuestions: results.totalQuestions.toString(),
            },
          });
        }
      }, 800);
    },
    [currentIndex, stopTimer, recordAnswer, nextQuestion, getResults, router]
  );

  const q = questions[currentIndex];
  if (!q) return null;

  const progress = (currentIndex / questions.length) * 100;
  const timerColor = currentElapsed < 2 ? colors.accentEmerald : colors.accentAmber;

  return (
    <SafeAreaView style={styles.container}>
      {/* 进度 + 计时 */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <ProgressBar progress={progress} />
        </View>
        <View style={styles.timer}>
          <Text style={[styles.timerValue, { color: timerColor }]}>
            {currentElapsed.toFixed(1)}
          </Text>
          <Text style={styles.timerUnit}>s</Text>
        </View>
      </View>

      {/* 题体 */}
      <View style={styles.body}>
        <Text style={styles.instruction}>{q.instruction}</Text>

        {q.type === 'intention' && q.audio && <AudioWave />}

        {q.type === 'intention' && q.audio && (
          <View style={styles.audioRow}>
            <Icon name="volume" size={20} color={colors.primary} />
            <Text style={styles.audioText}>"{q.audio}"</Text>
          </View>
        )}

        {q.type === 'intention' && q.options && (
          <View style={styles.optionsContainer}>
            {q.options.map((opt, i) => (
              <TouchableOpacity
                key={i}
                style={styles.optionButton}
                onPress={() => handleAnswer(opt.correct)}
                disabled={answeredRef.current}
                activeOpacity={0.7}
              >
                <Text style={styles.optionText}>{opt.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {q.type === 'assembly' && (
          <AssemblyQuestion
            fragments={q.fragments || []}
            distractors={q.distractors || []}
            answer={q.answer || []}
            onAnswer={handleAnswer}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: spacing.lg,
    marginBottom: spacing['4xl'],
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 56,
  },
  timerValue: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as any,
  },
  timerUnit: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginLeft: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  instruction: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  audioText: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
  },
  optionsContainer: {
    width: '100%',
    maxWidth: 340,
    gap: 10,
  },
  optionButton: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    ...shadows.card,
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    textAlign: 'left',
  },
});
