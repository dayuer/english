/**
 * 场景包：海关入境 (Customs Entry)
 *
 * RAZ Level: D → F（约 800 词汇墙）
 * 目标 Chunk: "business trip", "5 days", "hotel", "nothing to declare"
 * 情绪链: professional → impatient → suspicious → aggressive
 *
 * 这是第一个示例场景，验证 FSM 引擎的完整流转路径。
 * 包含 5 个正向状态 + 1 个失败状态 + 1 个通关状态。
 */

import type { ScenarioDefinition } from '../../types/conversation';

export const CUSTOMS_ENTRY_SCENARIO: ScenarioDefinition = {
  id: 'customs_entry_v1',
  title: '海关入境',
  description: '你刚下飞机，正在通过海关入境检查。面前的海关官员看起来很严肃。用简单英语完成全部对话即可通关。',
  razLevelMin: 'D',
  razLevelMax: 'F',
  isFree: true,

  persona: {
    npcName: 'Officer Johnson',
    npcRole: '海关检查官',
    emotionBaseline: 'professional',
    emotionEscalation: ['professional', 'impatient', 'suspicious', 'aggressive'],
    voiceId: 'glm-male-stern-01',
    playerPersona: '你是一个来美国出差的科技公司工程师。你需要顺利通过海关检查。不要紧张，你只需要告诉海关官员最基本的信息。',
  },

  states: [
    // ─── S1: 问候/打招呼 ─────────────────────
    {
      id: 'S1_greeting',
      description: '海关官员打招呼，等待用户回应',
      npcPrompt: 'Next. Passport please. Where are you from?',
      expectedChunks: ['china', 'from china', 'i am from china', 'beijing', 'shanghai'],
      maxTimeouts: 3,
      hints: ['说出你来自哪里：I am from China', 'from China'],
    },

    // ─── S2: 访问目的 ────────────────────────
    {
      id: 'S2_purpose',
      description: '询问访问目的，等待用户说出旅行类型',
      npcPrompt: 'What is the purpose of your visit?',
      expectedChunks: ['business trip', 'business', 'work', 'meeting', 'conference'],
      maxTimeouts: 3,
      failBranch: 'S_fail',
      hints: ['说出你的目的：Business trip', 'I am here for business'],
    },

    // ─── S3: 停留时间 ────────────────────────
    {
      id: 'S3_duration',
      description: '询问停留时间',
      npcPrompt: 'How long will you be staying?',
      expectedChunks: ['5 days', 'five days', 'one week', 'a week', '3 days', 'three days'],
      maxTimeouts: 3,
      hints: ['说出停留时间：5 days', 'About one week'],
    },

    // ─── S4: 住宿地点 ────────────────────────
    {
      id: 'S4_accommodation',
      description: '询问住在哪里',
      npcPrompt: 'Where will you be staying?',
      expectedChunks: ['hotel', 'the hotel', 'marriott', 'hilton', 'airbnb', 'friend house'],
      maxTimeouts: 3,
      hints: ['说出住宿：A hotel', 'I will stay at a hotel'],
    },

    // ─── S5: 申报物品 ────────────────────────
    {
      id: 'S5_declare',
      description: '最后确认是否有需要申报的物品',
      npcPrompt: 'Anything to declare?',
      expectedChunks: ['nothing', 'nothing to declare', 'no', 'no nothing'],
      maxTimeouts: 2,
      hints: ['说：Nothing to declare', 'No'],
    },

    // ─── 通关 ────────────────────────────────
    {
      id: 'S_success',
      description: '通关成功',
      npcPrompt: 'Alright, welcome to the United States. Enjoy your stay.',
      expectedChunks: [],
      maxTimeouts: 0,
      hints: [],
    },

    // ─── 失败 ────────────────────────────────
    {
      id: 'S_fail',
      description: '海关官员叫来了上级',
      npcPrompt: 'Please step aside. I need to call my supervisor.',
      expectedChunks: [],
      maxTimeouts: 0,
      hints: [],
    },
  ],

  transitions: [
    // 正向推进
    { from: 'S1_greeting', to: 'S2_purpose', condition: { type: 'intent_match', requiredChunks: ['china', 'from china', 'i am from china', 'beijing', 'shanghai'] } },
    { from: 'S2_purpose', to: 'S3_duration', condition: { type: 'intent_match', requiredChunks: ['business trip', 'business', 'work', 'meeting', 'conference'] } },
    { from: 'S3_duration', to: 'S4_accommodation', condition: { type: 'intent_match', requiredChunks: ['5 days', 'five days', 'one week', 'a week', '3 days', 'three days'] } },
    { from: 'S4_accommodation', to: 'S5_declare', condition: { type: 'intent_match', requiredChunks: ['hotel', 'the hotel', 'marriott', 'hilton', 'airbnb', 'friend house'] } },
    { from: 'S5_declare', to: 'S_success', condition: { type: 'intent_match', requiredChunks: ['nothing', 'nothing to declare', 'no', 'no nothing'] } },

    // 失败路径（超时耗尽）
    { from: 'S2_purpose', to: 'S_fail', condition: { type: 'timeout_exhaust' } },
  ],

  initialState: 'S1_greeting',
  successState: 'S_success',
  failureState: 'S_fail',
};
