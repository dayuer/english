/** A language chunk with mastery tracking */
export interface Chunk {
  id: number;
  userId: number;
  chunkHash: string;
  chunkText: string;
  masteryLevel: MasteryLevel;
  avgReactionMs: number;
  attemptCount: number;
  errorCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  createdAt: string;
}

export enum MasteryLevel {
  New = 0,
  Recognized = 1,
  Recalled = 2,
  Fluent = 3,
  Automatic = 4,
  Native = 5,
}
