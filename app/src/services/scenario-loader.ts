/**
 * 场景包加载与注册中心
 *
 * 职责：
 * 1. 管理所有已注册场景包的生命周期
 * 2. 根据用户 RAZ 等级过滤可用场景
 * 3. 为每个场景预构建词汇防火墙实例
 */

import type { ScenarioDefinition } from '../types/conversation';
import type { RazLevel } from '../types/vocabulary';
import { razLevelToNumeric } from '../types/vocabulary';
import { VocabularyFirewall } from './vocab-firewall';

// 内置场景包注册
import { CUSTOMS_ENTRY_SCENARIO } from '../data/scenarios/customs-entry';

/** 场景包 + 预构建的词汇防火墙 */
export interface LoadedScenario {
  definition: ScenarioDefinition;
  firewall: VocabularyFirewall;
}

/** 场景注册中心（单例） */
class ScenarioRegistry {
  /** 已注册的场景定义（静态数据，不含防火墙） */
  private definitions: Map<string, ScenarioDefinition> = new Map();

  /** 已加载的场景（含预构建的防火墙，懒加载） */
  private loaded: Map<string, LoadedScenario> = new Map();

  constructor() {
    // 注册内置场景包
    this.register(CUSTOMS_ENTRY_SCENARIO);
  }

  /** 注册场景包 */
  register(scenario: ScenarioDefinition): void {
    this.definitions.set(scenario.id, scenario);
    // 清除已缓存的加载实例（防火墙可能需要重建）
    this.loaded.delete(scenario.id);
  }

  /** 获取全部已注册场景的摘要列表（不触发词汇墙构建） */
  listAll(): ScenarioDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * 根据用户 RAZ 等级过滤可用场景
   * 只返回 razLevelMin ≤ userLevel 的场景
   */
  listAvailable(userRazLevel: RazLevel): ScenarioDefinition[] {
    const userIdx = razLevelToNumeric(userRazLevel);
    return this.listAll().filter(s => razLevelToNumeric(s.razLevelMin) <= userIdx);
  }

  /**
   * 加载场景包（含词汇防火墙预构建）
   * 首次加载会异步构建防火墙（聚合 RAZ 词汇），后续走缓存
   */
  async load(scenarioId: string): Promise<LoadedScenario> {
    // 命中缓存
    const cached = this.loaded.get(scenarioId);
    if (cached) return cached;

    const definition = this.definitions.get(scenarioId);
    if (!definition) {
      throw new Error(`[ScenarioLoader] 场景不存在: ${scenarioId}`);
    }

    // 构建词汇防火墙（聚合 AA → razLevelMax 的全部词汇）
    const firewall = await VocabularyFirewall.build(definition.razLevelMax);

    const loaded: LoadedScenario = { definition, firewall };
    this.loaded.set(scenarioId, loaded);

    return loaded;
  }

  /** 获取场景定义（不加载防火墙） */
  getDefinition(scenarioId: string): ScenarioDefinition | undefined {
    return this.definitions.get(scenarioId);
  }

  /** 清除防火墙缓存（用户 RAZ 等级变更时调用） */
  invalidateCache(): void {
    this.loaded.clear();
  }
}

/** 全局单例 */
export const scenarioRegistry = new ScenarioRegistry();
