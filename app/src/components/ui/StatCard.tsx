import React from 'react';
import { View, Text, StyleSheet, ViewStyle, GestureResponderEvent } from 'react-native';
import { Icon, IconName } from './Icon';
import { Card } from './Card';
import { colors, spacing, typography } from '../../theme';

interface StatCardProps {
  icon?: IconName;
  value: string;
  label: string;
  style?: ViewStyle | ViewStyle[];
}

/** 三行竖排统计卡：icon（可选）+ 数值 + 标签，自带 Card 壳。 */
export function StatCard({ icon, value, label, style }: StatCardProps) {
  return (
    <Card style={[styles.container, style] as any}>
      {icon && <Icon name={icon} size={18} color={colors.primary} />}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 18,
    paddingHorizontal: spacing['2xl'],
    minWidth: 90,
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
