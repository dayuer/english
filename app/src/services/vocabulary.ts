/**
 * 词汇服务 — RAZ 分级词库加载与查询
 *
 * 设计决策：
 * - 词库 JSON 以静态资产方式打包进 app（通过 require 导入）
 * - 内存缓存已加载的词库，避免重复解析
 * - 提供按 RAZ Level 筛选、随机抽样、i+1 窗口查询等能力
 * - 为 Curriculum Topology Agent 提供种子词汇数据源
 */
import type {
  RawVocabularyWord,
  RazLevel,
  VocabularyEntry,
  VocabularyDictionary,
} from '../types/vocabulary';
import { toVocabularyEntry, RAZ_LEVEL_ORDER, razLevelToNumeric } from '../types/vocabulary';

// ─── 词库注册表 ────────────────────────────────────────
// 由 scripts/download-raz.mjs 生成的 _manifest.json 手动同步
// 注意：React Native 不能动态 require，需要静态映射
const DICT_REGISTRY: VocabularyDictionary[] = RAZ_LEVEL_ORDER.map((level) => ({
  id: `raz-${level}`,
  razLevel: level,
  wordCount: 0, // 运行时从加载数据填充
  file: `raz-${level}.json`,
}));

// ─── 静态资产映射（React Native require 必须是字符串字面量） ─
// 由于 React Native 的 Metro bundler 要求 require 参数为静态字符串，
// 此处使用 Record 映射代替动态 require
const RAZ_ASSETS: Record<RazLevel, RawVocabularyWord[]> = {} as any;

// 懒加载标记
let _assetsLoaded = false;

const DICT_REQUIRE_MAP: Record<RazLevel, () => any> = {
  'AA': () => require('../../assets/dicts/raz/raz-AA.json'),
  'A': () => require('../../assets/dicts/raz/raz-A.json'),
  'B': () => require('../../assets/dicts/raz/raz-B.json'),
  'C': () => require('../../assets/dicts/raz/raz-C.json'),
  'D': () => require('../../assets/dicts/raz/raz-D.json'),
  'E': () => require('../../assets/dicts/raz/raz-E.json'),
  'F': () => require('../../assets/dicts/raz/raz-F.json'),
  'G': () => require('../../assets/dicts/raz/raz-G.json'),
  'H': () => require('../../assets/dicts/raz/raz-H.json'),
  'I': () => require('../../assets/dicts/raz/raz-I.json'),
  'J': () => require('../../assets/dicts/raz/raz-J.json'),
  'K': () => require('../../assets/dicts/raz/raz-K.json'),
  'L': () => require('../../assets/dicts/raz/raz-L.json'),
  'M': () => require('../../assets/dicts/raz/raz-M.json'),
  'N': () => require('../../assets/dicts/raz/raz-N.json'),
  'O': () => require('../../assets/dicts/raz/raz-O.json'),
  'P': () => require('../../assets/dicts/raz/raz-P.json'),
  'Q': () => require('../../assets/dicts/raz/raz-Q.json'),
  'R': () => require('../../assets/dicts/raz/raz-R.json'),
  'S': () => require('../../assets/dicts/raz/raz-S.json'),
  'T': () => require('../../assets/dicts/raz/raz-T.json'),
  'U': () => require('../../assets/dicts/raz/raz-U.json'),
  'V': () => require('../../assets/dicts/raz/raz-V.json'),
  'W': () => require('../../assets/dicts/raz/raz-W.json'),
  'X': () => require('../../assets/dicts/raz/raz-X.json'),
  'Y': () => require('../../assets/dicts/raz/raz-Y.json'),
  'Z': () => require('../../assets/dicts/raz/raz-Z.json'),
  'Z1': () => require('../../assets/dicts/raz/raz-Z1.json'),
  'Z2': () => require('../../assets/dicts/raz/raz-Z2.json'),
};

/**
 * 加载指定 RAZ Level 的词库
 * 生产阶段打包为静态资产，按需懒加载避免初始启动解析开销过大
 */
async function loadRazDictionary(level: RazLevel): Promise<RawVocabularyWord[]> {
  if (RAZ_ASSETS[level]) return RAZ_ASSETS[level];

  try {
    const module = DICT_REQUIRE_MAP[level]();
    const words: RawVocabularyWord[] = module.default ?? module;
    RAZ_ASSETS[level] = words;
    return words;
  } catch (err) {
    console.warn(`[词汇服务] 加载 raz-${level} 失败:`, err);
    return [];
  }
}

// ─── 公开 API ──────────────────────────────────────────

/** 获取所有可用的词库级别 */
export function getAvailableLevels(): readonly RazLevel[] {
  return RAZ_LEVEL_ORDER;
}

/** 获取词库注册表 */
export function getDictRegistry(): VocabularyDictionary[] {
  return DICT_REGISTRY;
}

/** 加载指定级别的全部词汇 */
export async function getVocabularyByLevel(level: RazLevel): Promise<VocabularyEntry[]> {
  const raw = await loadRazDictionary(level);
  return raw.map((w) => toVocabularyEntry(w, level));
}

/**
 * i+1 窗口查询：获取当前水平附近 ±1 级别的词汇池
 * 用于 Curriculum Topology Agent 生成适当难度的练习内容
 */
export async function getIPlusOneWindow(
  currentLevel: RazLevel,
  windowSize: number = 1,
): Promise<VocabularyEntry[]> {
  const currentIdx = razLevelToNumeric(currentLevel);
  const minIdx = Math.max(0, currentIdx - windowSize);
  const maxIdx = Math.min(RAZ_LEVEL_ORDER.length - 1, currentIdx + windowSize);

  const entries: VocabularyEntry[] = [];
  for (let i = minIdx; i <= maxIdx; i++) {
    const level = RAZ_LEVEL_ORDER[i];
    const levelEntries = await getVocabularyByLevel(level);
    entries.push(...levelEntries);
  }

  return entries;
}

/**
 * 从指定级别随机抽样 N 个词汇
 * 用于诊断测试和练习生成
 */
export async function sampleVocabulary(
  level: RazLevel,
  count: number,
): Promise<VocabularyEntry[]> {
  const all = await getVocabularyByLevel(level);
  if (all.length <= count) return all;

  // Fisher-Yates 洗牌取前 N 个
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

/**
 * 词汇墙：聚合 ≤ level 的全部词汇为 Set<string>（小写）
 * 用于 LLM 微课生成器约束输出词汇范围，确保生成内容不超出用户当前水平
 */
export async function getVocabularyWall(level: RazLevel): Promise<Set<string>> {
  const maxIdx = razLevelToNumeric(level);
  const wall = new Set<string>();

  for (let i = 0; i <= maxIdx; i++) {
    const lvl = RAZ_LEVEL_ORDER[i];
    const raw = await loadRazDictionary(lvl);
    for (const w of raw) {
      wall.add(w.name.toLowerCase().trim());
    }
  }

  return wall;
}

/**
 * 在所有级别中搜索单词（精确匹配）
 * 用于查词和错误分析
 */
export async function lookupWord(word: string): Promise<VocabularyEntry | null> {
  const normalizedWord = word.toLowerCase().trim();

  for (const level of RAZ_LEVEL_ORDER) {
    const entries = await getVocabularyByLevel(level);
    const found = entries.find((e) => e.word.toLowerCase() === normalizedWord);
    if (found) return found;
  }

  return null;
}
