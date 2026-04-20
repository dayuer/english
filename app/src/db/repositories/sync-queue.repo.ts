import { query, queryFirst, execute } from '../client';

export interface SyncQueueItem {
  id: number;
  recordType: string;
  payload: string;
  createdAt: string;
  attempts: number;
  lastAttemptAt: string | null;
}

export async function enqueue(recordType: string, payload: object): Promise<void> {
  await execute(
    'INSERT INTO sync_queue (record_type, payload) VALUES (?, ?)',
    [recordType, JSON.stringify(payload)]
  );
}

export async function dequeue(limit: number = 50): Promise<SyncQueueItem[]> {
  return query<SyncQueueItem>(
    'SELECT * FROM sync_queue WHERE attempts < 10 ORDER BY created_at ASC LIMIT ?',
    [limit]
  );
}

export async function removeByIds(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await execute(
    `DELETE FROM sync_queue WHERE id IN (${placeholders})`,
    ids
  );
}

export async function incrementAttempts(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await execute(
    `UPDATE sync_queue SET attempts = attempts + 1, last_attempt_at = datetime('now')
     WHERE id IN (${placeholders})`,
    ids
  );
}

export async function getPendingCount(): Promise<number> {
  const row = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM sync_queue WHERE attempts < 10'
  );
  return row?.count ?? 0;
}

export async function purgeStale(maxAttempts: number = 10): Promise<number> {
  const result = await execute(
    'DELETE FROM sync_queue WHERE attempts >= ?',
    [maxAttempts]
  );
  return result.changes;
}
