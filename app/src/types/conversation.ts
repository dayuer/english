/**
 * 实时对话引擎类型定义
 *
 * 设计原则：
 * 1. 场景包 = 完整 FSM + 角色面具 + 词汇防火墙配置
 * 2. 状态流转 100% 由意图匹配驱动，拒绝语法纠错
 * 3. 情绪标签独立于角色人设，随超时次数动态升级
 * 4. 所有时间指标使用毫秒整数，前端不做浮点运算
 */

import { RazLevel } from './vocabulary';

// ─── 情绪标签体系 ────────────────────────────────

/** NPC 情绪标签（与 GLM-4-Voice 的情绪渲染指令对齐） */
export type EmotionTag =
  | 'neutral'
  | 'professional'
  | 'warm'
  | 'impatient'
  | 'suspicious'
  | 'aggressive'
  | 'sarcastic'
  | 'threatening';

// ─── 角色面具 (Persona) ──────────────────────────

/** NPC 角色配置 */
export interface PersonaConfig {
  /** NPC 名称：Officer Johnson */
  npcName: string;
  /** NPC 角色：海关检查官 */
  npcRole: string;
  /** 基础情绪（无超时时的默认情绪） */
  emotionBaseline: EmotionTag;
  /** 情绪升级链：随超时次数递进 */
  emotionEscalation: EmotionTag[];
  /** GLM-4-Voice 音色 ID */
  voiceId: string;
  /** 用户面具描述（用于降低焦虑） */
  playerPersona: string;
}

// ─── FSM 状态机定义 ──────────────────────────────

/** 状态流转条件 */
export interface TransitionCondition {
  /** 'intent_match': 意图命中；'timeout_exhaust': 超时耗尽 */
  type: 'intent_match' | 'timeout_exhaust';
  /** 需要命中的 Chunk 列表（任意一个命中即可） */
  requiredChunks?: string[];
  /** 最低置信度（默认 0.7） */
  minConfidence?: number;
}

/** 状态转移边 */
export interface StateTransition {
  from: string;
  to: string;
  condition: TransitionCondition;
}

/** FSM 状态节点 */
export interface ScenarioState {
  /** 状态 ID：S2_purpose */
  id: string;
  /** 人类可读描述：等待用户说出访问目的 */
  description: string;
  /** NPC 进入此状态时的台词 */
  npcPrompt: string;
  /** 目标 Chunk（任意命中一个即可流转） */
  expectedChunks: string[];
  /** 最大超时次数（超过则走 failBranch） */
  maxTimeouts: number;
  /** 超时耗尽后跳转的状态 ID */
  failBranch?: string;
  /** 提示短语（多次超时后展示给用户） */
  hints: string[];
}

// ─── 场景包顶层定义 ──────────────────────────────

/** 场景包——对话引擎的最小可运行单元 */
export interface ScenarioDefinition {
  /** 场景 ID：customs_entry_v2 */
  id: string;
  /** 场景标题：海关入境 */
  title: string;
  /** 场景描述 */
  description: string;
  /** 最低准入 RAZ 等级 */
  razLevelMin: RazLevel;
  /** 词汇墙上界（NPC 用词不超过此等级） */
  razLevelMax: RazLevel;
  /** NPC 角色面具配置 */
  persona: PersonaConfig;
  /** 全部状态节点 */
  states: ScenarioState[];
  /** 状态转移边 */
  transitions: StateTransition[];
  /** 起始状态 ID */
  initialState: string;
  /** 通关状态 ID */
  successState: string;
  /** 失败状态 ID */
  failureState: string;
  /** 是否免费 */
  isFree: boolean;
}

// ─── 运行时事件与指标 ────────────────────────────

/** VAD 检测到用户开口 */
export interface VoiceDetectedEvent {
  /** 反应时间（毫秒）：NPC 话音结束 → 用户首个有效音节 */
  reactionMs: number;
  /** 首帧能量值 (dB) */
  energyDb: number;
}

/** 超时事件 */
export interface TimeoutEvent {
  /** 已过毫秒数 */
  elapsedMs: number;
  /** 当前状态的连续超时次数 */
  consecutiveTimeouts: number;
}

/** GLM-4-Voice 意图识别结果 */
export interface IntentResult {
  /** 意图是否命中 */
  matched: boolean;
  /** 命中的 Chunk 列表 */
  matchedChunks: string[];
  /** 置信度（0.0 - 1.0） */
  confidence: number;
  /** 用户反应耗时 */
  reactionMs: number;
  /** ASR 粗文本（仅供调试） */
  transcription: string;
}

/** FSM 引擎输出的动作指令 */
export type FSMAction =
  | { type: 'advance'; nextState: ScenarioState; emotion: EmotionTag }
  | { type: 'retry'; emotion: EmotionTag; message: string }
  | { type: 'timeout_pressure'; emotion: EmotionTag; intensity: number; showHint: boolean; hintText: string | null }
  | { type: 'fail_branch'; nextState: ScenarioState; message: string }
  | { type: 'scenario_complete'; metrics: SessionMetrics; rewardLevel: RewardLevel }
  | { type: 'scenario_failed'; metrics: SessionMetrics; bottleneckChunks: string[] };

/** 通关评级 */
export type RewardLevel = 'S' | 'A' | 'B' | 'C' | 'F';

/** 单个 Chunk 的反应记录 */
export interface ChunkReactionRecord {
  chunkText: string;
  chunkHash: string;
  reactionMs: number;
  scenarioId: string;
  stateId: string;
  intentMatched: boolean;
  emotionAtTrigger: EmotionTag;
  timestamp: number;
}

/** 会话级聚合指标 */
export interface SessionMetrics {
  /** 本次会话的全部 Chunk 反应记录 */
  reactions: ChunkReactionRecord[];
  /** 累计反应时间 */
  totalReactionMs: number;
  /** 总对话轮次 */
  turnCount: number;
  /** 总超时次数 */
  totalTimeouts: number;
}

// ─── 会话状态 ────────────────────────────────────

/** 对话会话状态 */
export type SessionStatus = 'active' | 'completed' | 'failed' | 'abandoned';

/** 完整的会话上下文（运行时） */
export interface ConversationSession {
  /** 会话 ID */
  id: string;
  /** 场景定义 */
  scenario: ScenarioDefinition;
  /** 当前 FSM 状态 ID */
  currentStateId: string;
  /** 会话状态 */
  status: SessionStatus;
  /** 当前状态的超时计数 */
  timeoutCount: number;
  /** 聚合指标 */
  metrics: SessionMetrics;
  /** 开始时间 */
  startedAt: number;
}
