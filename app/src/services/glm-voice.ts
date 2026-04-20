/**
 * GLM-4-Voice WebSocket 客户端
 *
 * 设计决策：
 * 1. 生产模式：通过 WSS 与智谱 GLM-4-Voice 全双工通信
 * 2. Mock 模式：离线开发/测试时模拟意图识别和 NPC 音频
 * 3. Prompt 组装器在此模块内闭合，外部只传场景和状态
 *
 * 未来迁移路径：
 * 音频流收发将迁移至 Rust/JSI 层，本模块降级为纯控制面
 * （发 Prompt、收意图结果），不再经手 PCM 数据
 */

import type {
  ScenarioDefinition,
  ScenarioState,
  PersonaConfig,
  EmotionTag,
  IntentResult,
} from '../types/conversation';
import type { VocabularyFirewall } from './vocab-firewall';

// ─── 连接状态 ────────────────────────────────────

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

type ConnectionListener = (state: ConnectionState) => void;
type IntentListener = (result: IntentResult) => void;
type AudioListener = (pcmBase64: string, isLast: boolean) => void;

// ─── 配置 ────────────────────────────────────────

interface GLMVoiceConfig {
  /** WebSocket 端点 */
  wsUrl: string;
  /** API Key */
  apiKey: string;
  /** 是否使用 Mock 模式（离线开发） */
  mockMode?: boolean;
  /** Mock 模式下的意图命中率（0-1） */
  mockMatchRate?: number;
  /** Mock 模式下的响应延迟（毫秒） */
  mockDelayMs?: number;
}

// ─── Prompt 组装器 ───────────────────────────────

/**
 * 组装 GLM-4-Voice System Prompt
 *
 * 三个独立维度在此交汇：
 * 1. 角色面具 (Persona) — 不随状态变化
 * 2. 情绪标签 (Emotion) — 随超时次数升级
 * 3. 词汇防火墙 (Vocab Wall) — 不随状态变化
 */
function assembleSystemPrompt(
  persona: PersonaConfig,
  currentEmotion: EmotionTag,
  vocabConstraint: string,
): string {
  return `## 角色设定 (MANDATORY - 始终保持此角色)
你是 ${persona.npcName}，一位${persona.npcRole}。
你正在和一个外国旅客对话。

## 你的情绪状态
当前情绪：[${currentEmotion.toUpperCase()}]
- 你必须用符合此情绪的语气、语速和呼吸节奏说话。
- 如果是 [IMPATIENT]，你需要叹气、加快语速、语气不耐烦。
- 如果是 [AGGRESSIVE]，你需要提高音量、咄咄逼人。
- 绝对不要脱离角色去"帮助"或"教"用户英语。

${vocabConstraint}

## 交互规则
1. 你的回复必须简短有力（1-2 句话，不超过 15 个词）。
2. 不要纠正用户的语法。你不是老师，你是${persona.npcRole}。
3. 如果用户说的话你听不懂，直接重复你的问题，语气更不耐烦。
4. 保持${persona.npcRole}的真实行为模式。`.trim();
}

/**
 * 组装超时催促 Prompt
 */
function assembleTimeoutNudge(
  persona: PersonaConfig,
  emotion: EmotionTag,
  timeoutCount: number,
): string {
  const urgency = timeoutCount >= 2 ? '非常不耐烦' : '有点不耐烦';

  return `[${emotion.toUpperCase()}] 用户已经沉默太久了。
你感到${urgency}。
用最多 10 个词，催促用户回答你之前的问题。
不要重复完整的问题，只用语气词和简短催促。
示例风格：
- "Well?"
- "I'm waiting."
- "Come on, speak up."`.trim();
}

/**
 * 组装状态进入时的 NPC 台词请求
 */
function assembleStatePrompt(state: ScenarioState): string {
  return `请说出以下台词（可以略作自然变化，但保持核心意思）：
"${state.npcPrompt}"`.trim();
}

// ─── GLM-4-Voice 客户端 ─────────────────────────

export class GLMVoiceClient {
  private config: GLMVoiceConfig;
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'idle';
  private firewall: VocabularyFirewall | null = null;
  private currentScenario: ScenarioDefinition | null = null;

  // 事件监听器
  private connectionListeners: Set<ConnectionListener> = new Set();
  private intentListeners: Set<IntentListener> = new Set();
  private audioListeners: Set<AudioListener> = new Set();

  constructor(config: GLMVoiceConfig) {
    this.config = config;
  }

  // ─── 连接管理 ────────────────────────────────

  /** 建立 WebSocket 连接 */
  async connect(): Promise<void> {
    if (this.config.mockMode) {
      this.setState('connected');
      return;
    }

    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.onopen = () => {
        this.setState('connected');
      };

      this.ws.onclose = () => {
        this.setState('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setState('error');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch {
      this.setState('error');
    }
  }

  /** 断开连接 */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('idle');
  }

  /** 绑定场景和词汇防火墙 */
  bindScenario(scenario: ScenarioDefinition, firewall: VocabularyFirewall): void {
    this.currentScenario = scenario;
    this.firewall = firewall;
  }

  // ─── 对话控制 ────────────────────────────────

  /**
   * 发送系统级 Prompt（角色面具 + 词汇防火墙）
   * 每次场景开始或情绪升级时调用
   */
  async sendSystemPrompt(emotion: EmotionTag): Promise<void> {
    if (!this.currentScenario || !this.firewall) {
      throw new Error('[GLM] 未绑定场景，请先调用 bindScenario()');
    }

    const prompt = assembleSystemPrompt(
      this.currentScenario.persona,
      emotion,
      this.firewall.buildPromptConstraint(),
    );

    await this.send({ type: 'system_prompt', content: prompt });
  }

  /**
   * 请求 NPC 说出状态进入台词
   */
  async requestNPCSpeech(state: ScenarioState): Promise<void> {
    const prompt = assembleStatePrompt(state);
    await this.send({ type: 'speak', content: prompt });
  }

  /**
   * 请求超时催促
   */
  async requestTimeoutNudge(emotion: EmotionTag, timeoutCount: number): Promise<void> {
    if (!this.currentScenario) return;

    const prompt = assembleTimeoutNudge(
      this.currentScenario.persona,
      emotion,
      timeoutCount,
    );
    await this.send({ type: 'speak', content: prompt });
  }

  /**
   * 发送用户音频帧（生产模式走 WebSocket，未来迁移至 Rust）
   */
  async sendUserAudio(pcmBase64: string, isEnd: boolean): Promise<void> {
    if (this.config.mockMode) {
      if (isEnd) {
        // Mock：模拟意图识别结果
        this.simulateMockIntentResult();
      }
      return;
    }

    await this.send({
      type: 'audio_frame',
      data: pcmBase64,
      end_of_utterance: isEnd,
    });
  }

  // ─── 事件订阅 ────────────────────────────────

  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  onIntentResult(listener: IntentListener): () => void {
    this.intentListeners.add(listener);
    return () => this.intentListeners.delete(listener);
  }

  onNPCAudio(listener: AudioListener): () => void {
    this.audioListeners.add(listener);
    return () => this.audioListeners.delete(listener);
  }

  // ─── 内部方法 ────────────────────────────────

  private setState(state: ConnectionState): void {
    this.state = state;
    this.connectionListeners.forEach(cb => cb(state));
  }

  private async send(payload: Record<string, unknown>): Promise<void> {
    if (this.config.mockMode) return;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('[GLM] WebSocket 未连接');
    }

    this.ws.send(JSON.stringify(payload));
  }

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case 'audio_frame':
          this.audioListeners.forEach(cb => cb(msg.data, msg.is_last ?? false));
          break;

        case 'intent_result':
          this.intentListeners.forEach(cb => cb({
            matched: msg.matched,
            matchedChunks: msg.matched_chunks ?? [],
            confidence: msg.confidence ?? 0,
            reactionMs: msg.reaction_ms ?? 0,
            transcription: msg.transcription ?? '',
          }));
          break;
      }
    } catch {
      // 非 JSON 消息忽略（可能是二进制音频帧）
    }
  }

  private scheduleReconnect(): void {
    if (this.state === 'idle') return;

    this.setState('reconnecting');
    setTimeout(() => {
      if (this.state === 'reconnecting') {
        this.connect();
      }
    }, 3000);
  }

  /** Mock 模式：模拟意图识别延迟和结果 */
  private simulateMockIntentResult(): void {
    const delay = this.config.mockDelayMs ?? 500;
    const matchRate = this.config.mockMatchRate ?? 0.7;
    const matched = Math.random() < matchRate;

    const currentState = this.currentScenario?.states.find(
      s => s.expectedChunks.length > 0,
    );

    setTimeout(() => {
      const result: IntentResult = {
        matched,
        matchedChunks: matched && currentState ? currentState.expectedChunks : [],
        confidence: matched ? 0.85 + Math.random() * 0.15 : 0.3 + Math.random() * 0.3,
        reactionMs: 300 + Math.floor(Math.random() * 1200),
        transcription: matched ? '[mock] intent matched' : '[mock] intent missed',
      };

      this.intentListeners.forEach(cb => cb(result));
    }, delay);
  }
}
