import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, radii, spacing, typography, shadows } from '../theme';
import { Icon } from '../components/ui/Icon';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { AudioWave } from '../components/ui/AudioWave';
import { Chip } from '../components/ui/Chip';
import { sampleVocabulary } from '../services/vocabulary';
import { playPronunciation } from '../services/pronunciation';
import { hapticSuccess, hapticError } from '../services/haptics';
import { recordPromotion, isInCooldown, getRazState } from '../db/repositories/raz.repo';
import type { VocabularyEntry, RazLevel } from '../types/vocabulary';
import { RAZ_LEVEL_ORDER, razLevelToNumeric } from '../types/vocabulary';

// ─── 设计文档对齐参数 ──────────────────────────────────

const QUESTIONS_PER_BOSS = 15;                  // 文档 §1.3: 15 个词
const TOTAL_TIME_SECONDS = 120;                  // 文档 §1.3: 限时 120 秒
const PROMOTION_THRESHOLD = 0.85;               // 文档 §1.3: 正确率 ≥ 85%
const COOLDOWN_HOURS = 48;                       // 文档 §1.3: 48h 冷却

type QuestionType = 'translation' | 'listen' | 'assembly';
type Phase = 'intro' | 'cooldown' | 'battle' | 'verdict';
type BossVerdict = 'promoted' | 'retry' | 'idle';

interface BossQuestion {
  type: QuestionType;
  word: VocabularyEntry;
  options?: string[];
  correctIndex?: number;
  fragments?: string[];
  distractors?: string[];
  answer?: string[];
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
  const [totalTime, setTotalTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME_SECONDS);
  const [answered, setAnswered] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedFragments, setSelectedFragments] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<BossVerdict>('idle');
  const [sprintScore, setSprintScore] = useState(0);

  // 动画
  const pulseScale = useRef(new Animated.Value(1)).current;
  const introOpacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // ─── 冷却检查 ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      const cooled = await isInCooldown(1, currentLevel, nextLevel);
      if (cooled) setPhase('cooldown');
    })();
  }, []);

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
    // 70% 从下一级（挑战新词），30% 从当前级（巩固）
    const newCount = Math.ceil(QUESTIONS_PER_BOSS * 0.7);
    const oldCount = QUESTIONS_PER_BOSS - newCount;
    const newWords = await sampleVocabulary(nextLevel, newCount);
    const oldWords = await sampleVocabulary(currentLevel, oldCount);
    const pool = [...newWords, ...oldWords];

    // Fisher-Yates 打乱
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // 分配题型：均分三种
    const bossQs: BossQuestion[] = pool.map((word, idx) => {
      const typeIdx = idx % 3;

      if (typeIdx === 1) {
        // 听音辨义：播放单词发音，选中文释义
        const correctTranslation = word.translations[0] || word.word;
        const distractors = pool
          .filter((w) => w.word !== word.word && w.translations[0])
          .map((w) => w.translations[0])
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        const options = [...distractors, correctTranslation].sort(() => Math.random() - 0.5);
        return { type: 'listen' as const, word, options, correctIndex: options.indexOf(correctTranslation) };
      }

      if (typeIdx === 2 && word.word.split(' ').length <= 3) {
        // 碎片组装：将单词拆成字母碎片，加干扰项
        const letters = word.word.split('');
        const distractorLetters = pool
          .filter((w) => w.word !== word.word)
          .flatMap((w) => w.word.split(''))
          .filter((l) => !letters.includes(l))
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.max(2, Math.floor(letters.length * 0.5)));
        return {
          type: 'assembly' as const,
          word,
          fragments: [...letters],
          distractors: distractorLetters,
          answer: letters,
        };
      }

      // 默认：翻译选择题
      const correctTranslation = word.translations[0] || word.word;
      const distractors = pool
        .filter((w) => w.word !== word.word && w.translations[0])
        .map((w) => w.translations[0])
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const options = [...distractors, correctTranslation].sort(() => Math.random() - 0.5);
      return { type: 'translation' as const, word, options, correctIndex: options.indexOf(correctTranslation) };
    });

    setQuestions(bossQs);
    setQIndex(0);
    setScore(0);
    setTimeLeft(TOTAL_TIME_SECONDS);
    setAnswered(false);
    setSelectedIdx(null);
    setSelectedFragments([]);
  }, [currentLevel, nextLevel]);

  // ─── 开始战斗 ──────────────────────────────────────
  const startBattle = useCallback(async () => {
    await loadBossQuestions();
    startTimeRef.current = Date.now();
    setPhase('battle');
  }, [loadBossQuestions]);

  // ─── 总倒计时 ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'battle') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          // 总时间耗尽 → 直接结算
          clearInterval(timerRef.current!);
          finishBattle();
          return 0;
        }
        return Number((prev - 0.1).toFixed(1));
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // ─── 结算 ──────────────────────────────────────────
  const finishBattle = useCallback((overrideScore?: number) => {
    const finalScore = overrideScore ?? score;
    const accuracy = finalScore / questions.length;
    const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
    // sprint_score = accuracy × speed_factor (speed_factor: 越快越高，上限 1.0)
    const speedFactor = Math.max(0, 1 - elapsedSec / (TOTAL_TIME_SECONDS * 2));
    const sScore = Math.round(accuracy * 100 * (0.7 + 0.3 * speedFactor));

    setSprintScore(sScore);

    const passed = accuracy >= PROMOTION_THRESHOLD;
    setVerdict(passed ? 'promoted' : 'retry');
    setPhase('verdict');

    // 写库
    (async () => {
      try {
        await recordPromotion({
          userId: 1,
          fromLevel: currentLevel,
          toLevel: nextLevel,
          sprintScore: sScore,
          passed,
          vocabMasterySnapshot: { accuracy: Math.round(accuracy * 100), elapsedSec: Math.round(elapsedSec) },
        });
      } catch (err) {
        console.warn('[Boss战] 写入raz_promotions失败:', err);
      }
    })();
  }, [score, questions.length, currentLevel, nextLevel]);

  // ─── 答题 ──────────────────────────────────────────
  const handleAnswer = useCallback((idx: number) => {
    if (answered) return;
    setAnswered(true);
    setSelectedIdx(idx);

    const currentQ = questions[qIndex];
    if (!currentQ) return;

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      setScore((s) => s + 1);
      hapticSuccess();
      playPronunciation(currentQ.word.word);
    } else {
      hapticError();
    }

    setTimeout(() => {
      if (qIndex + 1 < questions.length) {
        setQIndex((i) => i + 1);
        setAnswered(false);
        setSelectedIdx(null);
        setSelectedFragments([]);
      } else {
        finishBattle(isCorrect ? score + 1 : score);
      }
    }, 800);
  }, [answered, questions, qIndex, score, finishBattle]);

  // ─── 碎片组装答题 ──────────────────────────────────
  const handleAssemblySelect = useCallback((fragment: string) => {
    if (answered) return;
    setSelectedFragments((prev) => [...prev, fragment]);
  }, [answered]);

  const handleAssemblySubmit = useCallback(() => {
    if (answered) return;
    const currentQ = questions[qIndex];
    if (!currentQ || !currentQ.answer) return;

    const isCorrect = selectedFragments.join('') === currentQ.answer.join('');
    if (isCorrect) {
      setScore((s) => s + 1);
      hapticSuccess();
      playPronunciation(currentQ.word.word);
    } else {
      hapticError();
    }
    setAnswered(true);

    setTimeout(() => {
      if (qIndex + 1 < questions.length) {
        setQIndex((i) => i + 1);
        setAnswered(false);
        setSelectedFragments([]);
      } else {
        finishBattle(isCorrect ? score + 1 : score);
      }
    }, 800);
  }, [answered, questions, qIndex, score, selectedFragments, finishBattle]);

  // ─── 渲染 ──────────────────────────────────────────

  if (phase === 'cooldown') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.introContent}>
          <View style={[styles.bossCircle, { backgroundColor: colors.accentAmber }]}>
            <Icon name="stop" size={40} color={colors.onPrimary} />
          </View>
          <Text style={styles.introTitle}>冷却中</Text>
          <Text style={styles.introSubtitle}>
            距离下次 {currentLevel} → {nextLevel} 挑战还需等待 {COOLDOWN_HOURS} 小时
          </Text>
          <Button title="返回" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.ruleText}>• {QUESTIONS_PER_BOSS} 道词汇题（听音/翻译/组装）</Text>
            <Text style={styles.ruleText}>• 总限时 {TOTAL_TIME_SECONDS} 秒</Text>
            <Text style={styles.ruleText}>• 答对 {Math.ceil(QUESTIONS_PER_BOSS * PROMOTION_THRESHOLD)} 题即可晋级</Text>
            <Text style={styles.ruleText}>• 未通过需等待 {COOLDOWN_HOURS}h 后重试</Text>
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
              : `距离 ${nextLevel} 还需更多练习。${COOLDOWN_HOURS}h 后可重试。`
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
              <Text style={styles.scoreLabel}>Sprint Score</Text>
              <Text style={styles.scoreValue}>{sprintScore}</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>级别变化</Text>
              <Text style={styles.scoreValue}>{currentLevel} → {isPromoted ? nextLevel : currentLevel}</Text>
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
  const timerColor = timeLeft > 60 ? colors.accentEmerald : timeLeft > 30 ? colors.accentAmber : colors.accentRose;
  const timerPct = timeLeft / TOTAL_TIME_SECONDS;

  const renderQuestionBody = () => {
    if (currentQ.type === 'listen') {
      // 听音辨义：先播放发音，再选中文释义
      return (
        <>
          <TouchableOpacity
            onPress={() => playPronunciation(currentQ.word.word)}
            activeOpacity={0.7}
            style={styles.wordBubble}
          >
            <AudioWave barCount={7} />
            <Icon name="volume-up" color={colors.primary} size={24} />
          </TouchableOpacity>
          <Text style={styles.promptText}>听发音，选择正确的中文释义</Text>
          {renderOptions()}
        </>
      );
    }

    if (currentQ.type === 'assembly' && currentQ.fragments) {
      // 碎片组装
      const allFrags = [...currentQ.fragments, ...(currentQ.distractors || [])].sort(() => Math.random() - 0.5);
      return (
        <>
          <Text style={styles.promptText}>拼出正确的英文单词</Text>
          <Text style={styles.assemblyHint}>{currentQ.word.translations[0]}</Text>
          <View style={styles.dropZone}>
            <Text style={styles.assembledText}>
              {selectedFragments.length > 0 ? selectedFragments.join('') : '点击字母拼出单词'}
            </Text>
          </View>
          <View style={styles.pool}>
            {allFrags.map((f, i) => (
              <Chip
                key={`f-${i}`}
                label={f}
                variant="fragment"
                selected={selectedFragments.includes(f) && selectedFragments.indexOf(f) === selectedFragments.lastIndexOf(f) ? false : false}
                onPress={() => handleAssemblySelect(f)}
                style={styles.poolChip}
              />
            ))}
          </View>
          {!answered && (
            <TouchableOpacity
              style={[styles.submitBtn, selectedFragments.length === 0 && styles.submitBtnDisabled]}
              onPress={handleAssemblySubmit}
              disabled={selectedFragments.length === 0}
            >
              <Text style={styles.submitBtnText}>确认</Text>
            </TouchableOpacity>
          )}
        </>
      );
    }

    // 翻译选择题（默认）
    return (
      <>
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
        {renderOptions()}
      </>
    );
  };

  const renderOptions = () => {
    if (!currentQ.options) return null;
    return (
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
                isCorrect && { color: colors.accentEmerald, fontWeight: typography.weights.bold },
                isWrong && { color: colors.accentRose, fontWeight: typography.weights.bold },
              ]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部进度 + 倒计时 */}
      <View style={styles.battleHeader}>
        <View style={{ flex: 1 }}>
          <ProgressBar progress={progress} />
        </View>
        <View style={styles.timerBox}>
          <Text style={[styles.timerValue, { color: timerColor }]}>{Math.ceil(timeLeft)}</Text>
          <Text style={styles.timerUnit}>s</Text>
        </View>
      </View>

      {/* 总时间条 */}
      <View style={styles.timerBarTrack}>
        <View style={[styles.timerBarFill, { width: `${timerPct * 100}%`, backgroundColor: timerColor }]} />
      </View>

      {/* 题体 */}
      <View style={styles.battleBody}>
        <Text style={styles.qTypeBadge}>
          {currentQ.type === 'listen' ? '听音辨义' : currentQ.type === 'assembly' ? '碎片组装' : '词义选择'}
        </Text>
        {renderQuestionBody()}
      </View>

      {/* 底部分数 */}
      <View style={styles.battleFooter}>
        <View style={styles.miniScore}>
          <Icon name="check" size={14} color={colors.accentEmerald} />
          <Text style={styles.miniScoreText}>{score} / {qIndex + 1}</Text>
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

  // Intro / Cooldown
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
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  introSubtitle: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    marginBottom: spacing['3xl'],
    textAlign: 'center',
  },
  introRules: {
    width: '100%',
    maxWidth: 320,
    marginBottom: spacing['3xl'],
  },
  ruleText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    lineHeight: typography.lineHeights.spacious,
  },

  // Battle
  battleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 56,
  },
  timerValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'] as any,
  },
  timerUnit: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginLeft: 1,
  },
  timerBarTrack: {
    height: 4,
    backgroundColor: colors.surfaceContainerHigh,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: 2,
    overflow: 'hidden',
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
  qTypeBadge: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
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
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
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
  assemblyHint: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  dropZone: {
    width: '100%',
    minHeight: 56,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  assembledText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  pool: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  poolChip: {
    marginHorizontal: 2,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['3xl'],
    borderRadius: radii.lg,
    marginTop: spacing.md,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: colors.onPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  optionsGrid: {
    width: '100%',
    gap: spacing.md,
  },
  optionBtn: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
  },
  optionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
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
    fontWeight: typography.weights.bold,
    color: colors.accentEmerald,
  },
  levelBadge: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
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
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  verdictDesc: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    lineHeight: typography.lineHeights.normal,
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
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
});
