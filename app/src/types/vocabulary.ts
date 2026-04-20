/**
 * 词汇数据模型 — 桥接 qwerty-learner RAZ 词库与 NeuroGlot Chunk 体系
 *
 * 设计决策：
 * - 保留原始 RAZ JSON 的 { name, trans, usphone, ukphone } 结构零成本导入
 * - 通过 VocabularyEntry 扩展为 NeuroGlot 内部模型，附加分级信息和发音 URL
 * - RAZ Level 直接映射到 i+1 难度阶梯，供 Curriculum Topology Agent 消费
 */

/** RAZ 原始 JSON 中的单条词汇（与 qwerty-learner Word 类型一一对应） */
export interface RawVocabularyWord {
  name: string;
  trans: string[];
  usphone: string;
  ukphone: string;
}

/** NeuroGlot 内部词汇条目 */
export interface VocabularyEntry {
  /** 单词文本（英文） */
  word: string;
  /** 中文翻译数组（保留多义项） */
  translations: string[];
  /** 美式音标 */
  phoneticUS: string;
  /** 英式音标 */
  phoneticUK: string;
  /** RAZ 分级（AA, A, B, ... Z, Z1, Z2） */
  razLevel: RazLevel;
  /** 有道发音 URL（美式） */
  pronunciationUrl: string;
}

/**
 * RAZ 阅读分级枚举
 * Guided Reading Levels: AA → Z2，共 29 级
 * 数值映射便于难度排序和 i+1 计算
 */
export const RAZ_LEVEL_ORDER = [
  'AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y',
  'Z', 'Z1', 'Z2',
] as const;

export type RazLevel = typeof RAZ_LEVEL_ORDER[number];

/** RAZ Level → 数值难度（0-28），用于排序和 i+1 距离计算 */
export function razLevelToNumeric(level: RazLevel): number {
  const idx = RAZ_LEVEL_ORDER.indexOf(level);
  return idx >= 0 ? idx : 0;
}

/** 词库注册条目 */
export interface VocabularyDictionary {
  id: string;
  razLevel: RazLevel;
  wordCount: number;
  /** assets/ 下的相对路径 */
  file: string;
}

/** 将 RAZ 原始词汇转换为 NeuroGlot VocabularyEntry */
export function toVocabularyEntry(
  raw: RawVocabularyWord,
  razLevel: RazLevel,
): VocabularyEntry {
  return {
    word: raw.name,
    translations: raw.trans,
    phoneticUS: raw.usphone,
    phoneticUK: raw.ukphone,
    razLevel,
    pronunciationUrl: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(raw.name)}&type=1`,
  };
}
