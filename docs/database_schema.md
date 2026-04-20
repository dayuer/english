# NeuroGlot Database Architecture

为了支撑系统极度硬核的能力模型以及极低延迟的使用体验，本套件的数据层采用了 **MySQL + Neo4j 混合型存储策略**，放弃了传统的外语学习软件中的"分数表"、"关卡进度表"，彻底围绕**"基于微观颗粒度的反应时长与复习阈值"**进行数据建模。

## 1. 混合型存储边界

- **Neo4j / Graph DB**：作为**只读（高读极低写）**的宏观图谱。存储组块之间的本质关联网络（例如 "I'd like" 节点指向 "an iced Americano" 概念节点）。用户的学习路径生成器，可以通过查询图数据库构建最符合语言内化直觉的前后置关系大纲。
- **RAZ 词汇约束引擎（内存层）**：系统启动时将 29 个 RAZ 级别的词表加载至内存，构建 `Allowed Vocabulary Set` 哈希表。LLM 生成后的每一条句子都必须经过该引擎的逐词校验。该引擎不持久化，纯粹为计算层服务。
- **MySQL / RDBMS**：承担**高频变动的核心态**，包括所有个体针对图谱中特定组块的掌握深度、RAZ 级别跃迁状态、能力积分变化以及 AOT 课程生成管线。

---

## 2. 核心架构表说明

所有的表定义及初始化都在 `schema/init.sql`（当前版本 2.0.0）。此处仅论述架构哲学。

### 2.1 用户身份：`users`
包含基本认证字段（`phone`/`email`/`password_hash`）、语言对配置（`native_lang`/`target_lang`）和兴趣标签。`competence_score` 采用 Elo 积分制（初始 1200），可横向对比用户间的整体外语"战斗力"。

- **`raz_current_level`** (ENUM AA-Z2, DEFAULT 'AA')：用户当前所处的 RAZ 分级。由 Diagnostic Quest 初始定位，之后通过晋级 Boss 战逐级跃迁。该字段决定了 LLM 生成微课时的词汇墙上界。
- **`raz_level_mastery_pct`** (FLOAT, DEFAULT 0.0)：当前级别词汇的掌握百分比（0.0-1.0）。达到 0.8 时触发晋级 Boss 战。

### 2.2 神经引擎：`user_chunks`
它是整个产品唯一衡量学习成果的真理表。

- **`chunk_hash`** + **`chunk_text`**：Hash 用于高效检索与去重，原文冗余存储于 `chunk_text` 字段，保障前端可以在不依赖 Neo4j 的情况下独立渲染"已掌握组块"列表。
- **`mastery_level` (0-5)**：反映从初次见面的生涩到母语级别的条件反射。
- **`avg_reaction_ms`**：核心评价指标。1500ms 以上证明大脑经过了 L1 到 L2 的翻译，300ms 以内证明大脑构建了直觉神经反射。该值越小，代表组块内化程度越高。
- **`best_reaction_ms`**：历史最佳反应时间。用于展示用户的“工作记录”，增强成就感。
- **`reflex_tier`**：MySQL 生成列（Generated Column），根据 `avg_reaction_ms` 自动计算。分五档：`untrained`（未训练）、`slow`（>2000ms）、`moderate`（>800ms）、`fast`（>400ms）、`reflex`（≤400ms，条件反射达成）。前端可直接读取此字段渲染 Chunk 卡片颜色编码。
- **`attempt_count`** / **`error_count`**：永久累积的聚合值，不受遥测表 30 天归档影响，使得正确率 `(attempt_count - error_count) / attempt_count` 始终可计算。
- **`next_review_at`**：由专用的 Spaced Repetition (SR) 算法，根据历史错误次数和上一次交互成绩预测出的遗忘抗性临界点。

### 2.3 体验引擎：`lesson_queue`
通过预热（Ahead-Of-Time）取代生成（Just-In-Time），为前端提供零延迟体验。

- **`raz_level`** (ENUM AA-Z2)：该课程所属的 RAZ 级别。LLM 生成时的词汇墙以此为上界。
- **`target_words`** (JSON)：本课的目标词汇数组（5-8 个），从该 RAZ 级别的未掌握词汇中抽取。
- **`status` 状态机**：用户体验前端始终只消费处于 `ready` 状态的数据记录。
- **`seq` 排序字段**：确保前端按 DAG 拓扑顺序消费课程，而非简单地依赖 `created_at`。
- **`payload_url`**：课程的完整 JSON 不直接存入 MySQL（避免大 JSON 膨胀），而是上传至 S3/R2 对象存储后仅存 URL 指针。这与 TTS 音频资产的存储策略保持一致。
- **触发器约束**：应用层需保证当针对某个用户的 `ready` 记录跌破阈值（通常设定为 2 节课），就立即把触发信号推入 Redis Stream，激活 LLM 的后台生成策略流。

### 2.4 晋级引擎：`raz_promotions`
记录用户的 RAZ 级别跃迁历史，兼任审计日志和 Boss 战成绩追踪。

- **`from_level` / `to_level`**：跃迁前后的 RAZ 级别。
- **`sprint_score`** (FLOAT)：Boss 战得分（正确率 × 速度系数）。
- **`passed`** (BOOLEAN)：是否通过。未通过记录同样保留，用于分析用户的瓶颈级别。
- **`vocab_mastery_snapshot`** (JSON)：晋级时刻的词汇掌握率快照，不可变。

### 2.5 资产引擎：`tts_assets_cache` (TTS Deduplication)
这是 NeuroGlot 的核心反脆弱设计之一。

- **雪花效应终结**：只要是 `l2_text` 和相同的 `emotion_tag` 配置下生成的音频，全库进行强制共享。
- **Hash 计算标准（强制一致性）**：

  ```
  asset_hash = SHA256( LOWER(TRIM(l2_text)) + '\x00' + LOWER(emotion_tag) )
  ```

  使用 **NULL byte (`\x00`)** 作为拼接分隔符，防止文本与标签之间的边界碰撞。所有生产者（Worker）和消费者（前端预热查询）**必须**遵循此拼接规则。

- **二级缓存穿透路径**：

  ```
  查询 Redis（热缓存，TTL 30天）
    → MISS → 查询 MySQL tts_assets_cache（永久冷缓存）
      → HIT  → 回写 Redis，返回 audio_url
      → MISS → 调用火山引擎 TTS API 生成音频
               → 上传至 S3/R2
               → 写入 MySQL tts_assets_cache
               → 写入 Redis
               → 返回 audio_url
  ```

### 2.6 数据养分：`learning_telemetry`
记录每一道题甚至每一次芯片点击的数据。

- **`reaction_duration_ms`** 与 **`is_correct`**：为定期修正 `user_chunks` 的遗忘算法提供原始燃料。
- **`lesson_id` 外键**：通过 `ON DELETE SET NULL` 关联至 `lesson_queue`，确保课程删除后遥测记录不被级联清除，仅丢失关联关系。
- **归档策略 (30-Day Rolling Archive)**：业务上实施严格的 30 天滚动归档方案——定时 Cron 脚本将 30 天以外的记录转存至 S3 冷数据湖后从 MySQL 删除。但**关键聚合值** (`user_chunks.attempt_count` / `error_count`) 在遥测写入时已同步递增至 `user_chunks` 表，因此归档不会导致任何统计精度损失。

---

## 3. 实时对话引擎域 (Real-Time Conversation Domain)

详见 `docs/realtime_conversation_arch.md` 任务 4。此处仅列出核心表及其架构位置。

### 3.1 场景包注册：`scenario_packs`
每个场景包是一个完整的有限状态机（FSM），对应一个真实物理场景（如“海关入境”“星巴克点餐”）。

- **RAZ 准入约束**：`raz_level_min` 和 `raz_level_max` 确定用户准入门槛和 NPC 词汇墙上界。
- **角色面具 (Persona)**：`player_persona` 字段存储用户面具描述，`npc_name`/`npc_role` 和 `emotion_escalation` JSON 数组定义 NPC 人设和情绪升级链。
- **FSM 定义**：`fsm_definition` JSON 字段存储完整状态机，`initial_state`/`success_state`/`failure_state` 为入口快查字段。
- **商业属性**：`is_free` + `price_sku` 支撑免费层/付费包的转化漏斗。

### 3.2 FSM 状态节点索引：`scenario_states`
从 `fsm_definition` JSON 展开的快速查询索引表。每个状态节点包含 `expected_chunks`（目标 Chunk 数组）、`max_timeouts`（最大超时次数）和 `fail_branch`（超时耗尽后跳转）。

### 3.3 对话会话追踪：`conversation_sessions`
记录用户单次场景交互的完整生命周期。包含会话级聚合指标（`avg_reaction_ms`、`reward_level`）和商业转化埋点（`conversion_trigger_fired`、`conversion_trigger_type`）。

### 3.4 Chunk 反应遥测：`chunk_reactions`
**400ms 指标体系的唯一原始数据源**。记录每一次用户在特定场景、特定情绪压迫下对特定 Chunk 的反应耗时。

- **`reaction_ms`**：从 NPC 话音结束到用户首个有效音节的毫秒数（由 Rust `Instant` 精确计时）。
- **情绪上下文**：`emotion_at_trigger` + `timeout_count_at_trigger` 记录触发时的 NPC 情绪状态，用于分析压迫感与反应速度的相关性。
- **数据流动**：`chunk_reactions` 的 EMA 聚合值回写至 `user_chunks.avg_reaction_ms`，原始遥测 30 天归档，聚合值永久保留。
