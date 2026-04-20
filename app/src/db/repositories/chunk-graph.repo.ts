import { query, execute } from '../client';

export interface GraphEdge {
  id: number;
  sourceHash: string;
  targetHash: string;
  edgeType: string;
  weight: number;
  packId: string | null;
}

export async function getEdgesForChunk(chunkHash: string): Promise<GraphEdge[]> {
  return query<GraphEdge>(
    `SELECT * FROM chunk_graph WHERE source_hash = ? OR target_hash = ?`,
    [chunkHash, chunkHash]
  );
}

export async function insertEdge(
  sourceHash: string,
  targetHash: string,
  edgeType: string,
  weight: number = 1.0,
  packId: string | null = null,
): Promise<void> {
  await execute(
    `INSERT OR IGNORE INTO chunk_graph (source_hash, target_hash, edge_type, weight, pack_id)
     VALUES (?, ?, ?, ?, ?)`,
    [sourceHash, targetHash, edgeType, weight, packId]
  );
}

export async function insertEdges(edges: Array<{
  sourceHash: string;
  targetHash: string;
  edgeType: string;
  weight?: number;
  packId?: string | null;
}>): Promise<void> {
  for (const edge of edges) {
    await insertEdge(edge.sourceHash, edge.targetHash, edge.edgeType, edge.weight ?? 1.0, edge.packId ?? null);
  }
}

export async function getGraphStats(): Promise<{
  totalEdges: number;
  edgeTypes: Record<string, number>;
}> {
  const rows = await query<{ edge_type: string; count: number }>(
    'SELECT edge_type, COUNT(*) as count FROM chunk_graph GROUP BY edge_type'
  );
  const edgeTypes: Record<string, number> = {};
  let totalEdges = 0;
  for (const row of rows) {
    edgeTypes[row.edge_type] = row.count;
    totalEdges += row.count;
  }
  return { totalEdges, edgeTypes };
}

export async function getConnectedChunks(chunkHash: string, maxDepth: number = 2): Promise<string[]> {
  const visited = new Set<string>();
  const queue = [chunkHash];
  const result: string[] = [];

  for (let depth = 0; depth < maxDepth && queue.length > 0; depth++) {
    const nextQueue: string[] = [];
    for (const hash of queue) {
      if (visited.has(hash)) continue;
      visited.add(hash);
      result.push(hash);

      const edges = await getEdgesForChunk(hash);
      for (const edge of edges) {
        const neighbor = edge.sourceHash === hash ? edge.targetHash : edge.sourceHash;
        if (!visited.has(neighbor)) {
          nextQueue.push(neighbor);
        }
      }
    }
    queue.length = 0;
    queue.push(...nextQueue);
  }

  return result;
}
