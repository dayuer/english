/**
 * 内容加载器 — 根据课程 ID 从本地 JSON 课程包加载练习内容
 * 
 * 设计决策：
 * - 内容包以静态 JSON 文件存储在 assets/courses/ 目录
 * - 通过 mapNode.id（数据库主键）映射到课程包的 lesson key
 * - 未来可扩展为从远程下载课程包并缓存到本地
 */
import coffeePack from '../../assets/courses/coffee-pack.json';

interface ExerciseData {
  type: string;
  instruction: string;
  prompt: string;
  l1: string;
  targetChunk: string;
  answer: string[];
  interferenceOptions: string[];
}

interface LessonData {
  lessonId: string;
  title: string;
  concept: string;
  exercises: ExerciseData[];
}

interface CoursePack {
  packId: string;
  title: string;
  lessons: Record<string, LessonData>;
}

const pack = coffeePack as CoursePack;

/**
 * 根据 lesson_queue 表的主键 ID 加载课程内容
 * ID 直接映射到课程包的 lessons key（1-based）
 */
export function loadLessonById(lessonId: number): LessonData | null {
  const key = String(lessonId);
  return pack.lessons[key] ?? null;
}

/**
 * 获取课程包元信息
 */
export function getPackInfo() {
  return {
    packId: pack.packId,
    title: pack.title,
    totalLessons: Object.keys(pack.lessons).length,
  };
}
