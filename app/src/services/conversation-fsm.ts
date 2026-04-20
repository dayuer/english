/**
 * 场控 FSM 引擎 — 驱动对话状态流转
 *
 * 核心哲学：
 * 1. 状态机绝不挂起，超时只升级压迫感
 * 2. 流转条件 100% 由意图匹配驱动，语法纠错在此引擎中不存在
 * 3. 情绪沿着 escalation 链单调递增，只有进入新状态才重置
 * 4. 所有指标实时写入 SessionMetrics，不做延迟聚合
 */

import { createHash } from '../utils/hash';
import type {
  ScenarioDefinition,
  ScenarioState,
  StateTransition,
  IntentResult,
  TimeoutEvent,
  FSMAction,
  SessionMetrics,
  ChunkReactionRecord,
  RewardLevel,
  EmotionTag,
  ConversationSession,
} from '../types/conversation';

/** 生成唯一会话 ID */
function generateSessionId(): string {
  return `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * ConversationFSM — 状态机引擎
 *
 * 单次实例对应单次对话会话。
 * 不持有 UI 引用，纯逻辑层，通过返回 FSMAction 驱动上层。
 */
export class ConversationFSM {
  private session: ConversationSession;

  constructor(scenario: ScenarioDefinition) {
    this.session = {
      id: generateSessionId(),
      scenario,
      currentStateId: scenario.initialState,
      status: 'active',
      timeoutCount: 0,
      metrics: {
        reactions: [],
        totalReactionMs: 0,
        turnCount: 0,
        totalTimeouts: 0,
      },
      startedAt: Date.now(),
    };
  }

  // ─── 公共访问器 ───────────────────────────────

  /** 获取当前会话快照（只读） */
  getSession(): Readonly<ConversationSession> {
    return this.session;
  }

  /** 获取当前 FSM 状态节点 */
  getCurrentState(): ScenarioState {
    return this.findState(this.session.currentStateId);
  }

  /** 获取当前应使用的情绪标签 */
  getCurrentEmotion(): EmotionTag {
    if (this.session.timeoutCount === 0) {
      return this.session.scenario.persona.emotionBaseline;
    }
    return this.getEscalatedEmotion(this.session.timeoutCount);
  }

  /** 获取会话 ID */
  getSessionId(): string {
    return this.session.id;
  }

  /** 会话是否仍在进行 */
  isActive(): boolean {
    return this.session.status === 'active';
  }

  // ─── 核心事件处理 ─────────────────────────────

  /**
   * 处理 GLM-4-Voice 返回的意图识别结果
   * 这是状态流转的唯一正向驱动力
   */
  handleIntentResult(result: IntentResult): FSMAction {
    if (!this.isActive()) {
      return { type: 'scenario_failed', metrics: this.session.metrics, bottleneckChunks: [] };
    }

    const state = this.getCurrentState();

    // 记录 Chunk 反应数据（无论是否命中）
    this.recordReaction(result, state);

    if (!result.matched || result.confidence < 0.7) {
      // 意图未命中 → 不流转，NPC 换种方式重问
      return {
        type: 'retry',
        emotion: this.getEscalatedEmotion(0), // 温和重问
        message: '意图未命中，NPC 将换种表述重新提问',
      };
    }

    // 意图命中 → 寻找转移边 → 流转
    const transition = this.findMatchingTransition(state.id, result.matchedChunks);
    if (!transition) {
      // 安全兜底：命中了但找不到边，视为重试
      return {
        type: 'retry',
        emotion: this.getCurrentEmotion(),
        message: '意图命中但无匹配转移边',
      };
    }

    // 执行状态流转
    this.session.currentStateId = transition.to;
    this.session.timeoutCount = 0; // 进入新状态重置超时计数
    this.session.metrics.turnCount++;

    // 检查是否通关
    if (transition.to === this.session.scenario.successState) {
      this.session.status = 'completed';
      return {
        type: 'scenario_complete',
        metrics: this.session.metrics,
        rewardLevel: this.calculateRewardLevel(),
      };
    }

    const nextState = this.findState(transition.to);
    return {
      type: 'advance',
      nextState,
      emotion: this.session.scenario.persona.emotionBaseline,
    };
  }

  /**
   * 处理超时事件
   * 核心原则：状态机不挂起，只升级压迫感
   */
  handleTimeout(event: TimeoutEvent): FSMAction {
    if (!this.isActive()) {
      return { type: 'scenario_failed', metrics: this.session.metrics, bottleneckChunks: [] };
    }

    this.session.timeoutCount++;
    this.session.metrics.totalTimeouts++;

    const state = this.getCurrentState();

    // 记录超时的 Chunk 反应数据
    for (const chunk of state.expectedChunks) {
      this.session.metrics.reactions.push({
        chunkText: chunk,
        chunkHash: createHash(chunk),
        reactionMs: event.elapsedMs,
        scenarioId: this.session.scenario.id,
        stateId: state.id,
        intentMatched: false,
        emotionAtTrigger: this.getCurrentEmotion(),
        timestamp: Date.now(),
      });
    }

    // 超时次数耗尽 → 走失败分支或直接失败
    if (this.session.timeoutCount >= state.maxTimeouts) {
      if (state.failBranch) {
        this.session.currentStateId = state.failBranch;
        this.session.timeoutCount = 0;

        // 检查失败分支是否就是 failureState
        if (state.failBranch === this.session.scenario.failureState) {
          this.session.status = 'failed';
          return {
            type: 'scenario_failed',
            metrics: this.session.metrics,
            bottleneckChunks: state.expectedChunks,
          };
        }

        return {
          type: 'fail_branch',
          nextState: this.findState(state.failBranch),
          message: 'NPC 失去耐心，场景走向不利结局',
        };
      }

      // 无失败分支 → 场景直接失败
      this.session.status = 'failed';
      return {
        type: 'scenario_failed',
        metrics: this.session.metrics,
        bottleneckChunks: state.expectedChunks,
      };
    }

    // 升级情绪 + 触发环境压迫
    const emotion = this.getEscalatedEmotion(this.session.timeoutCount);
    const intensity = this.session.timeoutCount / state.maxTimeouts;
    const showHint = this.session.timeoutCount >= 3;
    const hintText = showHint ? (state.hints[this.session.timeoutCount - 3] ?? null) : null;

    return {
      type: 'timeout_pressure',
      emotion,
      intensity: Math.min(intensity, 1.0),
      showHint,
      hintText,
    };
  }

  /**
   * 用户主动放弃
   */
  abandon(): SessionMetrics {
    this.session.status = 'abandoned';
    return this.session.metrics;
  }

  // ─── 内部方法 ─────────────────────────────────

  /** 查找状态节点（O(n) 但 n ≤ 20，无需优化） */
  private findState(stateId: string): ScenarioState {
    const state = this.session.scenario.states.find(s => s.id === stateId);
    if (!state) {
      throw new Error(`[FSM] 状态节点不存在: ${stateId}`);
    }
    return state;
  }

  /** 寻找匹配的转移边 */
  private findMatchingTransition(fromId: string, matchedChunks: string[]): StateTransition | null {
    const matchedSet = new Set(matchedChunks.map(c => c.toLowerCase()));

    return this.session.scenario.transitions.find(t => {
      if (t.from !== fromId) return false;
      if (t.condition.type !== 'intent_match') return false;

      const required = t.condition.requiredChunks ?? [];
      // 任意一个 required chunk 被命中即可触发
      return required.some(rc => matchedSet.has(rc.toLowerCase()));
    }) ?? null;
  }

  /** 情绪升级：沿 escalation 链递进 */
  private getEscalatedEmotion(timeoutIdx: number): EmotionTag {
    const chain = this.session.scenario.persona.emotionEscalation;
    return chain[Math.min(timeoutIdx, chain.length - 1)];
  }

  /** 记录 Chunk 反应指标 */
  private recordReaction(result: IntentResult, state: ScenarioState): void {
    for (const chunk of result.matchedChunks) {
      this.session.metrics.reactions.push({
        chunkText: chunk,
        chunkHash: createHash(chunk),
        reactionMs: result.reactionMs,
        scenarioId: this.session.scenario.id,
        stateId: state.id,
        intentMatched: result.matched,
        emotionAtTrigger: this.getCurrentEmotion(),
        timestamp: Date.now(),
      });
    }
    this.session.metrics.totalReactionMs += result.reactionMs;
  }

  /** 结算通关评级 */
  private calculateRewardLevel(): RewardLevel {
    const { totalReactionMs, turnCount } = this.session.metrics;
    if (turnCount === 0) return 'F';

    const avgMs = totalReactionMs / turnCount;
    if (avgMs <= 400) return 'S';   // 极速条件反射
    if (avgMs <= 800) return 'A';   // 优秀
    if (avgMs <= 1200) return 'B';  // 良好（仍有翻译器痕迹）
    if (avgMs <= 2000) return 'C';  // 及格
    return 'F';                      // 语法脑仍在主导
  }
}
