/** Exercise types matching docs/course_generator_arch.md Section 2.2 JSON Schema */
export interface Exercise {
  type: ExerciseType;
  targetChunk: string;
  l2Text: string;
  l1Text?: string;
  /** 课件包内音频相对路径（打包时写入），不直接填充为网络URL */
  audioFile?: string | null;
  /** 运行时解析后的本地绝对路径（内存态注入，隔离网络要求） */
  audioLocalPath?: string | null;
  emotionTag: string;
  interferenceOptions: string[];
  /** For assembly-type exercises: correct fragment order */
  answer?: string[];
  /** For intention-type exercises: options */
  options?: ExerciseOption[];
  /** Instruction text */
  instruction?: string;
  /** Prompt text */
  prompt?: string;
  /** shadowing_speak 专用：期望识别的文本（用于和 ASR 结果正交对比归一化文本） */
  expectedText?: string;
  /** 分级阅读短文（设计文档 §2.2 reading 字段） */
  reading?: ExerciseReading;
}

export type ExerciseType = 'listen_and_tap' | 'translate_l1_to_l2' | 'intention' | 'assembly' | 'shadowing_speak';

export interface ExerciseOption {
  text: string;
  correct: boolean;
}

/** 课程内嵌的分级阅读短文（设计文档 §2.2 Lesson JSON Schema reading 字段） */
export interface ExerciseReading {
  title: string;
  body: string;
  audioFile?: string | null;
  comprehensionQuestions: ExerciseReadingQuestion[];
}

export interface ExerciseReadingQuestion {
  question: string;
  options: string[];
  correct: number;
}
