-- NeuroGlot Initial MySQL Database Schema
-- Version: 1.2.0
-- Dialect: MySQL 8.0+

CREATE DATABASE IF NOT EXISTS neuroglot_engine DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE neuroglot_engine;

-- ==========================================
-- 1. 神经可塑性与能力评估域 (Memory & Mastery Domain)
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NULL UNIQUE,
    email VARCHAR(255) NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    display_name VARCHAR(100) NULL,
    native_lang CHAR(5) DEFAULT 'zh-CN',
    target_lang CHAR(5) DEFAULT 'en',
    competence_score FLOAT DEFAULT 1200.0 COMMENT 'Elo-like global rating',
    raz_current_level ENUM('AA','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Z1','Z2') DEFAULT 'AA' COMMENT 'Current RAZ reading level, set by Diagnostic Quest',
    raz_level_mastery_pct FLOAT DEFAULT 0.0 COMMENT 'Vocab mastery % for current level (0.0-1.0). Boss fight at 0.8',
    interest_tags JSON NULL COMMENT 'e.g. ["coffee", "tech", "travel"]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_chunks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chunk_hash VARCHAR(64) NOT NULL COMMENT 'SHA256 of normalized chunk text',
    chunk_text VARCHAR(500) NOT NULL COMMENT 'Denormalized original text for display without graph DB lookup',
    mastery_level TINYINT DEFAULT 0 COMMENT '0=New, 1=Recognized, 2=Recalled, 3=Fluent, 4=Automatic, 5=Native',
    avg_reaction_ms INT DEFAULT 0 COMMENT 'Lower = deeper internalization. <300ms = intuitive',
    attempt_count INT DEFAULT 0 COMMENT 'Total interaction count, never pruned',
    error_count INT DEFAULT 0 COMMENT 'Total error count, never pruned',
    last_reviewed_at TIMESTAMP NULL,
    next_review_at TIMESTAMP NULL COMMENT 'Predicted by spaced repetition algorithm',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_chunk (user_id, chunk_hash),
    INDEX idx_review_schedule (user_id, next_review_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================
-- 2. AOT 课程生成管线域 (AOT Pipeline Domain)
-- ==========================================

CREATE TABLE IF NOT EXISTS lesson_queue (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    raz_level ENUM('AA','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Z1','Z2') NOT NULL COMMENT 'RAZ level this lesson belongs to. Vocabulary wall upper bound.',
    target_words JSON NULL COMMENT 'Array of 5-8 target words from this RAZ level',
    status ENUM('pending_generation', 'generating', 'ready', 'consumed') DEFAULT 'pending_generation',
    seq INT DEFAULT 0 COMMENT 'Consumption order within same user. Respects DAG topology.',
    focus_chunk_hashes JSON NULL COMMENT 'Array of chunk hashes targeted in this lesson',
    payload_url VARCHAR(255) NULL COMMENT 'S3/R2 URL to the full rendered lesson JSON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consumed_at TIMESTAMP NULL,
    INDEX idx_user_status (user_id, status),
    INDEX idx_user_seq (user_id, seq),
    INDEX idx_user_level (user_id, raz_level),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================
-- 2.5 RAZ 晋级引擎 (Level Promotion Engine)
-- ==========================================

CREATE TABLE IF NOT EXISTS raz_promotions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    from_level ENUM('AA','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Z1','Z2') NOT NULL,
    to_level ENUM('AA','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Z1','Z2') NOT NULL,
    sprint_score FLOAT NOT NULL COMMENT 'Boss fight score = accuracy × speed_factor',
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    vocab_mastery_snapshot JSON NOT NULL COMMENT 'Immutable snapshot of vocab mastery at promotion time',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_promotions (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT='RAZ level promotion audit log. Failed attempts preserved for bottleneck analysis.';

-- ==========================================
-- 3. TTS 资产去重缓存域 (Global Deduplication Cache)
--
-- Hash 计算标准 (MUST be consistent across all services):
--   asset_hash = SHA256( LOWER(TRIM(l2_text)) + '\x00' + LOWER(emotion_tag) )
--   使用 NULL byte (\x00) 作为拼接分隔符，防止边界碰撞。
-- ==========================================

CREATE TABLE IF NOT EXISTS tts_assets_cache (
    asset_hash VARCHAR(64) PRIMARY KEY COMMENT 'SHA256(LOWER(TRIM(l2_text)) + 0x00 + LOWER(emotion_tag))',
    l2_text TEXT NOT NULL,
    emotion_tag VARCHAR(32) NOT NULL,
    audio_url VARCHAR(255) NOT NULL COMMENT 'Persistent URL on S3/R2/Volcengine OSS',
    hit_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_emotion (emotion_tag),
    INDEX idx_hit_count (hit_count DESC)
);

-- ==========================================
-- 4. 高频交互遥测域 (Telemetry Domain)
--
-- 归档策略: 应用层通过 Cron 脚本实施严格的 30 天滚动归档。
-- 30 天以外的记录转存至对象存储 (S3) 冷数据湖后删除，
-- 但 user_chunks.attempt_count/error_count 作为永久聚合值不受影响。
-- ==========================================

CREATE TABLE IF NOT EXISTS learning_telemetry (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    lesson_id BIGINT NULL,
    chunk_hash VARCHAR(64) NOT NULL,
    reaction_duration_ms INT NOT NULL COMMENT 'Time taken to assemble/recognize',
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_time (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lesson_queue(id) ON DELETE SET NULL
) COMMENT='High frequency log. 30-day rolling archive enforced by application cron.';
