/**
 * Content Pack Service
 * Handles download, verify, extract, and ingest of lesson content packs
 */
import { Paths, Directory, File } from 'expo-file-system';
import { getDatabase, execute } from '../db/client';
import { installPack, isInstalled, removePack } from '../db/repositories/content-pack.repo';
import { insertEdges } from '../db/repositories/chunk-graph.repo';
import { insertAudio } from '../db/repositories/audio.repo';
import { upsertChunk } from '../db/repositories/chunk.repo';
import type { ContentPackManifest } from '../types/content-pack';
import { LessonStatus } from '../types/lesson';

const PACKS_DIR = new Directory(Paths.document, 'content-packs');
const AUDIO_DIR = new Directory(Paths.document, 'audio');

/** Ensure directory exists */
async function ensureDir(dir: Directory): Promise<void> {
  if (!dir.exists) {
    await dir.create();
  }
}

/** Fetch list of available packs from server */
export async function fetchAvailablePacks(apiBase: string): Promise<ContentPackManifest[]> {
  const response = await fetch(`${apiBase}/content/packs`);
  if (!response.ok) throw new Error(`Failed to fetch packs: ${response.status}`);
  return response.json();
}

/** Download a content pack ZIP */
export async function downloadPack(
  apiBase: string,
  packId: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  await ensureDir(PACKS_DIR);

  const url = `${apiBase}/content/packs/${packId}/download`;
  const destFile = new File(PACKS_DIR, `${packId}.zip`);

  // expo-file-system v19 doesn't have downloadResumable.
  // For now, fetch + write as buffer.
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);

  const total = parseInt(response.headers.get('content-length') || '0', 10);
  let received = 0;

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No readable stream');

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) onProgress?.((received / total) * 100);
  }

  // Merge chunks and write to file
  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  await destFile.write(merged);

  return destFile.uri;
}

/** Verify pack integrity — checks file existence and size */
export async function verifyPack(zipPath: string, expectedChecksum: string): Promise<boolean> {
  // TODO: Full SHA-256 checksum requires expo-crypto or JS-based implementation
  const file = new File(zipPath);
  if (!file.exists) return false;
  const info = await file.info();
  return (info?.size ?? 0) > 0;
}

/** Extract and ingest a content pack into the database */
export async function ingestPack(
  packId: string,
  manifest: ContentPackManifest,
): Promise<void> {
  await ensureDir(AUDIO_DIR);

  const packDir = new Directory(PACKS_DIR, packId);
  await ensureDir(packDir);

  // Check if already installed with same or higher version
  const alreadyInstalled = await isInstalled(packId, manifest.version);
  if (alreadyInstalled) {
    console.log(`Pack ${packId} v${manifest.version} already installed`);
    return;
  }

  // 1. Register pack in DB
  await installPack({
    id: manifest.id,
    version: manifest.version,
    title: manifest.title,
    description: manifest.description,
    langPair: manifest.langPair,
    totalLessons: manifest.totalLessons,
    totalChunks: manifest.totalChunks,
    totalAudio: manifest.totalAudio,
    totalBytes: 0,
    manifestJson: JSON.stringify(manifest),
  });

  // 2. Insert graph edges
  if (manifest.edges && manifest.edges.length > 0) {
    await insertEdges(
      manifest.edges.map((e) => ({
        sourceHash: e.from,
        targetHash: e.to,
        edgeType: 'semantic',
        weight: 1.0,
        packId: manifest.id,
      }))
    );
  }

  // 3. Insert lesson nodes into lesson_queue
  const userId = 1; // Local user
  if (manifest.nodes) {
    for (let i = 0; i < manifest.nodes.length; i++) {
      const node = manifest.nodes[i];
      const localPath = new File(packDir, `lessons/lesson_${String(i + 1).padStart(3, '0')}.json`).uri;
      await execute(
        `INSERT OR IGNORE INTO lesson_queue (user_id, status, seq, local_path, pack_id, concept, theme, icon, label)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          i === 0 ? LessonStatus.Available : LessonStatus.Locked,
          i,
          localPath,
          manifest.id,
          node.concept,
          node.theme,
          node.icon,
          node.label,
        ]
      );
    }

    // Unlock first lesson
    if (manifest.nodes.length > 0) {
      await execute(
        `UPDATE lesson_queue SET status = ? WHERE pack_id = ? AND seq = 0`,
        [LessonStatus.Available, manifest.id]
      );
    }
  }

  // 4. Register audio assets (paths point to local FS)
  // In production, the ZIP extraction would place files at these paths
  // For now, we just register the expected paths
  // Audio ingestion happens during ZIP extraction
}

/** Remove a pack and all its data */
export async function uninstallPack(packId: string): Promise<void> {
  // Remove DB records
  await removePack(packId);

  // Remove files
  const packDir = new Directory(PACKS_DIR, packId);
  if (packDir.exists) {
    await packDir.delete();
  }
}

/** Load a lesson's JSON payload from local filesystem */
export async function loadLessonPayload(localPath: string): Promise<object | null> {
  try {
    const file = new File(localPath);
    if (!file.exists) return null;

    const content = await file.text();
    return JSON.parse(content);
  } catch {
    return null;
  }
}
