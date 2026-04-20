/**
 * 对话主屏幕 — 实时口语重塑引擎的用户界面
 *
 * 层级职责：
 * 1. 编排 FSM 引擎、GLM 客户端、环境效果三个子系统
 * 2. 管理录音/播放的生命周期
 * 3. 将 FSMAction 转译为视觉状态变化
 *
 * 当前版本使用 Mock 模式运行 GLM 客户端。
 * Rust/JSI VAD 层就绪后，录音和计时将迁移至原生侧。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ConversationFSM } from '../../services/conversation-fsm';
import { GLMVoiceClient } from '../../services/glm-voice';
import { scenarioRegistry } from '../../services/scenario-loader';
import { EnvironmentEffects } from './EnvironmentEffects';

import type { ScenarioDefinition, FSMAction, EmotionTag, RewardLevel } from '../../types/conversation';
import type { LoadedScenario } from '../../services/scenario-loader';

// ─── 屏幕状态 ────────────────────────────────────

type ScreenPhase =
  | 'loading'         // 加载场景包 + 构建词汇防火墙
  | 'briefing'        // 展示用户面具和场景简介
  | 'conversation'    // 对话进行中
  | 'result';         // 通关/失败结果

interface DialogLine {
  id: string;
  speaker: 'npc' | 'user' | 'system';
  text: string;
  emotion?: EmotionTag;
  reactionMs?: number;
  timestamp: number;
}

interface ConversationScreenProps {
  scenarioId: string;
  onExit: () => void;
}

// ─── 主组件 ──────────────────────────────────────

export function ConversationScreen({ scenarioId, onExit }: ConversationScreenProps) {
  // ─── 核心引擎引用 ─────────────────────────
  const fsmRef = useRef<ConversationFSM | null>(null);
  const glmRef = useRef<GLMVoiceClient | null>(null);

  // ─── UI 状态 ──────────────────────────────
  const [phase, setPhase] = useState<ScreenPhase>('loading');
  const [scenario, setScenario] = useState<ScenarioDefinition | null>(null);
  const [dialogLines, setDialogLines] = useState<DialogLine[]>([]);
  const [currentNpcText, setCurrentNpcText] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState<EmotionTag>('professional');
  const [isRecording, setIsRecording] = useState(false);
  const [pressureIntensity, setPressureIntensity] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [rewardLevel, setRewardLevel] = useState<RewardLevel | null>(null);
  const [resultMessage, setResultMessage] = useState('');

  // 录音计时器（Mock，未来迁移至 Rust Instant）
  const recordStartRef = useRef<number>(0);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  // ─── 对话行追加 ───────────────────────────
  const addLine = useCallback((speaker: DialogLine['speaker'], text: string, extra?: Partial<DialogLine>) => {
    const line: DialogLine = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      speaker,
      text,
      timestamp: Date.now(),
      ...extra,
    };
    setDialogLines(prev => [...prev, line]);
    // 自动滚到底部
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // ─── Phase: Loading ───────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const loaded: LoadedScenario = await scenarioRegistry.load(scenarioId);

        if (cancelled) return;

        setScenario(loaded.definition);

        // 初始化 FSM
        const fsm = new ConversationFSM(loaded.definition);
        fsmRef.current = fsm;

        // 初始化 GLM 客户端（Mock 模式）
        const glm = new GLMVoiceClient({
          wsUrl: 'wss://open.bigmodel.cn/api/paas/v4/voice',
          apiKey: '',
          mockMode: true,
          mockMatchRate: 0.75,
          mockDelayMs: 600,
        });
        glmRef.current = glm;

        glm.bindScenario(loaded.definition, loaded.firewall);

        // 监听意图结果
        glm.onIntentResult((result) => {
          if (!fsmRef.current) return;

          const action = fsmRef.current.handleIntentResult(result);
          handleFSMAction(action, result.reactionMs);
        });

        await glm.connect();

        setPhase('briefing');
      } catch (err) {
        addLine('system', `加载失败: ${err instanceof Error ? err.message : '未知错误'}`);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [scenarioId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── FSMAction 处理器 ─────────────────────
  const handleFSMAction = useCallback((action: FSMAction, reactionMs?: number) => {
    clearTimeoutTimer();

    switch (action.type) {
      case 'advance':
        setCurrentEmotion(action.emotion);
        setPressureIntensity(0);
        setHintText(null);

        // 短暂成功闪光
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1500);

        if (reactionMs !== undefined) {
          addLine('user', `[回答成功 · ${reactionMs}ms]`, { reactionMs });
        }

        // NPC 说下一句
        setCurrentNpcText(action.nextState.npcPrompt);
        addLine('npc', action.nextState.npcPrompt, { emotion: action.emotion });
        break;

      case 'retry':
        setCurrentEmotion(action.emotion);
        addLine('system', action.message);
        break;

      case 'timeout_pressure':
        setCurrentEmotion(action.emotion);
        setPressureIntensity(action.intensity);
        if (action.showHint && action.hintText) {
          setHintText(action.hintText);
        }
        addLine('system', `⏱️ 超时 · NPC 情绪升级: [${action.emotion.toUpperCase()}]`);
        // 请求 GLM 发出催促
        glmRef.current?.requestTimeoutNudge(action.emotion, fsmRef.current?.getSession().timeoutCount ?? 0);
        break;

      case 'fail_branch':
        setPressureIntensity(1.0);
        addLine('npc', action.nextState.npcPrompt, { emotion: 'aggressive' });
        addLine('system', action.message);
        break;

      case 'scenario_complete': {
        setPhase('result');
        setRewardLevel(action.rewardLevel);
        const avgMs = action.metrics.turnCount > 0
          ? Math.round(action.metrics.totalReactionMs / action.metrics.turnCount)
          : 0;
        setResultMessage(`通关评级: ${action.rewardLevel}\n平均反应: ${avgMs}ms\n对话轮次: ${action.metrics.turnCount}\n超时次数: ${action.metrics.totalTimeouts}`);
        setPressureIntensity(0);
        break;
      }

      case 'scenario_failed':
        setPhase('result');
        setRewardLevel('F');
        setResultMessage(`场景失败\n瓶颈 Chunk: ${action.bottleneckChunks.join(', ')}\n超时次数: ${action.metrics.totalTimeouts}`);
        setPressureIntensity(0);
        break;
    }
  }, [addLine]);

  // ─── 超时计时器管理 ───────────────────────
  const startTimeoutTimer = useCallback(() => {
    clearTimeoutTimer();
    timeoutTimerRef.current = setTimeout(() => {
      if (!fsmRef.current?.isActive()) return;

      const action = fsmRef.current.handleTimeout({
        elapsedMs: 2000,
        consecutiveTimeouts: fsmRef.current.getSession().timeoutCount + 1,
      });
      handleFSMAction(action);

      // 继续监控下一次超时
      startTimeoutTimer();
    }, 2000);
  }, [handleFSMAction]);

  const clearTimeoutTimer = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  // ─── 开始对话 ─────────────────────────────
  const startConversation = useCallback(() => {
    if (!fsmRef.current || !scenario) return;

    setPhase('conversation');
    const initialState = fsmRef.current.getCurrentState();
    setCurrentNpcText(initialState.npcPrompt);
    setCurrentEmotion(scenario.persona.emotionBaseline);
    addLine('npc', initialState.npcPrompt, { emotion: scenario.persona.emotionBaseline });

    // 启动超时监控
    startTimeoutTimer();
  }, [scenario, addLine, startTimeoutTimer]);

  // ─── 录音控制（Mock 实现） ────────────────
  const startRecording = useCallback(() => {
    setIsRecording(true);
    recordStartRef.current = Date.now();
    clearTimeoutTimer();
  }, [clearTimeoutTimer]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    const reactionMs = Date.now() - recordStartRef.current;

    // Mock：发送假音频触发意图识别
    glmRef.current?.sendUserAudio('mock_audio', true);

    // 重启超时计时器
    startTimeoutTimer();
  }, [startTimeoutTimer]);

  // ─── 清理 ─────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeoutTimer();
      glmRef.current?.disconnect();
    };
  }, [clearTimeoutTimer]);

  // ─── 渲染 ─────────────────────────────────

  // Loading
  if (phase === 'loading') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>构建词汇防火墙...</Text>
      </View>
    );
  }

  // Briefing
  if (phase === 'briefing' && scenario) {
    return (
      <View style={styles.container}>
        <View style={styles.briefingCard}>
          <Text style={styles.briefingTitle}>{scenario.title}</Text>
          <Text style={styles.briefingDesc}>{scenario.description}</Text>

          <View style={styles.personaBox}>
            <Text style={styles.personaLabel}>你的角色</Text>
            <Text style={styles.personaText}>{scenario.persona.playerPersona}</Text>
          </View>

          <View style={styles.personaBox}>
            <Text style={styles.personaLabel}>对面的人</Text>
            <Text style={styles.personaText}>
              {scenario.persona.npcName} — {scenario.persona.npcRole}
            </Text>
          </View>

          <Text style={styles.briefingHint}>
            RAZ {scenario.razLevelMin}~{scenario.razLevelMax} · 用简单英语通关
          </Text>

          <Pressable style={styles.startBtn} onPress={startConversation}>
            <Text style={styles.startBtnText}>进入场景</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Result
  if (phase === 'result') {
    const isSuccess = rewardLevel !== 'F';
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.resultEmoji]}>
          {isSuccess ? '🎉' : '😞'}
        </Text>
        <Text style={[styles.resultTitle, isSuccess ? styles.successText : styles.failText]}>
          {isSuccess ? '通关成功！' : '挑战失败'}
        </Text>
        <Text style={styles.resultDetail}>{resultMessage}</Text>

        <Pressable
          style={[styles.startBtn, { marginTop: 32 }]}
          onPress={onExit}
        >
          <Text style={styles.startBtnText}>返回</Text>
        </Pressable>
      </View>
    );
  }

  // Conversation
  return (
    <View style={styles.container}>
      <EnvironmentEffects
        pressureIntensity={pressureIntensity}
        showSuccess={showSuccess}
        active={phase === 'conversation'}
      />

      {/* 顶部状态栏 */}
      <View style={styles.topBar}>
        <Pressable onPress={onExit} style={styles.exitBtn}>
          <Ionicons name="close" size={24} color="#94a3b8" />
        </Pressable>
        <Text style={styles.topBarTitle}>{scenario?.title}</Text>
        <View style={styles.emotionBadge}>
          <Text style={styles.emotionText}>
            {currentEmotion.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* 对话流 */}
      <ScrollView
        ref={scrollRef}
        style={styles.dialogScroll}
        contentContainerStyle={styles.dialogContent}
      >
        {dialogLines.map(line => (
          <View
            key={line.id}
            style={[
              styles.dialogBubble,
              line.speaker === 'npc' && styles.npcBubble,
              line.speaker === 'user' && styles.userBubble,
              line.speaker === 'system' && styles.systemBubble,
            ]}
          >
            {line.speaker === 'npc' && (
              <Text style={styles.speakerLabel}>{scenario?.persona.npcName}</Text>
            )}
            <Text style={[
              styles.dialogText,
              line.speaker === 'system' && styles.systemText,
            ]}>
              {line.text}
            </Text>
            {line.reactionMs !== undefined && (
              <Text style={[
                styles.reactionBadge,
                line.reactionMs <= 400 && styles.reflexBadge,
                line.reactionMs > 400 && line.reactionMs <= 800 && styles.fastBadge,
                line.reactionMs > 800 && styles.slowBadge,
              ]}>
                ⚡ {line.reactionMs}ms
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      {/* 提示区域 */}
      {hintText && (
        <View style={styles.hintBar}>
          <Ionicons name="bulb-outline" size={16} color="#fbbf24" />
          <Text style={styles.hintBarText}>{hintText}</Text>
        </View>
      )}

      {/* 底部录音按钮 */}
      <View style={styles.bottomBar}>
        <Pressable
          onPressIn={startRecording}
          onPressOut={stopRecording}
          style={[
            styles.recordBtn,
            isRecording && styles.recordingBtn,
          ]}
        >
          <Ionicons
            name={isRecording ? 'mic' : 'mic-outline'}
            size={32}
            color={isRecording ? '#ef4444' : '#e2e8f0'}
          />
          <Text style={styles.recordLabel}>
            {isRecording ? '松开发送' : '按住说话'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── 样式 ────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 16,
  },

  // ─── Briefing ─────────────────────────────
  briefingCard: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  briefingTitle: {
    color: '#f1f5f9',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  briefingDesc: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  personaBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  personaLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  personaText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  briefingHint: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  startBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },

  // ─── Top Bar ──────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  exitBtn: {
    padding: 4,
  },
  topBarTitle: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  emotionBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emotionText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ─── Dialog ───────────────────────────────
  dialogScroll: {
    flex: 1,
  },
  dialogContent: {
    padding: 16,
    paddingBottom: 24,
  },
  dialogBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  npcBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1d4ed8',
    borderBottomRightRadius: 4,
  },
  systemBubble: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
    padding: 6,
  },
  speakerLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dialogText: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
  },
  systemText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ─── Reaction Badge ───────────────────────
  reactionBadge: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  reflexBadge: {
    color: '#22c55e', // ≤400ms 条件反射
  },
  fastBadge: {
    color: '#3b82f6', // 400-800ms 快速
  },
  slowBadge: {
    color: '#f59e0b', // >800ms 偏慢
  },

  // ─── Hint Bar ─────────────────────────────
  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  hintBarText: {
    color: '#fbbf24',
    fontSize: 13,
    flex: 1,
  },

  // ─── Bottom Bar ───────────────────────────
  bottomBar: {
    paddingBottom: 40,
    paddingTop: 16,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#334155',
  },
  recordingBtn: {
    backgroundColor: '#7f1d1d',
    borderColor: '#ef4444',
  },
  recordLabel: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 4,
  },

  // ─── Result ───────────────────────────────
  resultEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  successText: {
    color: '#22c55e',
  },
  failText: {
    color: '#ef4444',
  },
  resultDetail: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
});
