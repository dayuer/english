/**
 * 分级阅读数据模型 — RAZ 对齐的新闻短文 Schema
 *
 * 设计决策：
 * - ReadingLevel 复用 RAZ 29 级体系，与词库和课程体系对齐
 * - LeveledArticle 是新闻短文的核心载体，约束词汇范围由 Vocab Wall 引擎保证
 * - ComprehensionQuestion 支持多题型（选择、判断、填空），服务于 Boss 战检测
 * - ArticleGenerationRequest 是 LLM Worker 的输入契约，包含词汇墙约束
 */

import type { RazLevel } from './vocabulary';

// ─── 阅读级别 ──────────────────────────────────────────

/** 文章难度标签，与 RAZ 29 级一一对应 */
export type ReadingLevel = RazLevel;

/** 文章主题分类 */
export type ArticleTopic =
  | 'science'      // 科学发现
  | 'nature'       // 自然世界
  | 'culture'      // 文化习俗
  | 'daily_life'   // 日常生活
  | 'technology'   // 科技趣闻
  | 'sports'       // 体育运动
  | 'history'      // 历史故事
  | 'people'       // 人物传记
  | 'world'        // 世界见闻
  | 'health';      // 健康生活

// ─── 核心实体 ──────────────────────────────────────────

/** 分级新闻短文 */
export interface LeveledArticle {
  /** 唯一标识 */
  id: string;
  /** 阅读级别 */
  level: ReadingLevel;
  /** 英文标题 */
  title: string;
  /** 英文正文（1-3 段，词数随级别递增） */
  body: string[];
  /** 中文标题翻译（辅助理解） */
  titleL1: string;
  /** 主题分类 */
  topic: ArticleTopic;
  /** 配图描述（供 DALL-E / 占位图使用） */
  imagePrompt: string;
  /** 核心词汇列表（文章中出现的 ≤ 当前级别的高频词） */
  keyVocabulary: string[];
  /** 词数统计 */
  wordCount: number;
  /** 理解题 */
  questions: ComprehensionQuestion[];
  /** 生成来源 */
  source: 'llm_generated' | 'curated';
  /** 创建时间 */
  createdAt: string;
}

// ─── 理解题 ────────────────────────────────────────────

export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank';

/** 阅读理解题 */
export interface ComprehensionQuestion {
  /** 题目 ID */
  id: string;
  /** 题型 */
  type: QuestionType;
  /** 题干（英文） */
  stem: string;
  /** 选项（选择/判断题） */
  options?: string[];
  /** 正确答案索引或文本 */
  answer: number | string;
  /** 解析（答后展示） */
  explanation: string;
  /** 该题考察的词汇或语法点 */
  focusChunk?: string;
}

// ─── LLM 生成请求 ──────────────────────────────────────

/** 文章生成请求（发给 Worker 的输入契约） */
export interface ArticleGenerationRequest {
  /** 目标阅读级别 */
  level: ReadingLevel;
  /** 主题 */
  topic: ArticleTopic;
  /** 词汇墙约束：允许使用的词汇集合（小写） */
  vocabularyWall: string[];
  /** 目标词数范围 */
  wordCountRange: { min: number; max: number };
  /** 理解题数量 */
  questionCount: number;
  /** 上一篇文章主题（避免重复） */
  previousTopic?: ArticleTopic;
}

/** LLM Worker 返回的生成结果 */
export interface ArticleGenerationResult {
  article: LeveledArticle;
  /** 生成耗时 ms */
  generationTimeMs: number;
  /** 实际使用的 LLM token 数 */
  tokensUsed: number;
  /** 超纲词汇列表（如有，用于质量审计） */
  outOfVocabularyWords: string[];
}

// ─── 词数规范（RAZ 官方参考） ──────────────────────────

/** RAZ 级别对应的建议词数范围 */
export const RAZ_WORD_COUNT_RANGE: Record<ReadingLevel, { min: number; max: number }> = {
  AA: { min: 10, max: 30 },
  A:  { min: 20, max: 50 },
  B:  { min: 30, max: 70 },
  C:  { min: 40, max: 90 },
  D:  { min: 50, max: 110 },
  E:  { min: 60, max: 130 },
  F:  { min: 70, max: 150 },
  G:  { min: 80, max: 180 },
  H:  { min: 100, max: 210 },
  I:  { min: 120, max: 240 },
  J:  { min: 140, max: 270 },
  K:  { min: 160, max: 300 },
  L:  { min: 180, max: 340 },
  M:  { min: 200, max: 380 },
  N:  { min: 220, max: 420 },
  O:  { min: 240, max: 460 },
  P:  { min: 260, max: 500 },
  Q:  { min: 280, max: 540 },
  R:  { min: 300, max: 580 },
  S:  { min: 320, max: 620 },
  T:  { min: 340, max: 660 },
  U:  { min: 360, max: 700 },
  V:  { min: 380, max: 740 },
  W:  { min: 400, max: 780 },
  X:  { min: 420, max: 820 },
  Y:  { min: 440, max: 860 },
  Z:  { min: 460, max: 900 },
  Z1: { min: 480, max: 950 },
  Z2: { min: 500, max: 1000 },
};
