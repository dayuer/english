import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, radii, spacing, typography } from '../theme';
import { Icon } from '../components/ui/Icon';
import { Card } from '../components/ui/Card';
import { getVocabularyByLevel } from '../services/vocabulary';
import { playPronunciation } from '../services/pronunciation';
import type { VocabularyEntry, RazLevel } from '../types/vocabulary';
import { RAZ_LEVEL_ORDER } from '../types/vocabulary';

const WORDS_PER_CHAPTER = 20;

export default function RazDemoScreen() {
  const router = useRouter();
  const [level, setLevel] = useState<RazLevel>('AA');
  const [allWords, setAllWords] = useState<VocabularyEntry[]>([]);
  const [chapter, setChapter] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLevel(level);
  }, [level]);

  const loadLevel = async (lvl: RazLevel) => {
    setLoading(true);
    setChapter(0);
    const words = await getVocabularyByLevel(lvl);
    setAllWords(words);
    setLoading(false);
  };

  // 按章节分页
  const totalChapters = Math.ceil(allWords.length / WORDS_PER_CHAPTER);
  const chapterWords = useMemo(() => {
    const start = chapter * WORDS_PER_CHAPTER;
    return allWords.slice(start, start + WORDS_PER_CHAPTER);
  }, [allWords, chapter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" color={colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>RAZ 词库引擎</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 统计信息 */}
        <Text style={styles.desc}>
          29 个 RAZ 分级词库 (AA - Z2)，共 12,526 词。当前 Level {level}：{allWords.length} 词 / {totalChapters} 章。
        </Text>

        {/* Level Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levelSelector}>
          {RAZ_LEVEL_ORDER.map((lvl) => (
            <TouchableOpacity 
              key={lvl} 
              style={[styles.levelBtn, level === lvl && styles.levelBtnActive]}
              onPress={() => setLevel(lvl)}
            >
              <Text style={[styles.levelText, level === lvl && styles.levelTextActive]}>{lvl}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Chapter Selector */}
        {totalChapters > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chapterSelector}>
            {Array.from({ length: totalChapters }, (_, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.chapterBtn, chapter === i && styles.chapterBtnActive]}
                onPress={() => setChapter(i)}
              >
                <Text style={[styles.chapterText, chapter === i && styles.chapterTextActive]}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Word List */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.wordGrid}>
            {chapterWords.map((w, idx) => (
              <TouchableOpacity key={idx} onPress={() => playPronunciation(w.word)} activeOpacity={0.7} style={{ width: '48%' }}>
                <Card style={styles.wordCard}>
                  <View style={styles.wordHeader}>
                    <Text style={styles.wordTitle} numberOfLines={1}>{w.word}</Text>
                    <Icon name="volume-up" color={colors.primary} size={16} />
                  </View>
                  <Text style={styles.wordTranslation} numberOfLines={1}>{w.translations?.[0] || '暂无释义'}</Text>
                  <Text style={styles.wordDifficulty}>{w.phoneticUS ? `/${w.phoneticUS}/` : level}</Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 翻页导航 */}
        {totalChapters > 1 && !loading && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageBtn, chapter === 0 && styles.pageBtnDisabled]}
              onPress={() => chapter > 0 && setChapter(chapter - 1)}
              disabled={chapter === 0}
            >
              <Text style={[styles.pageBtnText, chapter === 0 && styles.pageBtnTextDisabled]}>← 上一章</Text>
            </TouchableOpacity>
            <Text style={styles.pageInfo}>{chapter + 1} / {totalChapters}</Text>
            <TouchableOpacity
              style={[styles.pageBtn, chapter >= totalChapters - 1 && styles.pageBtnDisabled]}
              onPress={() => chapter < totalChapters - 1 && setChapter(chapter + 1)}
              disabled={chapter >= totalChapters - 1}
            >
              <Text style={[styles.pageBtnText, chapter >= totalChapters - 1 && styles.pageBtnTextDisabled]}>下一章 →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
  },
  backBtn: { padding: spacing.xs },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.textPrimary },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
  desc: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: typography.lineHeights.tight },

  // 级别选择器
  levelSelector: { paddingBottom: spacing.md, gap: spacing.sm },
  levelBtn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderRadius: radii.full, backgroundColor: colors.surfaceContainer,
  },
  levelBtnActive: { backgroundColor: colors.primaryContainer },
  levelText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.textSecondary },
  levelTextActive: { color: colors.primary },

  // 章节选择器
  chapterSelector: { paddingBottom: spacing.lg, gap: spacing.xs },
  chapterBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  chapterBtnActive: { backgroundColor: colors.primary },
  chapterText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.textSecondary },
  chapterTextActive: { color: colors.onPrimary },

  // 词汇网格
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  wordCard: { padding: spacing.lg },
  wordHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  wordTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.textPrimary, flex: 1, marginRight: spacing.xs },
  wordTranslation: { fontSize: typography.sizes.xs, color: colors.textSecondary, marginBottom: 4 },
  wordDifficulty: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, color: colors.textMuted, textTransform: 'uppercase' },

  // 翻页
  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.xl, paddingVertical: spacing.lg,
  },
  pageBtn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderRadius: radii.lg, backgroundColor: colors.surfaceContainer,
  },
  pageBtnDisabled: { opacity: 0.3 },
  pageBtnText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.primary },
  pageBtnTextDisabled: { color: colors.textMuted },
  pageInfo: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.textSecondary },
});
