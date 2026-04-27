import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../theme';
import { Button } from '../components/ui/Button';
import { LogoOrb } from '../components/ui/LogoOrb';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <LogoOrb />
        <View style={styles.textContainer}>
          <Text style={styles.title}>神经可塑性</Text>
          <Text style={styles.subtitle}>
            建立真实的英语直觉，而非死记硬背。我们通过高度聚焦的极简沙盒，重塑你的神经反射。
          </Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Button title="开始旅程" onPress={() => router.push('/(tabs)/home')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  textContainer: {
    marginTop: spacing['3xl'],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeights.relaxed,
  },
  footer: {
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
});
