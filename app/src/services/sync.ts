/**
 * Sync Service
 * Handles telemetry upload with offline resilience
 */
import { dequeue, removeByIds, incrementAttempts, getPendingCount, purgeStale } from '../db/repositories/sync-queue.repo';
import { markSynced, archiveOldTelemetry } from '../db/repositories/telemetry.repo';

const API_BASE = 'https://api.neuroglot.app'; // Configurable
const BATCH_SIZE = 50;
const MAX_RETRIES = 10;

let isSyncing = false;

/** Get current pending count */
export async function getSyncPendingCount(): Promise<number> {
  return getPendingCount();
}

/** Sync pending telemetry records to server */
export async function syncPending(apiBase?: string): Promise<{
  synced: number;
  failed: number;
}> {
  if (isSyncing) return { synced: 0, failed: 0 };
  isSyncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const items = await dequeue(BATCH_SIZE);
    if (items.length === 0) {
      isSyncing = false;
      return { synced: 0, failed: 0 };
    }

    const payloads = items.map((item) => JSON.parse(item.payload));

    try {
      const base = apiBase || API_BASE;
      const response = await fetch(`${base}/telemetry/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: payloads }),
      });

      if (response.ok) {
        const ids = items.map((item) => item.id);
        await removeByIds(ids);
        await markSynced(ids);
        synced = items.length;

        // Archive old telemetry after successful sync
        await archiveOldTelemetry(30);
      } else {
        // Server error — increment attempts
        const ids = items.map((item) => item.id);
        await incrementAttempts(ids);
        failed = items.length;
      }
    } catch (networkError) {
      // Network error — increment attempts with exponential backoff
      const ids = items.map((item) => item.id);
      await incrementAttempts(ids);
      failed = items.length;
    }

    // Purge stale records that exceeded max retries
    await purgeStale(MAX_RETRIES);
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}

/** Run full sync cycle (for app launch or connectivity restore) */
export async function runFullSync(apiBase?: string): Promise<void> {
  let hasMore = true;
  while (hasMore) {
    const result = await syncPending(apiBase);
    hasMore = result.synced > 0;
    if (result.failed > 0) break; // Stop on failure
  }
}
