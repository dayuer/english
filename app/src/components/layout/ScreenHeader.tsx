import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, IconName } from '../ui/Icon';
import { colors, spacing, typography } from '../../theme';

interface ScreenHeaderProps {
  title?: string;
  leftIcon?: IconName;
  onLeftPress?: () => void;
  centerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * 三段式屏幕头部：left（返回/关闭）+ center（标题或自定义）+ right（操作或占位）。
 * 不使用原生 Header，不含 borderBottom。
 */
export function ScreenHeader({
  title,
  leftIcon = 'chevron-left',
  onLeftPress,
  centerContent,
  rightContent,
  style,
}: ScreenHeaderProps) {
  const router = useRouter();
  const handleLeft = onLeftPress ?? (() => router.back());

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity onPress={handleLeft} style={styles.side}>
        <Icon name={leftIcon} size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.center}>
        {centerContent ?? (title ? <Text style={styles.title}>{title}</Text> : null)}
      </View>

      <View style={styles.side}>
        {rightContent ?? null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  side: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
