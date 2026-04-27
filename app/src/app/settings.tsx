import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii } from '../theme';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getInstalledPacks, getStorageUsage, type ContentPackRecord } from '../db/repositories/content-pack.repo';
import { getSyncPendingCount, runFullSync } from '../services/sync';
import { useNetworkStatus } from '../services/network';
import { getCacheStats } from '../db/repositories/audio.repo';

export default function SettingsScreen() {
  const isConnected = useNetworkStatus();
  const [packs, setPacks] = useState<ContentPackRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [storage, setStorage] = useState({ totalPacks: 0, totalLessons: 0, totalChunks: 0 });
  const [audioStats, setAudioStats] = useState({ totalAssets: 0, totalHits: 0 });
  const [syncing, setSyncing] = useState(false);

  const loadData = async () => {
    const [p, pending, store, audio] = await Promise.all([
      getInstalledPacks(), getSyncPendingCount(), getStorageUsage(), getCacheStats(),
    ]);
    setPacks(p);
    setPendingCount(pending);
    setStorage(store);
    setAudioStats(audio);
  };

  useEffect(() => { loadData(); }, []);

  const handleSync = async () => {
    if (!isConnected || syncing) return;
    setSyncing(true);
    try { await runFullSync(); await loadData(); }
    finally { setSyncing(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="设置" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* 数据同步 */}
        <Section title="数据同步">
          <Row label="网络状态" value={isConnected ? '已连接' : '离线'} valueColor={isConnected ? colors.accentEmerald : colors.textMuted} />
          <Row label="待上传记录" value={`${pendingCount} 条`} />
          {pendingCount > 0 && (
            <Button title={syncing ? '同步中...' : '立即同步'} onPress={handleSync} disabled={!isConnected || syncing} />
          )}
          {syncing && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />}
        </Section>

        {/* 存储 */}
        <Section title="存储">
          <Row label="已安装内容包" value={`${storage.totalPacks} 个`} />
          <Row label="课程数量" value={`${storage.totalLessons} 节`} />
          <Row label="组块数量" value={`${storage.totalChunks} 个`} />
          <Row label="音频缓存" value={`${audioStats.totalAssets} 个 (${audioStats.totalHits} 次命中)`} />
        </Section>

        {/* 已安装内容包 */}
        {packs.length > 0 && (
          <Section title="已安装内容包">
            {packs.map((pack) => (
              <View key={pack.id} style={styles.packRow}>
                <Text style={styles.packTitle}>{pack.title}</Text>
                <Text style={styles.packMeta}>
                  v{pack.version} · {pack.totalLessons} 课 · {pack.langPair}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {/* 关于 */}
        <Section title="关于">
          <Row label="版本" value="1.0.0" />
          <Row label="引擎" value="NeuroGlot 神经语言习得引擎" />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 内部子组件 ───────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <Card style={sectionStyles.card}>{children}</Card>
    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

// ─── 样式 ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['4xl'] },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowLabel: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    fontWeight: typography.weights.medium,
  },
  packRow: {
    paddingVertical: spacing.md,
  },
  packTitle: {
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
    marginBottom: 2,
  },
  packMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
});

const sectionStyles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  card: {
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
});
