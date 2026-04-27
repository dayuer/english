import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { Icon } from '../../components/ui/Icon';
import { colors, typography, spacing } from '../../theme';
import { updateLessonStatus, getNextLesson } from '../../db/repositories/lesson.repo';
import { LessonStatus } from '../../types/lesson';

export default function LessonCompleteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const hasCompleted = useRef(false);

  useEffect(() => {
    if (hasCompleted.current || !id) return;
    hasCompleted.current = true;

    const lessonId = parseInt(id, 10);
    if (isNaN(lessonId)) return;

    (async () => {
      await updateLessonStatus(lessonId, LessonStatus.Consumed);
      const next = await getNextLesson(1);
      if (next) {
        await updateLessonStatus(next.id, LessonStatus.Available);
      }
    })();
  }, [id]);

  const handleBackToMap = () => {
    router.replace('/(tabs)/map');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <Icon name="check" size={32} color={colors.onPrimary} />
        </View>
        <Text style={styles.title}>课程完成！</Text>

        <View style={styles.statsRow}>
          <StatCard icon="sparkle" value="+20" label="经验值" />
          <StatCard icon="chart" value="100%" label="准确率" />
          <StatCard icon="cube" value="+4" label="组块" />
        </View>

        <Button title="返回学习路径" onPress={handleBackToMap} />
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
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing['3xl'],
  },
});
