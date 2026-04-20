/**
 * 发音服务 — 有道词典 API + 本地缓存（开发阶段）
 *
 * 设计决策：
 * - 首次播放：从有道下载 mp3 → 写入本地缓存目录 → 从本地文件播放
 * - 后续播放：直接从本地缓存播放，零网络延迟
 * - 缓存目录：${cacheDir}/neuroglot/pronunciation/{type}/{word}.mp3
 * - 单一 AudioPlayer 实例复用，通过 replace() 切换本地音源
 * - 使用 expo-file-system v19+ 新 API（File / Directory / Paths）
 */
import { File, Directory, Paths } from 'expo-file-system';
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

export type PronunciationType = 'us' | 'uk';

const YOUDAO_BASE = 'https://dict.youdao.com/dictvoice';

// ─── 缓存目录结构 ─────────────────────────────────────
// ${cacheDir}/neuroglot/pronunciation/us/hello.mp3
// ${cacheDir}/neuroglot/pronunciation/uk/hello.mp3
const CACHE_L1 = new Directory(Paths.cache, 'neuroglot');
const CACHE_L2 = new Directory(CACHE_L1, 'pronunciation');
const CACHE_US_DIR = new Directory(CACHE_L2, 'us');
const CACHE_UK_DIR = new Directory(CACHE_L2, 'uk');

// 内存中记录已确认存在的缓存路径，避免重复 stat 磁盘
const _cacheHits = new Set<string>();

let _audioSessionReady = false;
let _player: AudioPlayer | null = null;
let _dirsReady = false;

// ─── 音频会话 ─────────────────────────────────────────

async function ensureAudioSession(): Promise<void> {
  if (_audioSessionReady) return;
  try {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    });
    _audioSessionReady = true;
  } catch (err) {
    console.warn('[发音服务] 音频会话初始化失败:', err);
  }
}

// ─── 缓存系统 ─────────────────────────────────────────

/** 确保缓存目录存在（逐层创建） */
function ensureCacheDirs(): void {
  if (_dirsReady) return;
  if (!CACHE_L1.exists) CACHE_L1.create();
  if (!CACHE_L2.exists) CACHE_L2.create();
  if (!CACHE_US_DIR.exists) CACHE_US_DIR.create();
  if (!CACHE_UK_DIR.exists) CACHE_UK_DIR.create();
  _dirsReady = true;
}

/** 获取对应类型的缓存目录 */
function getCacheDir(type: PronunciationType): Directory {
  return type === 'us' ? CACHE_US_DIR : CACHE_UK_DIR;
}

/** 获取单词的安全文件名 */
function getSafeFileName(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.mp3';
}

/** 获取有道发音远程 URL */
export function getPronunciationUrl(
  word: string,
  type: PronunciationType = 'us',
): string {
  const typeCode = type === 'us' ? '1' : '2';
  return `${YOUDAO_BASE}?audio=${encodeURIComponent(word)}&type=${typeCode}`;
}

/**
 * 获取音频的本地文件 URI
 * 如果已缓存则直接返回，否则下载后缓存
 */
async function getLocalAudioUri(
  word: string,
  type: PronunciationType,
): Promise<string | null> {
  ensureCacheDirs();

  const dir = getCacheDir(type);
  const fileName = getSafeFileName(word);
  const cachedFile = new File(dir, fileName);

  // 内存命中 → 直接返回
  if (_cacheHits.has(cachedFile.uri)) {
    return cachedFile.uri;
  }

  // 磁盘存在 → 加入内存 → 返回
  if (cachedFile.exists && cachedFile.size > 0) {
    _cacheHits.add(cachedFile.uri);
    return cachedFile.uri;
  }

  // 下载到缓存
  try {
    const remoteUrl = getPronunciationUrl(word, type);
    const downloaded = await File.downloadFileAsync(remoteUrl, dir);
    // downloadFileAsync 使用服务器文件名，需要重命名为我们的标准文件名
    if (downloaded.exists) {
      downloaded.move(cachedFile);
      _cacheHits.add(cachedFile.uri);
      return cachedFile.uri;
    }
    return null;
  } catch (err) {
    console.warn(`[发音服务] 下载失败: ${word}`, err);
    // 清理可能的残留文件
    try { if (cachedFile.exists) cachedFile.delete(); } catch { /* 静默 */ }
    return null;
  }
}

// ─── 播放器 ───────────────────────────────────────────

/** 播放单词发音 */
export async function playPronunciation(
  word: string,
  type: PronunciationType = 'us',
): Promise<void> {
  try {
    await ensureAudioSession();

    // 获取本地缓存文件
    const localUri = await getLocalAudioUri(word, type);
    if (!localUri) {
      console.warn(`[发音服务] 无法获取音频: ${word}`);
      return;
    }

    // 首次创建播放器，后续复用
    if (!_player) {
      _player = createAudioPlayer({ uri: localUri });
    } else {
      _player.pause();
      _player.replace({ uri: localUri });
    }

    _player.play();
  } catch (err) {
    console.warn(`[发音服务] 播放失败: ${word}`, err);
  }
}

/** 停止当前发音 */
export function stopPronunciation(): void {
  if (_player) {
    try { _player.pause(); } catch { /* 静默 */ }
  }
}

/** 预缓存一批词汇的发音（后台静默下载） */
export async function precacheWords(
  words: string[],
  type: PronunciationType = 'us',
): Promise<void> {
  for (const word of words) {
    await getLocalAudioUri(word, type);
  }
}

/** 获取缓存统计信息 */
export function getCacheStats(): { cachedCount: number } {
  return { cachedCount: _cacheHits.size };
}
