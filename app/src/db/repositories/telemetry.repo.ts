import { query, execute } from '../client';

export async function insertTelemetry(
  userId: number,
  lessonId: number | null,
  chunkHash: string,
  reactionDurationMs: number,
  isCorrect: boolean,
): Promise<void> {
  await execute(
    `INSERT INTO learning_telemetry (user_id, lesson_id, chunk_hash, reaction_duration_ms, is_correct)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, lessonId, chunkHash, reactionDurationMs, isCorrect ? 1 : 0]
  );

  // Also enqueue for sync
  await execute(
    `INSERT INTO sync_queue (record_type, payload)
     VALUES ('telemetry', ?)`,
    [
      JSON.stringify({ userId, lessonId, chunkHash, reactionDurationMs, isCorrect }),
    ]
  );
}

export async function getUnsyncedTelemetry(limit: number = 50): Promise<
  { id: number; payload: string }[]
> {
  return query(
    'SELECT id, payload FROM sync_queue WHERE record_type = ? AND attempts < 10 ORDER BY created_at ASC LIMIT ?',
    ['telemetry', limit]
  );
}

export async function markSynced(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await execute(
    `DELETE FROM sync_queue WHERE id IN (${placeholders})`,
    ids
  );
  await execute(
    `UPDATE learning_telemetry SET synced = 1 WHERE synced = 0 AND created_at <= datetime('now')`,
    []
  );
}

export async function archiveOldTelemetry(olderThanDays: number = 30): Promise<void> {
  await execute(
    `DELETE FROM learning_telemetry
     WHERE synced = 1 AND created_at < datetime('now', '-' || ? || ' days')`,
    [olderThanDays]
  );
}

export async function incrementSyncAttempts(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await execute(
    `UPDATE sync_queue SET attempts = attempts + 1, last_attempt_at = datetime('now')
     WHERE id IN (${placeholders})`,
    ids
  );
}
