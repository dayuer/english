import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radii, spacing, typography } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { useLessonStore } from '../../stores/lesson.store';
import { ShadowingExercise } from '../../components/exercise/ShadowingExercise';
import diagnosticData from '../../../assets/diagnostic-quest.json';

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const {
    progress, prompt, answerPool, selectedFragments,
    feedback, shadowingVerdict, isRecording, exercises, exerciseIndex,
    selectFragment, unselectFragment, checkAnswer, nextQuestion, loadExercises,
  } = useLessonStore();

  // Load lesson data on mount
  useEffect(() => {
    const lesson = diagnosticData.sampleLesson;
    loadExercises(lesson.lessonId, lesson.exercises.map((ex) => ({
      type: ex.type,
      instruction: ex.instruction,
      prompt: ex.prompt,
      l1: ex.l1,
      targetChunk: ex.targetChunk,
      answer: ex.answer,
      interferenceOptions: ex.interferenceOptions,
    })));
  }, []);

  const handleClose = () => {
    router.back();
  };

  const currentExercise = exercises[exerciseIndex];
  const totalExercises = exercises.length;
  const currentStep = exerciseIndex + 1;

  const handleAction = () => {
    if (feedback === 'idle') {
      if (currentExercise) {
        checkAnswer(currentExercise.answer);
      }
    } else {
      const done = nextQuestion();
      if (!done) {
        // All exercises done → go to interstitial → lesson/complete
        router.replace({
          pathname: '/interstitial',
          params: { errorRate: '0', lessonId: String(id) },
        });
      }
    }
  };

  const isFeedbackVisible = feedback !== 'idle' || (shadowingVerdict !== 'idle');
  const isCorrect = feedback === 'correct' || shadowingVerdict === 'good' || shadowingVerdict === 'skip';
  const isSkip = shadowingVerdict === 'skip';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Icon name="close" color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.stepCounter}>{currentStep} of {totalExercises}</Text>
      </View>

      {/* Thin progress bar */}
      <ProgressBar progress={progress} style={styles.thinProgress} />

      {/* Content Area */}
      <View style={styles.content}>
        {id === 'shadowing_demo' ? (
          <ShadowingExercise
            promptText="请发音复刻以下这句"
            expectedText="i would like an iced americano please"
            audioLocalPath="mock/path/audio.mp3"
          />
        ) : (
          <>
            <Text style={styles.instruction}>将碎片拼成完整的句子</Text>
            <Text style={styles.promptText}>{prompt}</Text>

            <View style={styles.dropZone}>
              {selectedFragments.length === 0 ? (
                <View style={styles.emptyLine} />
              ) : (
                <View style={styles.selectedRow}>
                  {selectedFragments.map((fragId) => {
                    const frag = answerPool.find((f) => f.id === fragId);
                    return (
                      <Chip
                        key={`ans-${fragId}`}
                        label={frag?.text || ''}
                        variant="inAnswer"
                        onPress={() => unselectFragment(fragId)}
                        style={styles.selectedChip}
                      />
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.pool}>
              {answerPool.map((frag) => (
                <Chip
                  key={`pool-${frag.id}`}
                  label={frag.text}
                  variant="fragment"
                  selected={frag.used}
                  onPress={() => selectFragment(frag.id)}
                  style={styles.poolChip}
                />
              ))}
            </View>
          </>
        )}
      </View>

      {/* Bottom Action Area */}
      <View style={[
        styles.actionArea,
        isFeedbackVisible && (isCorrect ? styles.actionCorrect : styles.actionWrong),
      ]}>
        {isFeedbackVisible && (
          <View style={styles.feedbackBanner}>
            <View style={[styles.feedbackIconCircle, isSkip && { backgroundColor: colors.surfaceContainerHigh }]}>
              <Icon
                name={isSkip ? 'fast-forward' : (isCorrect ? 'check' : 'close')}
                color={isSkip ? colors.textPrimary : (isCorrect ? colors.accentEmerald : colors.accentRose)}
                size={28}
              />
            </View>
            <Text style={[
              styles.feedbackText,
              isSkip ? { color: colors.textPrimary } : (isCorrect ? styles.feedbackTextCorrect : styles.feedbackTextWrong),
            ]}>
              {isSkip ? '网络不畅，已为你跳过此题。' : (isCorrect ? '太棒了！发音很标准。' : '再试一次，注意重音。')}
            </Text>
          </View>
        )}
        <Button
          title={isFeedbackVisible ? '继续' : '检查'}
          onPress={handleAction}
          disabled={(selectedFragments.length === 0 && feedback === 'idle' && shadowingVerdict === 'idle') || isRecording}
          variant="primary"
          style={isFeedbackVisible ? (isSkip ? styles.btnSkip : (isCorrect ? styles.btnCorrect : styles.btnWrong)) : undefined}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  stepCounter: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  thinProgress: {
    marginBottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    alignItems: 'center',
  },
  instruction: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  promptText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    lineHeight: typography.lineHeights.spacious,
  },
  dropZone: {
    minHeight: 160,
    width: '100%',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLine: {
    marginTop: spacing['2xl'],
  },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  pool: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  poolChip: {
    marginHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  actionArea: {
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  actionCorrect: {
    backgroundColor: colors.correctBg,
  },
  actionWrong: {
    backgroundColor: colors.wrongBg,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  feedbackIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  feedbackText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  feedbackTextCorrect: {
    color: colors.accentEmerald,
  },
  feedbackTextWrong: {
    color: colors.accentRose,
  },
  btnCorrect: {
    backgroundColor: colors.accentEmerald,
    shadowColor: colors.accentEmerald,
  },
  btnWrong: {
    backgroundColor: colors.accentRose,
    shadowColor: colors.accentRose,
  },
  btnSkip: {
    backgroundColor: colors.surfaceContainerHighest,
  },
});
