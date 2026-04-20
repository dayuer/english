/** 单课件清单 (用于多文件分体下载) */
export interface CoursewareManifest {
  lessonId: string;
  version: number;
  concept: string;
  theme: string;
  totalExercises: number;
  totalAudio: number;
  sizeBytes: number;
  checksumSha256: string;
  files: CoursewareFile[];
}

/** 课件内部文件的声明 */
export interface CoursewareFile {
  path: string; // 例如: "lesson.json" 或 "audio/xyz.mp3"
  size: number;
  hash: string;
}

/** 课件在本地缓存中的下载状态 */
export enum CoursewareStatus {
  /** 未下载 */
  NotDownloaded = 'not_downloaded',
  /** 正在下载 */
  Downloading = 'downloading',
  /** 已下载，可用 */
  Ready = 'ready',
  /** 下载失败 */
  Failed = 'failed',
}

/** 镜像跟读评估结果 */
export interface ShadowingResult {
  /** 是否识别成功（网络故障或无语音会为 false） */
  recognized: boolean;
  /** ASR 返回的文本 */
  recognizedText?: string;
  /** 与期望文本的匹配度相似度计算值 (0-1) */
  similarity?: number;
  /** 评价：好 / 差 / 跳过 (skip) */
  verdict?: 'good' | 'poor' | 'skip';
  /** 错误信息（识别失败时） */
  error?: string;
}
