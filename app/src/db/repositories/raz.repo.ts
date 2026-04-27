/**
 * RAZ 晋级引擎 — 用户级别读写、Boss 战记录、掌握度计算
 */
import { query, queryFirst, execute } from '../client';
import type { RazLevel } from '../../types/vocabulary';
import { RAZ_LEVEL_ORDER, razLevelToNumeric } from '../../types/vocabulary';

// ─── 用户 RAZ 状态 ────────────────────────────────────

export interface UserRazState {
  id: number;
  raz_current_level: string;
  raz_level_mastery_pct: number;
}

/** 获取用户的 RAZ 当前状态 */
export async function getRazState(userId: number): Promise<UserRazState | null> {
  return queryFirst<UserRazState>(
    'SELECT id, raz_current_level, raz_level_mastery_pct FROM users WHERE id = ?',
    [userId],
  );
}

/** 更新用户 RAZ 级别 */
export async function updateRazLevel(userId: number, newLevel: RazLevel): Promise<void> {
  await execute(
    `UPDATE users SET raz_current_level = ?, raz_level_mastery_pct = 0.0, updated_at = datetime('now') WHERE id = ?`,
    [newLevel, userId],
  );
}

/** 更新当前级别掌握百分比 */
export async function updateRazMasteryPct(userId: number, pct: number): Promise<void> {
  await execute(
    `UPDATE users SET raz_level_mastery_pct = ?, updated_at = datetime('now') WHERE id = ?`,
    [Math.min(pct, 1.0), userId],
  );
}

// ─── Boss 战记录 ──────────────────────────────────────

export interface RazPromotion {
  id: number;
  user_id: number;
  from_level: string;
  to_level: string;
  sprint_score: number;
  passed: number;
  vocab_mastery_snapshot: string;
  created_at: string;
}

/** 记录一次 Boss 战结果（无论通过与否） */
export async function recordPromotion(params: {
  userId: number;
  fromLevel: RazLevel;
  toLevel: RazLevel;
  sprintScore: number;
  passed: boolean;
  vocabMasterySnapshot: Record<string, number>;
}): Promise<void> {
  const snapshotJson = JSON.stringify(params.vocabMasterySnapshot);
  await execute(
    `INSERT INTO raz_promotions (user_id, from_level, to_level, sprint_score, passed, vocab_mastery_snapshot)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [params.userId, params.fromLevel, params.toLevel, params.sprintScore, params.passed ? 1 : 0, snapshotJson],
  );

  // 通过则跃迁用户级别
  if (params.passed) {
    await updateRazLevel(params.userId, params.toLevel);
  }
}

/** 查询用户最近 N 次 Boss 战记录 */
export async function getRecentPromotions(userId: number, limit = 5): Promise<RazPromotion[]> {
  return query<RazPromotion>(
    'SELECT * FROM raz_promotions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit],
  );
}

/** 检查用户是否在冷却期（48h 内失败过同一晋级） */
export async function isInCooldown(userId: number, fromLevel: RazLevel, toLevel: RazLevel): Promise<boolean> {
  const row = await queryFirst<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM raz_promotions
     WHERE user_id = ? AND from_level = ? AND to_level = ? AND passed = 0
       AND created_at > datetime('now', '-48 hours')`,
    [userId, fromLevel, toLevel],
  );
  return (row?.cnt ?? 0) > 0;
}

// ─── 掌握度计算 ───────────────────────────────────────

/**
 * 计算用户在指定 RAZ 级别的词汇掌握率
 * 基于 user_chunks 表中 mastery_level ≥ 3 的比例
 */
export async function calcLevelMastery(userId: number, _level: RazLevel): Promise<number> {
  const row = await queryFirst<{ total: number; mastered: number }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN mastery_level >= 3 THEN 1 ELSE 0 END) as mastered
     FROM user_chunks WHERE user_id = ?`,
    [userId],
  );
  if (!row || row.total === 0) return 0;
  return row.mastered / row.total;
}

/** 获取下一个 RAZ 级别 */
export function getNextRazLevel(current: RazLevel): RazLevel {
  const idx = razLevelToNumeric(current);
  return RAZ_LEVEL_ORDER[Math.min(idx + 1, RAZ_LEVEL_ORDER.length - 1)];
}
