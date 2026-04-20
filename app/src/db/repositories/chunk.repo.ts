import { query, queryFirst, execute } from '../client';
import type { Chunk } from '../../types/chunk';
import { calculateNextReview } from '../../services/spaced-repetition';

export async function upsertChunk(
  userId: number,
  chunkHash: string,
  chunkText: string,
  masteryLevel: number,
  reactionMs: number,
  isCorrect: boolean
): Promise<void> {
  const existing = await queryFirst<{ id: number; attempt_count: number; error_count: number; avg_reaction_ms: number }>(
    'SELECT id, attempt_count, error_count, avg_reaction_ms FROM user_chunks WHERE user_id = ? AND chunk_hash = ?',
    [userId, chunkHash]
  );

  if (existing) {
    const newAttempts = existing.attempt_count + 1;
    const newErrors = existing.error_count + (isCorrect ? 0 : 1);
    // Running average of reaction time
    const newAvgMs = Math.round(
      (existing.avg_reaction_ms * existing.attempt_count + reactionMs) / newAttempts
    );
    const newMastery = Math.max(masteryLevel, isCorrect ? 1 : 0);
    const nextReviewAt = calculateNextReview(newMastery, newErrors, newAvgMs);

    await execute(
      `UPDATE user_chunks SET
        mastery_level = ?,
        avg_reaction_ms = ?,
        attempt_count = ?,
        error_count = ?,
        next_review_at = ?,
        last_reviewed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?`,
      [newMastery, newAvgMs, newAttempts, newErrors, nextReviewAt, existing.id]
    );
  } else {
    const initialMastery = isCorrect ? 1 : 0;
    const nextReviewAt = calculateNextReview(initialMastery, isCorrect ? 0 : 1, reactionMs);

    await execute(
      `INSERT INTO user_chunks (user_id, chunk_hash, chunk_text, mastery_level, avg_reaction_ms, attempt_count, error_count, next_review_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [userId, chunkHash, chunkText, initialMastery, reactionMs, isCorrect ? 0 : 1, nextReviewAt]
    );
  }
}

export async function getChunksDueForReview(userId: number): Promise<Chunk[]> {
  return query<Chunk>(
    `SELECT * FROM user_chunks
     WHERE user_id = ? AND next_review_at <= datetime('now')
     ORDER BY next_review_at ASC`,
    [userId]
  );
}

export async function getChunkByHash(userId: number, chunkHash: string): Promise<Chunk | null> {
  return queryFirst<Chunk>(
    'SELECT * FROM user_chunks WHERE user_id = ? AND chunk_hash = ?',
    [userId, chunkHash]
  );
}

export async function getMasterySummary(userId: number): Promise<{
  total: number;
  byLevel: Record<number, number>;
}> {
  const rows = await query<{ mastery_level: number; count: number }>(
    'SELECT mastery_level, COUNT(*) as count FROM user_chunks WHERE user_id = ? GROUP BY mastery_level',
    [userId]
  );
  const byLevel: Record<number, number> = {};
  let total = 0;
  for (const row of rows) {
    byLevel[row.mastery_level] = row.count;
    total += row.count;
  }
  return { total, byLevel };
}
