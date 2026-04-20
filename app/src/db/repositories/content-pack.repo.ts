import { query, queryFirst, execute } from '../client';

export interface ContentPackRecord {
  id: string;
  version: number;
  title: string;
  description: string | null;
  langPair: string;
  totalLessons: number;
  totalChunks: number;
  totalAudio: number;
  totalBytes: number;
  manifestJson: string | null;
  installedAt: string;
}

export async function installPack(pack: {
  id: string;
  version: number;
  title: string;
  description?: string;
  langPair: string;
  totalLessons: number;
  totalChunks: number;
  totalAudio: number;
  totalBytes: number;
  manifestJson?: string;
}): Promise<void> {
  await execute(
    `INSERT OR REPLACE INTO content_packs (id, version, title, description, lang_pair, total_lessons, total_chunks, total_audio, total_bytes, manifest_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pack.id, pack.version, pack.title, pack.description ?? null, pack.langPair,
      pack.totalLessons, pack.totalChunks, pack.totalAudio, pack.totalBytes,
      pack.manifestJson ?? null,
    ]
  );
}

export async function getInstalledPacks(): Promise<ContentPackRecord[]> {
  return query<ContentPackRecord>('SELECT * FROM content_packs ORDER BY installed_at DESC');
}

export async function isInstalled(id: string, minVersion?: number): Promise<boolean> {
  const row = await queryFirst<{ version: number }>(
    'SELECT version FROM content_packs WHERE id = ?',
    [id]
  );
  if (!row) return false;
  if (minVersion !== undefined) return row.version >= minVersion;
  return true;
}

export async function removePack(id: string): Promise<void> {
  await execute('DELETE FROM lesson_queue WHERE pack_id = ?', [id]);
  await execute('DELETE FROM chunk_graph WHERE pack_id = ?', [id]);
  await execute('DELETE FROM content_packs WHERE id = ?', [id]);
}

export async function getStorageUsage(): Promise<{
  totalPacks: number;
  totalLessons: number;
  totalChunks: number;
}> {
  const row = await queryFirst<{
    totalPacks: number;
    totalLessons: number;
    totalChunks: number;
  }>(
    `SELECT
      COUNT(*) as totalPacks,
      COALESCE(SUM(total_lessons), 0) as totalLessons,
      COALESCE(SUM(total_chunks), 0) as totalChunks
    FROM content_packs`
  );
  return row ?? { totalPacks: 0, totalLessons: 0, totalChunks: 0 };
}
