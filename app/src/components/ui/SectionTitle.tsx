import React from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface SectionTitleProps {
  title: string;
  style?: ViewStyle;
}

/** 区块标题：lg + bold + textSecondary，统一 marginBottom。 */
export function SectionTitle({ title, style }: SectionTitleProps) {
  return <Text style={[styles.title, style]}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
});
