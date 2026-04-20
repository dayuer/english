import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../theme';
import { initDatabase } from '../db/client';

export default function RootLayout() {
  const [dbState, setDbState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    initDatabase()
      .then(() => setDbState('ready'))
      .catch((err) => {
        console.error('DB init failed:', err);
        setDbState('error');
      });
  }, []);

  if (dbState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <Text style={styles.loadingText}>NeuroGlot</Text>
      </View>
    );
  }

  if (dbState === 'error') {
    return (
      <View style={styles.errorContainer}>
        <StatusBar style="dark" />
        <Text style={styles.errorTitle}>引擎启动失败</Text>
        <Text style={styles.errorDesc}>本地数据库无法初始化。{'\n'}请重启应用。</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setDbState('loading');
            initDatabase()
              .then(() => setDbState('ready'))
              .catch(() => setDbState('error'));
          }}
        >
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bgDeep }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bgDeep },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="raz-boss" options={{ animation: 'fade' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.primary,
    fontSize: typography.sizes.xl,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  errorTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  errorDesc: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['3xl'],
    borderRadius: 12,
  },
  retryText: {
    color: colors.onPrimary,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
});
