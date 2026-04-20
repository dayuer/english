/**
 * 词汇防火墙 (Vocabulary Firewall)
 *
 * 核心约束：
 * 1. 聚合用户当前 RAZ 等级及以下全部词汇，构建 O(1) 查询的哈希集合
 * 2. 为 GLM-4-Voice 的 System Prompt 注入词汇约束段
 * 3. 提供文本级后置校验（用于非实时路径的场景包预审）
 *
 * 实时路径说明：
 * GLM-4-Voice 直接输出音频流，无法做文本级后置拦截。
 * 因此实时对话中词汇墙仅作为 Prompt 前置约束注入。
 * 后置校验仅用于离线场景包内容审核。
 */

import { RazLevel, RAZ_LEVEL_ORDER, razLevelToNumeric } from '../types/vocabulary';
import { getVocabularyByLevel } from './vocabulary';

/** 基础功能词（不受 RAZ 等级限制的常用词） */
const FUNCTION_WORDS = new Set([
  // 冠词/代词
  'a', 'an', 'the', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours',
  // 系动词/助动词
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'have', 'has', 'had',
  'will', 'would', 'can', 'could', 'shall', 'should', 'may', 'might', 'must',
  // 介词/连词
  'in', 'on', 'at', 'to', 'for', 'with', 'from', 'of', 'by', 'about', 'up', 'down',
  'and', 'or', 'but', 'not', 'no', 'yes', 'if', 'so', 'then',
  // 疑问词
  'what', 'where', 'when', 'who', 'how', 'why', 'which',
  // 高频副词
  'here', 'there', 'now', 'just', 'very', 'too', 'also', 'well',
  // 标点/数字相关
  'please', 'thank', 'thanks', 'sorry', 'okay', 'ok', 'hello', 'hi', 'bye',
]);

/** 词汇墙实例 — 缓存某个 RAZ 等级下的全部允许词集 */
export class VocabularyFirewall {
  private allowedWords: Set<string>;
  private maxLevel: RazLevel;
  private vocabSample: string[] = [];

  private constructor(maxLevel: RazLevel, allowedWords: Set<string>) {
    this.maxLevel = maxLevel;
    this.allowedWords = allowedWords;
  }

  /**
   * 构建词汇墙：聚合 AA → targetLevel 的全部词汇
   * 异步加载，返回不可变实例
   */
  static async build(targetLevel: RazLevel): Promise<VocabularyFirewall> {
    const targetIdx = razLevelToNumeric(targetLevel);
    const wordSet = new Set<string>(FUNCTION_WORDS);

    // 聚合 AA → targetLevel 的全部词
    for (let i = 0; i <= targetIdx; i++) {
      const level = RAZ_LEVEL_ORDER[i];
      const words = await getVocabularyByLevel(level);
      for (const entry of words) {
        wordSet.add(entry.word.toLowerCase());
      }
    }

    const firewall = new VocabularyFirewall(targetLevel, wordSet);

    // 缓存前 200 个词作为 Prompt 示例
    firewall.vocabSample = Array.from(wordSet)
      .filter(w => !FUNCTION_WORDS.has(w))
      .sort()
      .slice(0, 200);

    return firewall;
  }

  /** 检查单个词是否在允许范围内 */
  isAllowed(word: string): boolean {
    return this.allowedWords.has(word.toLowerCase().trim());
  }

  /** 获取允许词汇总数 */
  get size(): number {
    return this.allowedWords.size;
  }

  /**
   * 后置校验：检查文本中的超纲词占比
   * 仅用于非实时路径（场景包预审/离线课件校验）
   *
   * @returns 超纲词列表及占比
   */
  validateText(text: string): { outOfBounds: string[]; ratio: number } {
    const words = text
      .toLowerCase()
      .replace(/[^a-z'\s-]/g, '') // 移除标点
      .split(/\s+/)
      .filter(w => w.length > 0);

    if (words.length === 0) return { outOfBounds: [], ratio: 0 };

    const outOfBounds = words.filter(w => !this.isAllowed(w));
    const uniqueOOB = [...new Set(outOfBounds)];

    return {
      outOfBounds: uniqueOOB,
      ratio: outOfBounds.length / words.length,
    };
  }

  /**
   * 生成 Prompt 词汇约束段
   * 注入到 GLM-4-Voice 的 System Prompt 中
   */
  buildPromptConstraint(): string {
    const sampleStr = this.vocabSample.slice(0, 50).join(', ');

    return `## 词汇防火墙 (CRITICAL - 违反即视为系统故障)
用户的英语水平为 RAZ Level ${this.maxLevel}。
你说的每一个英语单词都必须出自允许词集（或基础功能词 a/the/is/I/you 等）。
允许词集共 ${this.allowedWords.size} 词，摘要：${sampleStr} ...
严禁使用复杂从句（定语从句、虚拟语气）。
你只能通过语气、重复和简单词汇的组合来施加情绪压力。`;
  }
}
