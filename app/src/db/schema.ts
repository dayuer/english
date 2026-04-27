/**
 * NeuroGlot SQLite Schema
 * Adapted from schema/init.sql (MySQL) for local-first architecture
 * Version: 2.0.0 (SQLite) — RAZ 分级体系对齐
 */

export const SCHEMA_STATEMENTS = [
  // 1. 用户表（简化：单本地用户）
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name TEXT,
    native_lang TEXT DEFAULT 'zh-CN',
    target_lang TEXT DEFAULT 'en',
    competence_score REAL DEFAULT 1200.0,
    raz_current_level TEXT DEFAULT 'AA',
    raz_level_mastery_pct REAL DEFAULT 0.0,
    interest_tags TEXT DEFAULT '[]',
    diagnostic_completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  // 2. 组块掌握表（核心真理表，保留原设计）
  `CREATE TABLE IF NOT EXISTS user_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    chunk_hash TEXT NOT NULL,
    chunk_text TEXT NOT NULL,
    mastery_level INTEGER DEFAULT 0,
    avg_reaction_ms INTEGER DEFAULT 0,
    best_reaction_ms INTEGER DEFAULT 0,
    attempt_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_reviewed_at TEXT,
    next_review_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, chunk_hash),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS idx_review_schedule ON user_chunks(user_id, next_review_at)`,

  // 3. 课程队列（本地内容追踪）
  `CREATE TABLE IF NOT EXISTS lesson_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    raz_level TEXT DEFAULT 'AA',
    target_words TEXT,
    status TEXT DEFAULT 'locked',
    courseware_status TEXT DEFAULT 'not_downloaded',
    seq INTEGER DEFAULT 0,
    focus_chunk_hashes TEXT,
    local_path TEXT,
    courseware_id TEXT,
    concept TEXT,
    theme TEXT,
    icon TEXT,
    label TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    consumed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS idx_lesson_user_status ON lesson_queue(user_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_lesson_user_seq ON lesson_queue(user_id, seq)`,
  // idx_lesson_user_level created in migration (raz_level column may not exist on v1 tables)

  // 4. TTS 音频去重缓存（本地文件路径）
  `CREATE TABLE IF NOT EXISTS tts_assets_cache (
    asset_hash TEXT PRIMARY KEY,
    l2_text TEXT NOT NULL,
    emotion_tag TEXT NOT NULL,
    local_path TEXT NOT NULL,
    hit_count INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE INDEX IF NOT EXISTS idx_tts_emotion ON tts_assets_cache(emotion_tag)`,

  // 5. 学习遥测（带同步标记）
  `CREATE TABLE IF NOT EXISTS learning_telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER,
    chunk_hash TEXT NOT NULL,
    reaction_duration_ms INTEGER NOT NULL,
    is_correct INTEGER NOT NULL,
    synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lesson_queue(id) ON DELETE SET NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_telemetry_user_time ON learning_telemetry(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_synced ON learning_telemetry(synced)`,

  // 6. 组块图（邻接表替代 Neo4j）
  // FK removed: user_chunks(chunk_hash) is only unique in composite (user_id, chunk_hash),
  // not standalone. Referential integrity enforced at application layer.
  `CREATE TABLE IF NOT EXISTS chunk_graph (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_hash TEXT NOT NULL,
    target_hash TEXT NOT NULL,
    edge_type TEXT NOT NULL,
    weight REAL DEFAULT 1.0,
    pack_id TEXT
  )`,

  `CREATE INDEX IF NOT EXISTS idx_graph_source ON chunk_graph(source_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_graph_target ON chunk_graph(target_hash)`,

  // 7. 课件缓存（追踪单课件本地环境存储） - 取代重量级的内容包
  `CREATE TABLE IF NOT EXISTS courseware_cache (
    courseware_id TEXT PRIMARY KEY,
    version INTEGER NOT NULL,
    status TEXT DEFAULT 'not_downloaded',
    local_dir TEXT,
    size_bytes INTEGER DEFAULT 0,
    checksum TEXT,
    downloaded_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  // 9. RAZ 晋级引擎（审计日志 + Boss 战成绩追踪）
  `CREATE TABLE IF NOT EXISTS raz_promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    from_level TEXT NOT NULL,
    to_level TEXT NOT NULL,
    sprint_score REAL NOT NULL,
    passed INTEGER NOT NULL DEFAULT 0,
    vocab_mastery_snapshot TEXT NOT NULL DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS idx_raz_promotions_user ON raz_promotions(user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    attempts INTEGER DEFAULT 0,
    last_attempt_at TEXT
  )`,
];
