import React from 'react';
import { Tabs } from 'expo-router';
import { Icon } from '../../components/ui/Icon';
import { colors, shadows, spacing, typography } from '../../theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerLowest,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          height: 84, // Account for safe area roughly (can also be handled by hook, 84 is a safe iOS default)
          paddingBottom: 28,
          paddingTop: spacing.sm,
        },
        tabBarLabelStyle: {
          fontSize: typography.sizes.xs,
          marginTop: spacing.xs,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '今日',
          tabBarIcon: ({ color }) => <Icon name="home" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '路径',
          tabBarIcon: ({ color }) => <Icon name="path" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: '分析',
          tabBarIcon: ({ color }) => <Icon name="discover" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => <Icon name="profile" color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
