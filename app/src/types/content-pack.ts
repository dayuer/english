/** Content pack manifest */
export interface ContentPackManifest {
  id: string;
  version: number;
  title: string;
  description?: string;
  langPair: string;
  minLevel: string;
  maxLevel: string;
  nodes: PackNode[];
  edges: PackEdge[];
  totalLessons: number;
  totalChunks: number;
  totalAudio: number;
  checksumSha256: string;
}

export interface PackNode {
  id: string;
  concept: string;
  theme: string;
  icon: string;
  label: string;
}

export interface PackEdge {
  from: string;
  to: string;
}
