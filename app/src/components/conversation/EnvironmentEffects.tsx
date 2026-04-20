/**
 * 环境压迫视觉效果组件
 *
 * 核心机制：
 * 1. 屏幕边缘红色脉冲 — 随超时次数增加频率和强度
 * 2. 绿色包裹光效 — 极速通关时的正反馈
 * 3. 纯 Animated API 实现，不依赖 Reanimated
 *
 * 设计哲学：
 * 环境 Agent 不直接与用户对话，只通过视觉和听觉暗示施加压力。
 * 这种间接压迫比 NPC 的语言催促更能触发用户的肌肉记忆本能反应。
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface EnvironmentEffectsProps {
  /** 压迫强度 0.0 - 1.0（0=无效果，1=最大压迫） */
  pressureIntensity: number;
  /** 是否显示成功光效 */
  showSuccess: boolean;
  /** 是否激活（false 时隐藏所有效果） */
  active: boolean;
}

export function EnvironmentEffects({
  pressureIntensity,
  showSuccess,
  active,
}: EnvironmentEffectsProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // ─── 红色脉冲压迫（随 intensity 增强） ─────
  useEffect(() => {
    if (!active || pressureIntensity <= 0) {
      pulseAnim.setValue(0);
      return;
    }

    // 频率：intensity 越高，脉冲越快（1200ms → 400ms）
    const duration = Math.max(400, 1200 - pressureIntensity * 800);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: pressureIntensity,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [active, pressureIntensity, pulseAnim]);

  // ─── 绿色成功光效 ─────────────────────────
  useEffect(() => {
    if (!showSuccess) {
      successAnim.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showSuccess, successAnim]);

  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 四边红色脉冲遮罩 */}
      <Animated.View
        style={[
          styles.pressureOverlay,
          { opacity: pulseAnim },
        ]}
      />

      {/* 绿色成功光效 */}
      <Animated.View
        style={[
          styles.successOverlay,
          { opacity: successAnim },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  pressureOverlay: {
    ...StyleSheet.absoluteFillObject,
    // 四边渐变红色（使用 borderWidth 模拟，因为 RN 不支持 CSS 径向渐变）
    borderWidth: 20,
    borderColor: 'rgba(220, 38, 38, 0.6)',
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 16,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    borderRadius: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
});
