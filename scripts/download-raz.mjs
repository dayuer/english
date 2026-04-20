#!/usr/bin/env node
/**
 * 批量下载 qwerty-learner 的 RAZ 分级词库 JSON 到本地 assets/dicts/raz/
 * 使用 Node.js 原生 fetch（v18+），零依赖
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../assets/dicts/raz');

// RAZ 分级体系：AA → Z2（共 29 级）
const RAZ_LEVELS = [
  'AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y',
  'Z', 'Z1', 'Z2',
];

const BASE_URL = 'https://raw.githubusercontent.com/RealKai42/qwerty-learner/master/public/dicts';

async function downloadLevel(level) {
  const url = `${BASE_URL}/raz-${level}.json`;
  const outPath = path.join(OUTPUT_DIR, `raz-${level}.json`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠ raz-${level}: HTTP ${res.status}，跳过`);
      return null;
    }
    const data = await res.json();
    await writeFile(outPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✓ raz-${level}: ${data.length} 词条`);
    return { level, count: data.length };
  } catch (err) {
    console.warn(`✗ raz-${level}: ${err.message}`);
    return null;
  }
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  console.log(`📥 开始下载 RAZ 词库到 ${OUTPUT_DIR}\n`);

  // 并发 5 个下载，避免被限流
  const results = [];
  for (let i = 0; i < RAZ_LEVELS.length; i += 5) {
    const batch = RAZ_LEVELS.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(downloadLevel));
    results.push(...batchResults.filter(Boolean));
  }

  console.log(`\n📊 下载汇总: ${results.length}/${RAZ_LEVELS.length} 个词库成功`);
  const totalWords = results.reduce((sum, r) => sum + r.count, 0);
  console.log(`📊 总词条数: ${totalWords}`);

  // 生成 manifest 摘要
  const manifest = results.map(r => ({
    id: `raz-${r.level}`,
    level: r.level,
    wordCount: r.count,
    file: `raz-${r.level}.json`,
  }));
  const manifestPath = path.join(OUTPUT_DIR, '_manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`📋 Manifest 已写入 ${manifestPath}`);
}

main().catch(console.error);
