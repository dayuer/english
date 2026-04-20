import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, radii, spacing, typography } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { useAppStore } from '../../stores/app.store';

export default function HomeScreen() {
  const profile = useAppStore((state) => state.profile);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Good morning.</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{profile.level}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 学习进度 */}
        <Card style={styles.progressCard}>
          <Text style={styles.cardLabel}>学习进度</Text>
          <ProgressBar progress={profile.overallProgress} style={styles.progressBar} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.chunks}</Text>
              <Text style={styles.statLabel}>组块</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.connections}</Text>
              <Text style={styles.statLabel}>连结</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.scenes}</Text>
              <Text style={styles.statLabel}>场景</Text>
            </View>
          </View>
        </Card>

        {/* 今日课程 */}
        <SectionTitle title="今日课程" />
        <TouchableOpacity onPress={() => router.push('/lesson/1')} activeOpacity={0.7}>
          <Card style={styles.lessonCard}>
            <View style={styles.iconCircle}>
              <Icon name="coffee" color={colors.accentBlue} size={22} />
            </View>
            <View style={styles.lessonInfo}>
              <Text style={styles.lessonTitle}>Order Coffee</Text>
              <Text style={styles.lessonSub}>基础 · 咖啡馆场景</Text>
            </View>
            <Icon name="chevron-right" color={colors.textMuted} />
          </Card>
        </TouchableOpacity>

        {/* 强化练习 */}
        <SectionTitle title="强化练习" />
        <View style={styles.reinforceGrid}>
          <TouchableOpacity style={styles.reinforceWrap} activeOpacity={0.7} onPress={() => {}}>
            <Card style={styles.reinforceCard}>
              <View style={styles.reinforceIconCircle}>
                <Icon name="mic" color={colors.accentBlue} size={20} />
              </View>
              <Text style={styles.reinforceText}>跟读</Text>
            </Card>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reinforceWrap} activeOpacity={0.7} onPress={() => router.push('/raz-demo')}>
            <Card style={styles.reinforceCard}>
              <View style={styles.reinforceIconCircle}>
                <Icon name="book" color={colors.accentBlue} size={20} />
              </View>
              <Text style={styles.reinforceText}>试听词库</Text>
            </Card>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reinforceWrap} activeOpacity={0.7} onPress={() => {}}>
            <Card style={styles.reinforceCard}>
              <View style={styles.reinforceIconCircle}>
                <Icon name="chart" color={colors.accentBlue} size={20} />
              </View>
              <Text style={styles.reinforceText}>统计</Text>
            </Card>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reinforceWrap} activeOpacity={0.7} onPress={() => {}}>
            <Card style={styles.reinforceCard}>
              <View style={styles.reinforceIconCircle}>
                <Icon name="globe" color={colors.accentBlue} size={20} />
              </View>
              <Text style={styles.reinforceText}>情境</Text>
            </Card>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '800',
    color: colors.textPrimary,
  },
  badge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.accentBlue,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  progressCard: {
    padding: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  cardLabel: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  progressBar: {
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderSubtle,
  },
  lessonCard: {
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  lessonSub: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  reinforceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  reinforceWrap: {
    width: '47%',
  },
  reinforceCard: {
    width: '100%',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  reinforceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reinforceText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});
