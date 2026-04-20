import { queryFirst, execute } from '../client';

/**
 * TTS Audio Asset Cache Repository
 * Hash standard preserved: SHA256(LOWER(TRIM(l2_text)) + '\x00' + LOWER(emotion_tag))
 */
export async function getByHash(hash: string): Promise<{ localPath: string } | null> {
  return queryFirst<{ localPath: string }>(
    'SELECT local_path as localPath FROM tts_assets_cache WHERE asset_hash = ?',
    [hash]
  );
}

export async function insertAudio(
  assetHash: string,
  l2Text: string,
  emotionTag: string,
  localPath: string,
): Promise<void> {
  await execute(
    `INSERT OR IGNORE INTO tts_assets_cache (asset_hash, l2_text, emotion_tag, local_path)
     VALUES (?, ?, ?, ?)`,
    [assetHash, l2Text, emotionTag, localPath]
  );
}

export async function incrementHitCount(hash: string): Promise<void> {
  await execute(
    'UPDATE tts_assets_cache SET hit_count = hit_count + 1, updated_at = datetime("now") WHERE asset_hash = ?',
    [hash]
  );
}

export async function getOrCreateAudio(
  assetHash: string,
  l2Text: string,
  emotionTag: string,
  localPath: string,
): Promise<string> {
  const existing = await getByHash(assetHash);
  if (existing) {
    await incrementHitCount(assetHash);
    return existing.localPath;
  }
  await insertAudio(assetHash, l2Text, emotionTag, localPath);
  return localPath;
}

export async function getCacheStats(): Promise<{
  totalAssets: number;
  totalHits: number;
}> {
  const row = await queryFirst<{ total: number; hits: number }>(
    'SELECT COUNT(*) as total, SUM(hit_count) as hits FROM tts_assets_cache'
  );
  return {
    totalAssets: row?.total ?? 0,
    totalHits: row?.hits ?? 0,
  };
}
