import { create } from 'zustand';
import { getMapNodes, getCompletedCount } from '../db/repositories/lesson.repo';
import { LessonStatus } from '../types/lesson';
import diagnosticData from '../../assets/diagnostic-quest.json';

export type MapNodeStatus = 'completed' | 'current' | 'locked';

export interface MapNode {
  id: number;
  title: string;
  status: MapNodeStatus;
  icon: string;
}

interface MapState {
  nodes: MapNode[];
  completedCount: number;
  stats: { chunks: number; connections: number; scenes: number };
  loadMap: (userId: number) => Promise<void>;
}

export const useMapStore = create<MapState>((set) => ({
  nodes: [],
  completedCount: 0,
  stats: { chunks: 0, connections: 0, scenes: 0 },

  loadMap: async (userId: number) => {
    try {
      const [dbNodes, completedCount] = await Promise.all([
        getMapNodes(userId),
        getCompletedCount(userId),
      ]);

      if (dbNodes.length > 0) {
        const nodes: MapNode[] = dbNodes.map((n) => {
          let status: MapNodeStatus = 'locked';
          if (n.status === LessonStatus.Consumed) status = 'completed';
          else if (n.status === LessonStatus.Available || n.status === LessonStatus.InProgress) status = 'current';

          return {
            id: n.id,
            title: n.label,
            status,
            icon: n.icon,
          };
        });

        set({
          nodes,
          completedCount,
          // TODO: [DB] Replace with SQLite learning_telemetry aggregation
          stats: {
            chunks: 12 + completedCount * 3,
            connections: 8 + completedCount * 5,
            scenes: 3 + completedCount,
          },
        });
      } else {
        // Fallback: use diagnostic-quest.json mapNodes as initial data
        const fallback: MapNode[] = diagnosticData.mapNodes.map((n, i) => ({
          id: n.id,
          title: n.label,
          status: i === 0 ? 'current' as MapNodeStatus : 'locked' as MapNodeStatus,
          icon: n.icon,
        }));
        set({ nodes: fallback, completedCount: 0, stats: { chunks: 12, connections: 8, scenes: 3 } });
      }
    } catch {
      // DB not ready yet — use fallback
      const fallback: MapNode[] = diagnosticData.mapNodes.map((n, i) => ({
        id: n.id,
        title: n.label,
        status: i === 0 ? 'current' as MapNodeStatus : 'locked' as MapNodeStatus,
        icon: n.icon,
      }));
      set({ nodes: fallback, completedCount: 0, stats: { chunks: 12, connections: 8, scenes: 3 } });
    }
  },
}));
