import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, shadows, typography, spacing } from '../../theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'interest' | 'fragment' | 'inAnswer';
  style?: ViewStyle;
}

export function Chip({ label, selected, onPress, disabled, variant = 'interest', style }: ChipProps) {
  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const getContainerStyle = () => {
    switch (variant) {
      case 'inAnswer':
        return [styles.chip, styles.inAnswer];
      case 'fragment':
        return [styles.chip, styles.fragment, selected && styles.fragmentSelected];
      case 'interest':
      default:
        return [styles.chip, styles.interest, selected && styles.interestSelected];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'inAnswer':
        return [styles.text, styles.textInAnswer];
      case 'fragment':
        return [styles.text, styles.textFragment];
      case 'interest':
      default:
        return [styles.text, selected ? styles.textInterestSelected : styles.textInterest];
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || (variant === 'fragment' && selected)}
      style={[getContainerStyle(), style]}
    >
      <Text style={getTextStyle()}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.full, // Will default to 9999 for interest/inAnswer, override later if needed
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  // Interest Variants
  interest: {
    backgroundColor: colors.bgCard,
    ...shadows.card,
  },
  interestSelected: {
    backgroundColor: colors.primaryContainer,
  },
  textInterest: {
    color: colors.textSecondary,
  },
  textInterestSelected: {
    color: colors.primary,
  },
  // Fragment Variants (used in pool)
  fragment: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md, // 12px
    ...shadows.card,
  },
  fragmentSelected: {
    opacity: 0.2, // dim when used
  },
  textFragment: {
    color: colors.textPrimary,
  },
  // In Answer Variants
  inAnswer: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.md,
  },
  textInAnswer: {
    color: colors.primary,
  },
});
