import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, radii, spacing, typography, shadows } from '../theme';
import { Icon } from '../components/ui/Icon';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { sampleVocabulary } from '../services/vocabulary';
import { playPronunciation } from '../services/pronunciation';
import { hapticSuccess, hapticError } from '../services/haptics';
import type { VocabularyEntry, RazLevel } from '../types/vocabulary';
import { RAZ_LEVEL_ORDER, razLevelToNumeric } from '../types/vocabulary';

// ─── 常量 ──────────────────────────────────────────────

const QUESTIONS_PER_BOSS = 10;
const TIME_LIMIT_SECONDS = 8;
const PROMOTION_THRESHOLD = 0.7; // 70% 正确率晋级

type Phase = 'intro' | 'battle' | 'verdict';
type BossVerdict = 'promoted' | 'retry' | 'idle';

interface BossQuestion {
  word: VocabularyEntry;
  options: string[];   // 4 个选项（中文翻译）
  correctIndex: number;
}

// ─── Boss 战屏幕 ───────────────────────────────────────

export default function RazBossScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentLevel = (params.level as RazLevel) || 'A';
  const nextLevel = getNextLevel(currentLevel);

  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<BossQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SECONDS);
  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<BossVerdict>('idle');

  // 动画
  const pulseScale = useRef(new Animated.Value(1)).current;
  const timerBar = useRef(new Animated.Value(1)).current;
  const introOpacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Intro 动画 ────────────────────────────────────
  useEffect(() => {
    if (phase === 'intro') {
      Animated.sequence([
        Animated.timing(introOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseScale, { toValue: 1.08, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseScale, { toValue: 1, duration: 800, useNativeDriver: true }),
          ])
        ),
      ]).start();
    }
  }, [phase]);

  // ─── 加载 Boss 题目 ────────────────────────────────
  const loadBossQuestions = useCallback(async () => {
    // 70% 从下一级抽样（挑战新词），30% 从当前级（巩固旧词）
    const newWords = await sampleVocabulary(nextLevel, Math.ceil(QUESTIONS_PER_BOSS * 0.7));
    const oldWords = await sampleVocabulary(currentLevel, QUESTIONS_PER_BOSS - newWords.length);
    const pool = [...newWords, ...oldWords];

    // Fisher-Yates 打乱
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const bossQs: BossQuestion[] = pool.map((word) => {
      const correctTranslation = word.translations[0] || word.word;
      // 从其他词的翻译中取干扰项
      const distractors = pool
        .filter((w) => w.word !== word.word && w.translations[0])
        .map((w) => w.translations[0])
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const options = [...distractors, correctTranslation].sort(() => Math.random() - 0.5);
      return {
        word,
        options,
        correctIndex: options.indexOf(correctTranslation),
      };
    });

    setQuestions(bossQs);
    setQIndex(0);
    setScore(0);
    setTimeLeft(TIME_LIMIT_SECONDS);
    setAnswered(false);
    setSelectedIdx(null);
  }, [currentLevel, nextLevel]);

  // ─── 开始战斗 ──────────────────────────────────────
  const startBattle = useCallback(async () => {
    await loadBossQuestions();
    setPhase('battle');
  }, [loadBossQuestions]);

  // ─── 倒计时 ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'battle' || answered) return;

    // 动画：进度条从 1 → 0
    timerBar.setValue(1);
    Animated.timing(timerBar, {
      toValue: 0,
      duration: TIME_LIMIT_SECONDS * 1000,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          // 超时 = 答错
          handleAnswer(-1);
          return 0;
        }
        return Number((prev - 0.1).toFixed(1));
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, qIndex, answered]);

  // ─── 答题 ──────────────────────────────────────────
  const handleAnswer = useCallback((idx: number) => {
    if (answered) return;
    setAnswered(true);
    setSelectedIdx(idx);
    if (timerRef.current) clearInterval(timerRef.current);

    const currentQ = questions[qIndex];
    if (!currentQ) return;

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      setScore((s) => s + 1);
      hapticSuccess();
      // 播放正确单词发音
      playPronunciation(currentQ.word.word);
    } else {
      hapticError();
    }

    // 延迟进入下一题或结算
    setTimeout(() => {
      if (qIndex + 1 < questions.length) {
        setQIndex((i) => i + 1);
        setTimeLeft(TIME_LIMIT_SECONDS);
        setAnswered(false);
        setSelectedIdx(null);
      } else {
        // 结算
        const finalScore = isCorrect ? score + 1 : score;
        const accuracy = finalScore / questions.length;
        if (accuracy >= PROMOTION_THRESHOLD) {
          setVerdict('promoted');
        } else {
          setVerdict('retry');
        }
        setPhase('verdict');
      }
    }, 1200);
  }, [answered, questions, qIndex, score]);

  // ─── 渲染 ──────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.introContent}>
          <Animated.View style={[styles.bossCircle, { transform: [{ scale: pulseScale }], opacity: introOpacity }]}>
            <Icon name="sparkle" size={40} color={colors.onPrimary} />
          </Animated.View>
          <Text style={styles.introTitle}>Boss 战</Text>
          <Text style={styles.introSubtitle}>
            {currentLevel} → {nextLevel} 晋级挑战
          </Text>
          <View style={styles.introRules}>
            <Text style={styles.ruleText}>• {QUESTIONS_PER_BOSS} 道词汇题</Text>
            <Text style={styles.ruleText}>• 每题限时 {TIME_LIMIT_SECONDS} 秒</Text>
            <Text style={styles.ruleText}>• 答对 {Math.ceil(QUESTIONS_PER_BOSS * PROMOTION_THRESHOLD)} 题即可晋级</Text>
          </View>
          <Button title="开始挑战" onPress={startBattle} />
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'verdict') {
    const accuracy = score / questions.length;
    const isPromoted = verdict === 'promoted';

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.verdictContent}>
          <View style={[styles.verdictCircle, isPromoted ? styles.verdictPromoted : styles.verdictFailed]}>
            <Icon name={isPromoted ? 'trophy' : 'refresh'} size={36} color={colors.onPrimary} />
          </View>
          <Text style={styles.verdictTitle}>
            {isPromoted ? '晋级成功！' : '再接再厉'}
          </Text>
          <Text style={styles.verdictDesc}>
            {isPromoted
              ? `恭喜！你已解锁 ${nextLevel} 级别课程。`
              : `距离 ${nextLevel} 还需要更多练习。`
            }
          </Text>

          <Card style={styles.scoreCard}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>正确率</Text>
              <Text style={[styles.scoreValue, { color: isPromoted ? colors.accentEmerald : colors.accentRose }]}>
                {Math.round(accuracy * 100)}%
              </Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>答对</Text>
              <Text style={styles.scoreValue}>{score} / {questions.length}</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>当前级别</Text>
              <Text style={styles.scoreValue}>{currentLevel}</Text>
            </View>
          </Card>

          <Button
            title={isPromoted ? '继续学习' : '回去复习'}
            onPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ─── 战斗阶段 ──────────────────────────────────────
  const currentQ = questions[qIndex];
  if (!currentQ) return null;

  const progress = (qIndex / questions.length) * 100;
  const timerColor = timeLeft > 4 ? colors.accentEmerald : timeLeft > 2 ? colors.accentAmber : colors.accentRose;

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部进度 */}
      <View style={styles.battleHeader}>
        <View style={{ flex: 1 }}>
          <ProgressBar progress={progress} />
        </View>
        <Text style={styles.stepText}>{qIndex + 1}/{questions.length}</Text>
      </View>

      {/* 倒计时条 */}
      <View style={styles.timerBarTrack}>
        <Animated.View style={[styles.timerBarFill, { flex: timerBar, backgroundColor: timerColor }]} />
      </View>

      {/* 题体 */}
      <View style={styles.battleBody}>
        <TouchableOpacity
          onPress={() => playPronunciation(currentQ.word.word)}
          activeOpacity={0.7}
          style={styles.wordBubble}
        >
          <Text style={styles.wordText}>{currentQ.word.word}</Text>
          <Icon name="volume-up" color={colors.primary} size={20} />
        </TouchableOpacity>

        <Text style={styles.phoneticText}>
          {currentQ.word.phoneticUS ? `/${currentQ.word.phoneticUS}/` : ''}
        </Text>

        <Text style={styles.promptText}>选择正确的中文释义</Text>

        <View style={styles.optionsGrid}>
          {currentQ.options.map((opt, i) => {
            const isCorrect = answered && i === currentQ.correctIndex;
            const isWrong = answered && i === selectedIdx && i !== currentQ.correctIndex;
            const isDimmed = answered && !isCorrect && !isWrong;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.optionBtn,
                  isCorrect && { backgroundColor: `${colors.accentEmerald}18`, borderColor: colors.accentEmerald },
                  isWrong && { backgroundColor: `${colors.accentRose}18`, borderColor: colors.accentRose },
                  isDimmed && { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh, opacity: 0.5 },
                ]}
                onPress={() => handleAnswer(i)}
                disabled={answered}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.optionText,
                  isCorrect && { color: colors.accentEmerald, fontWeight: '700' },
                  isWrong && { color: colors.accentRose, fontWeight: '700' },
                ]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 底部分数 */}
      <View style={styles.battleFooter}>
        <View style={styles.miniScore}>
          <Icon name="check" size={14} color={colors.accentEmerald} />
          <Text style={styles.miniScoreText}>{score}</Text>
        </View>
        <Text style={styles.levelBadge}>{currentLevel} → {nextLevel}</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── 工具函数 ──────────────────────────────────────────

function getNextLevel(current: RazLevel): RazLevel {
  const idx = razLevelToNumeric(current);
  return RAZ_LEVEL_ORDER[Math.min(idx + 1, RAZ_LEVEL_ORDER.length - 1)];
}

// ─── 样式 ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },

  // Intro
  introContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  bossCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    ...shadows.card,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  introSubtitle: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    marginBottom: spacing['3xl'],
  },
  introRules: {
    width: '100%',
    maxWidth: 320,
    marginBottom: spacing['3xl'],
  },
  ruleText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    lineHeight: 28,
  },

  // Battle
  battleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  stepText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textMuted,
    minWidth: 48,
    textAlign: 'right',
  },
  timerBarTrack: {
    height: 4,
    backgroundColor: colors.surfaceContainerHigh,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: 2,
    flexDirection: 'row',
  },
  timerBarFill: {
    height: 4,
    borderRadius: 2,
  },
  battleBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  wordBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.xl,
    borderRadius: radii.xl,
    gap: spacing.md,
    ...shadows.card,
  },
  wordText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  phoneticText: {
    fontSize: typography.sizes.base,
    color: colors.textMuted,
  },
  promptText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  optionsGrid: {
    width: '100%',
    gap: spacing.md,
  },
  optionBtn: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  optionText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
    textAlign: 'center',
    color: colors.textPrimary,
  },
  battleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  miniScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  miniScoreText: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.accentEmerald,
  },
  levelBadge: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.textMuted,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },

  // Verdict
  verdictContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  verdictCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  verdictPromoted: {
    backgroundColor: colors.accentEmerald,
  },
  verdictFailed: {
    backgroundColor: colors.accentAmber,
  },
  verdictTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  verdictDesc: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    lineHeight: 22,
  },
  scoreCard: {
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
    marginBottom: spacing['3xl'],
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  scoreLabel: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
  scoreValue: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
