import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { useMapStore } from '../../stores/map.store';

export default function MapScreen() {
  const { nodes, stats, loadMap } = useMapStore();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadMap(1);
    }, [loadMap]),
  );

  const handleNodePress = (nodeId: number, status: string) => {
    if (status === 'locked') return;
    router.push(`/lesson/${nodeId}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>学习路径</Text>
        <View style={styles.statsBar}>
          <Text style={styles.statText}>🧩 {stats.chunks}</Text>
          <Text style={styles.statText}>🔗 {stats.connections}</Text>
          <Text style={styles.statText}>🔓 {stats.scenes}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {nodes.map((node, index) => {
          const isComplete = node.status === 'completed';
          const isCurrent = node.status === 'current';
          const isLocked = node.status === 'locked';

          return (
            <View key={node.id} style={styles.nodeWrapper}>
              {index !== 0 && (
                <View style={[styles.connector, isLocked ? styles.connectorLocked : styles.connectorActive]} />
              )}

              <TouchableOpacity
                activeOpacity={isLocked ? 1 : 0.8}
                onPress={() => handleNodePress(node.id, node.status)}
                style={[
                  styles.nodeButton,
                  isComplete && styles.nodeComplete,
                  isCurrent && styles.nodeCurrent,
                  isLocked && styles.nodeLocked,
                ]}
              >
                {isComplete && <Icon name="check" color={colors.onPrimary} size={28} />}
                {isCurrent && <Icon name="sparkle" color={colors.onPrimary} size={28} />}
                {isLocked && <Icon name="lock" color={colors.textMuted} size={28} />}
              </TouchableOpacity>

              <View style={styles.nodeLabelWrapper}>
                <Text style={[styles.nodeTitle, isLocked && styles.nodeTitleLocked]}>
                  {node.title}
                </Text>
              </View>
            </View>
          );
        })}
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
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statsBar: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  statText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  nodeWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  connector: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginVertical: spacing.sm,
  },
  connectorActive: {
    backgroundColor: colors.primary,
  },
  connectorLocked: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  nodeButton: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  nodeComplete: {
    backgroundColor: colors.primary,
  },
  nodeCurrent: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  nodeLocked: {
    backgroundColor: colors.surfaceContainerHigh,
    shadowOpacity: 0,
  },
  nodeLabelWrapper: {
    marginTop: spacing.sm,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.lg,
    ...shadows.card,
  },
  nodeTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  nodeTitleLocked: {
    color: colors.textMuted,
  },
});
