import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, radii, spacing, typography } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { useAppStore } from '../../stores/app.store';

export default function ProfileScreen() {
  const profile = useAppStore((state) => state.profile);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Profile</Text>
        </View>

        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.name.charAt(0)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile.name}</Text>
            <Text style={styles.userRole}>Level {profile.level} Learner</Text>
          </View>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{profile.days}</Text>
            <Text style={styles.statLabel}>DAYS</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{profile.chunks}</Text>
            <Text style={styles.statLabel}>CHUNKS</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{profile.streak}</Text>
            <Text style={styles.statLabel}>STREAK</Text>
          </Card>
        </View>

        {/* Settings */}
        <SectionTitle title="Settings" />
        <View style={styles.settingsList}>
          <SettingsRow icon="gear" label="账户设置" onPress={() => router.push('/settings')} />
          <View style={styles.rowSpacer} />
          <SettingsRow icon="volume" label="发音偏好" onPress={() => {}} />
          <View style={styles.rowSpacer} />
          <SettingsRow icon="info" label="关于 NeuroGlot" onPress={() => {}} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({ icon, label, onPress }: { icon: 'gear' | 'volume' | 'info'; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.settingsRow}>
        <Icon name={icon} color={colors.textPrimary} size={20} />
        <Text style={styles.settingsLabel}>{label}</Text>
        <Icon name="chevron-right" color={colors.textMuted} size={18} />
      </Card>
    </TouchableOpacity>
  );
}

const AVATAR_SIZE = 64;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  pageHeader: {
    paddingVertical: spacing.lg,
  },
  pageTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    color: colors.accentBlue,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userRole: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
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
    marginTop: 4,
  },
  settingsList: {
    flexDirection: 'column',
  },
  rowSpacer: {
    height: spacing.md,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  settingsLabel: {
    flex: 1,
    marginLeft: spacing.lg,
    fontSize: typography.sizes.base,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});
