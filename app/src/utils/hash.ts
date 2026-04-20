/**
 * 简易哈希工具
 *
 * 用于 Chunk 文本的去重标识。
 * 生产环境应替换为 SHA256，当前使用 DJB2 算法保证纯 JS 零依赖。
 */

/** DJB2 哈希算法 — 将文本归一化后生成 16 位十六进制字符串 */
export function createHash(text: string): string {
  const normalized = text.toLowerCase().trim();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    // hash * 33 + charCode，经典 DJB2
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
