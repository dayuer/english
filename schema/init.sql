-- NeuroGlot Initial MySQL Database Schema
-- Version: 2.0.0
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
    best_reaction_ms INT DEFAULT 0 COMMENT 'Historical best reaction time for this chunk',
    attempt_count INT DEFAULT 0 COMMENT 'Total interaction count, never pruned',
    error_count INT DEFAULT 0 COMMENT 'Total error count, never pruned',
    last_scenario_id VARCHAR(64) NULL COMMENT 'Last scenario where this chunk was triggered',
    reflex_tier ENUM('untrained','slow','moderate','fast','reflex') GENERATED ALWAYS AS (
        CASE
            WHEN avg_reaction_ms = 0 THEN 'untrained'
            WHEN avg_reaction_ms > 2000 THEN 'slow'
            WHEN avg_reaction_ms > 800 THEN 'moderate'
            WHEN avg_reaction_ms > 400 THEN 'fast'
            ELSE 'reflex'
        END
    ) STORED COMMENT 'Auto-calculated reflex tier. reflex=<=400ms=conditioned response',
    last_reviewed_at TIMESTAMP NULL,
    next_review_at TIMESTAMP NULL COMMENT 'Predicted by spaced repetition algorithm',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_chunk (user_id, chunk_hash),
    INDEX idx_review_schedule (user_id, next_review_at),
    INDEX idx_reflex_tier (user_id, reflex_tier),
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

-- ==========================================
-- 5. 实时对话引擎域 (Real-Time Conversation Domain)
-- ==========================================

-- 5.1 场景包定义表 (Scenario Pack Registry)
CREATE TABLE IF NOT EXISTS scenario_packs (
    id VARCHAR(64) PRIMARY KEY COMMENT 'e.g. customs_entry_v2',
    title VARCHAR(200) NOT NULL COMMENT '场景标题',
    description TEXT NULL,
    raz_level_min ENUM('AA','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Z1','Z2') NOT NULL COMMENT '最低准入 RAZ 等级',
    raz_level_max ENUM('AA','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Z1','Z2') NOT NULL COMMENT '词汇墙上界',
    npc_name VARCHAR(100) NOT NULL COMMENT 'NPC 名称',
    npc_role VARCHAR(100) NOT NULL COMMENT 'NPC 角色',
    emotion_baseline VARCHAR(32) DEFAULT 'professional' COMMENT '基础情绪标签',
    emotion_escalation JSON NOT NULL COMMENT '情绪升级链 JSON 数组',
    player_persona TEXT NOT NULL COMMENT '用户面具描述',
    glm_voice_id VARCHAR(64) NULL COMMENT 'GLM-4-Voice 音色 ID',
    fsm_definition JSON NOT NULL COMMENT '完整状态机 JSON（states + transitions）',
    initial_state VARCHAR(64) NOT NULL,
    success_state VARCHAR(64) NOT NULL,
    failure_state VARCHAR(64) NOT NULL,
    is_free BOOLEAN DEFAULT FALSE COMMENT '免费场景包',
    price_sku VARCHAR(64) NULL COMMENT 'App Store / 微信支付 SKU',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_raz_range (raz_level_min, raz_level_max),
    INDEX idx_free (is_free)
) COMMENT='场景包注册表。每个场景包 = 一个完整的 FSM + 角色面具。';

-- 5.2 场景状态节点索引表
CREATE TABLE IF NOT EXISTS scenario_states (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    scenario_id VARCHAR(64) NOT NULL,
    state_id VARCHAR(64) NOT NULL COMMENT '状态节点 ID: S2_purpose',
    description VARCHAR(500) NOT NULL,
    npc_prompt TEXT NOT NULL COMMENT 'NPC 进入此状态时的台词模板',
    expected_chunks JSON NOT NULL COMMENT '目标 Chunk 数组',
    max_timeouts TINYINT DEFAULT 3 COMMENT '最大超时次数',
    fail_branch VARCHAR(64) NULL COMMENT '超时耗尽后跳转状态',
    hints JSON NULL COMMENT '提示短语',
    sort_order INT DEFAULT 0,
    UNIQUE KEY uk_scenario_state (scenario_id, state_id),
    INDEX idx_scenario (scenario_id),
    FOREIGN KEY (scenario_id) REFERENCES scenario_packs(id) ON DELETE CASCADE
) COMMENT='FSM 状态节点索引表。从 fsm_definition 展开。';

-- 5.3 对话会话追踪表
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    scenario_id VARCHAR(64) NOT NULL,
    current_state_id VARCHAR(64) NOT NULL COMMENT '当前 FSM 节点',
    status ENUM('active', 'completed', 'failed', 'abandoned') DEFAULT 'active',
    total_turns INT DEFAULT 0,
    total_timeouts INT DEFAULT 0,
    avg_reaction_ms INT DEFAULT 0 COMMENT '会话平均反应时间',
    reward_level CHAR(1) NULL COMMENT 'S/A/B/C/F 通关评级',
    conversion_trigger_fired BOOLEAN DEFAULT FALSE COMMENT '是否触发转化弹窗',
    conversion_trigger_type ENUM('frustration', 'achievement', 'none') DEFAULT 'none',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    INDEX idx_user_status (user_id, status),
    INDEX idx_user_scenario (user_id, scenario_id),
    INDEX idx_conversion (conversion_trigger_fired, conversion_trigger_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (scenario_id) REFERENCES scenario_packs(id) ON DELETE CASCADE
) COMMENT='对话会话生命周期追踪。';

-- 5.4 Chunk 反应延迟遥测表 — 400ms 指标的唯一数据源
CREATE TABLE IF NOT EXISTS chunk_reactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_id BIGINT NOT NULL,
    scenario_id VARCHAR(64) NOT NULL,
    state_id VARCHAR(64) NOT NULL COMMENT '触发此反应的 FSM 状态节点',
    chunk_hash VARCHAR(64) NOT NULL COMMENT 'SHA256 of normalized chunk text',
    chunk_text VARCHAR(500) NOT NULL COMMENT '冗余存储避免 JOIN',
    reaction_ms INT NOT NULL COMMENT '核心指标: NPC话音结束→用户首个有效音节',
    is_timeout BOOLEAN NOT NULL DEFAULT FALSE,
    intent_matched BOOLEAN NOT NULL DEFAULT FALSE,
    confidence FLOAT DEFAULT 0.0 COMMENT 'GLM-4-Voice 意图识别置信度',
    emotion_at_trigger VARCHAR(32) NOT NULL COMMENT '触发时 NPC 情绪标签',
    timeout_count_at_trigger TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_chunk (user_id, chunk_hash),
    INDEX idx_user_reaction (user_id, reaction_ms),
    INDEX idx_session (session_id),
    INDEX idx_timeout_analysis (user_id, is_timeout, chunk_hash),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES conversation_sessions(id) ON DELETE CASCADE
) COMMENT='Chunk 反应延迟原始遥测。400ms 指标的唯一数据源。30 天滚动归档。';
