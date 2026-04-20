import type { Exercise } from './exercise';
import type { CoursewareStatus } from './courseware';

/** A lesson from the queue (local content) */
export interface Lesson {
  id: number;
  userId: number;
  status: LessonStatus;
  seq: number;
  focusChunkHashes: string[] | null;
  localPath: string | null;
  coursewareId: string | null;
  coursewareStatus: CoursewareStatus;
  concept: string | null;
  theme: string | null;
  icon: string | null;
  label: string | null;
  createdAt: string;
  consumedAt: string | null;
}

export enum LessonStatus {
  Locked = 'locked',
  Available = 'available',
  InProgress = 'in_progress',
  Consumed = 'consumed',
}

/** Full lesson payload loaded from local JSON */
export interface LessonPayload {
  lessonId: string;
  sourceRefs: string[];
  exercises: Exercise[];
}

/** Map node for the skill tree screen */
export interface MapNode {
  id: number;
  seq: number;
  icon: string;
  label: string;
  concept: string;
  status: LessonStatus;
}
