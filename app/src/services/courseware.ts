/**
 * 课件多文件离线下载系统 (Offline Courseware Service)
 * 不依赖 ZIP 解包，而是读取 Manifest 后进行多路并发请求，安全写入本地。
 */
import { Paths, Directory, File } from 'expo-file-system';
import { execute, queryFirst } from '../db/client';
import type { CoursewareManifest } from '../types/courseware';
import { CoursewareStatus } from '../types/courseware';

// CDN 根路径，此处通常为环境变量。未来由业务方配置。
const CDN_BASE_URL = 'https://cdn.neuroglot.app/courseware';
const COURSEWARE_DIR = new Directory(Paths.document, 'courseware');

async function ensureDir(dir: Directory): Promise<void> {
  if (!dir.exists) {
    await dir.create();
  }
}

/** 
 * 根据单课的 ID 从服务端（或 CDN）获取课件 Manifest 清单 
 */
export async function fetchCoursewareManifest(lessonId: string): Promise<CoursewareManifest> {
  const url = `${CDN_BASE_URL}/${lessonId}/manifest.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch manifest for ${lessonId}: ${response.status}`);
  }
  return response.json();
}

/**
 * 核心下载引擎：根据清单多路并发下载课件的所有文件至本地。
 * 如果发生错误，抛出异常并允许上层标记为 failed。
 */
export async function downloadCourseware(
  lessonId: string, 
  onProgress?: (totalItems: number, downloadedItems: number) => void
): Promise<void> {
  await ensureDir(COURSEWARE_DIR);

  // 1. 获取清单
  const manifest = await fetchCoursewareManifest(lessonId);
  
  // 维护数据库状态：置为 Downloading
  await execute(
    `INSERT OR REPLACE INTO courseware_cache (courseware_id, version, status, total_bytes)
     VALUES (?, ?, ?, ?)`,
    [manifest.lessonId, manifest.version, CoursewareStatus.Downloading, manifest.sizeBytes]
  );
  
  await execute(
    `UPDATE lesson_queue SET courseware_status = ? WHERE courseware_id = ?`,
    [CoursewareStatus.Downloading, manifest.lessonId]
  );

  const targetDir = new Directory(COURSEWARE_DIR, manifest.lessonId);
  await ensureDir(targetDir);

  const audioDir = new Directory(targetDir, 'audio');
  await ensureDir(audioDir);

  let downloadedCount = 0;

  // 2. 并发文件下载
  // 此处采用固定并发池限流，比如最多并发 5 个请求
  const CONCURRENCY_LIMIT = 5;
  const queue = [...manifest.files];

  const downloadTask = async () => {
    while (queue.length > 0) {
      const fileInfo = queue.shift();
      if (!fileInfo) continue;

      const fileUrl = `${CDN_BASE_URL}/${lessonId}/${fileInfo.path}`;
      // 处理带有子目录的 path，例如 'audio/word.mp3' 或 'lesson.json'
      const isAudio = fileInfo.path.startsWith('audio/');
      let localPath = '';
      if (isAudio) {
        const fileName = fileInfo.path.replace('audio/', '');
        localPath = new File(audioDir, fileName).uri;
      } else {
        localPath = new File(targetDir, fileInfo.path).uri;
      }

      // 为了简单起见，这里复用 expo-file-system 进行常规 fetch 下载
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`Download missing file: ${fileInfo.path}`);
      
      const buffer = await response.arrayBuffer();
      const destFile = new File(localPath);
      await destFile.write(new Uint8Array(buffer));

      downloadedCount++;
      onProgress?.(manifest.files.length, downloadedCount);
    }
  };

  const tasks = Array.from({ length: CONCURRENCY_LIMIT }, () => downloadTask());
  
  try {
    await Promise.all(tasks);

    // 3. 落盘成功，变更为 Ready 状态
    await execute(
      `UPDATE courseware_cache SET status = ?, downloaded_at = datetime('now'), local_dir = ? WHERE courseware_id = ?`,
      [CoursewareStatus.Ready, targetDir.uri, manifest.lessonId]
    );

    await execute(
      `UPDATE lesson_queue SET courseware_status = ? WHERE courseware_id = ?`,
      [CoursewareStatus.Ready, manifest.lessonId]
    );
  } catch (error) {
    // 失败重置
    await execute(`UPDATE courseware_cache SET status = ? WHERE courseware_id = ?`, [CoursewareStatus.Failed, manifest.lessonId]);
    await execute(`UPDATE lesson_queue SET courseware_status = ? WHERE courseware_id = ?`, [CoursewareStatus.Failed, manifest.lessonId]);
    throw error;
  }
}

/**
 * 注入本地 file:// URI 绝对路径
 * 读取已就绪的 lesson JSON 时，替换音频路径隔离网络。
 */
export async function loadCoursewareLesson(coursewareId: string): Promise<any | null> {
  const targetDir = new Directory(COURSEWARE_DIR, coursewareId);
  const lessonFile = new File(targetDir, 'lesson.json');
  
  if (!lessonFile.exists) return null;

  try {
    const contentText = await lessonFile.text();
    const payload = JSON.parse(contentText);
    
    if (payload.exercises && Array.isArray(payload.exercises)) {
       payload.exercises.forEach((ex: any) => {
         if (ex.audioFile) {
           ex.audioLocalPath = new File(targetDir, ex.audioFile).uri;
         }
       });
    }
    return payload;
  } catch (err) {
    console.error('Failed to parse lesson payload', err);
    return null;
  }
}
