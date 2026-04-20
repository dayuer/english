import { query, queryFirst, execute } from '../client';
import type { Lesson, MapNode } from '../../types/lesson';
import { LessonStatus } from '../../types/lesson';

export async function getAvailableLessons(userId: number): Promise<Lesson[]> {
  return query<Lesson>(
    `SELECT * FROM lesson_queue
     WHERE user_id = ? AND status != ?
     ORDER BY seq ASC`,
    [userId, LessonStatus.Locked]
  );
}

export async function getMapNodes(userId: number): Promise<MapNode[]> {
  return query<MapNode>(
    `SELECT id, seq, icon, label, concept, status
     FROM lesson_queue
     WHERE user_id = ?
     ORDER BY seq ASC`,
    [userId]
  );
}

export async function getLessonById(id: number): Promise<Lesson | null> {
  return queryFirst<Lesson>('SELECT * FROM lesson_queue WHERE id = ?', [id]);
}

export async function getNextLesson(userId: number): Promise<Lesson | null> {
  return queryFirst<Lesson>(
    `SELECT * FROM lesson_queue
     WHERE user_id = ? AND status = ?
     ORDER BY seq ASC LIMIT 1`,
    [userId, LessonStatus.Available]
  );
}

export async function updateLessonStatus(id: number, status: LessonStatus): Promise<void> {
  const extra = status === LessonStatus.Consumed ? ", consumed_at = datetime('now')" : '';
  await execute(
    `UPDATE lesson_queue SET status = ?${extra} WHERE id = ?`,
    [status, id]
  );
}

export async function insertLesson(
  userId: number,
  seq: number,
  packId: string,
  concept: string,
  theme: string,
  icon: string,
  label: string,
  localPath: string,
  focusChunkHashes: string[] | null,
  status: LessonStatus = LessonStatus.Available,
): Promise<number> {
  const result = await execute(
    `INSERT INTO lesson_queue (user_id, status, seq, focus_chunk_hashes, local_path, pack_id, concept, theme, icon, label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId, status, seq,
      focusChunkHashes ? JSON.stringify(focusChunkHashes) : null,
      localPath, packId, concept, theme, icon, label,
    ]
  );
  return result.lastInsertRowId;
}

/** Count completed lessons for a user */
export async function getCompletedCount(userId: number): Promise<number> {
  const row = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM lesson_queue WHERE user_id = ? AND status = ?',
    [userId, LessonStatus.Consumed]
  );
  return row?.count ?? 0;
}
