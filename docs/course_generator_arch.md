# RAZ-Driven Curriculum Architecture (29-Tiered Leveled System)

> "词汇量决定了一个人能理解和表达的边界。控制住词汇的边界，就控制住了学习的节奏。"

传统系统（如多邻国）的技能树是由人工教研团队预编的线性闯关路径。NeuroGlot 的核心差异在于：**技能树的骨架锚定于 RAZ（Reading A-Z）29 级分级体系，而每个骨架节点内的微课内容由 LLM 在严格的词汇级别约束下动态生成**。

## 1. 宏观架构: 29 阶截断式 DAG (29-Tiered Truncated DAG)

### 1.1 RAZ 级别作为拓扑骨架

系统的技能树不再是随机自由的 DAG 网络，而是一个严格分层的 29 阶阶梯：

```
AA → A → B → C → D → E → F → G → H → I → J → K → L →
M → N → O → P → Q → R → S → T → U → V → W → X → Y → Z → Z1 → Z2
```

每阶内部包含多个微课节点（Lesson Nodes），构成该级别的局部 DAG。用户必须通过一个级别的**晋级 Boss 战（Diagnostic Sprint）**才能解锁下一级别。

### 1.2 级别内微课 DAG 生成流程

当用户进入某个 RAZ 级别（例如 Level C）时：

1. **词汇池装载**：从本地 `dicts/raz/raz-C.json` 加载该级别全部词汇。
2. **掌握度过滤**：读取 `user_chunks` 表，筛选出该级别中 `mastery_level < 3` 的未掌握词汇。
3. **LLM 大纲生成**：将未掌握词汇分批（每批 5-8 个）发送给 LLM，生成微课大纲节点：
   ```json
   {
     "nodes": [
       {"id": "C_01", "target_words": ["leaves", "branch", "grow"], "theme": "植物生长"},
       {"id": "C_02", "target_words": ["rain", "cloud", "wet"], "theme": "天气变化"},
       {"id": "C_03", "target_words": ["leaves", "rain", "branch", "cloud"], "theme": "综合复习"}
     ],
     "edges": [{"from": "C_01", "to": "C_03"}, {"from": "C_02", "to": "C_03"}]
   }
   ```
4. **前端渲染**：客户端地图引擎将其渲染为"过关小圆点"网格。

### 1.3 晋级 Boss 战 (Diagnostic Sprint)

当用户在 Level C 的词汇掌握率 ≥ 80%，系统触发 Diagnostic Sprint：
- 从 Level C 词汇池中抽取 15 个词，涵盖已掌握和边缘词汇。
- 题型为快速碎片组装 + 听音辨义，限时 120 秒。
- 通过（正确率 ≥ 85%）→ 解锁 Level D。
- 未通过 → 生成针对性复习微课，48 小时后可重试。

---

## 2. 核心架构: RAZ 约束的课件生成管线 (RAZ-Constrained Courseware Pipeline)

### 2.1 词汇级别约束引擎 (Vocabulary Level Constraint Engine)

这是整个系统的**核心创新**。当 Lesson Synthesis Agent 为 Level C 的用户生成微课时：

1. **构建词汇墙 (Vocabulary Wall)**：聚合 Level AA → Level C 的全部词汇，形成"允许词集（Allowed Vocabulary Set）"。
2. **LLM Prompt 注入词汇约束**：

   ```
   ## 词汇约束规则 (MANDATORY)
   你正在为 RAZ Level C 的学习者生成英语学习材料。
   
   ### 绝对红线
   - 你构建的所有英语句子中，每个词都必须出自以下允许词集。
   - 允许词集 = RAZ Level AA + A + B + C 的全部词汇（共约 1,200 词）。
   - 允许使用基础功能词（a, the, is, are, was, were, I, you, he, she, it, we, they 等）。
   - 严禁出现任何超纲词汇。如果场景需要一个超纲词，用允许词集内的同义词替换。
   
   ### 目标词汇
   本课目标词汇：["leaves", "branch", "grow"]
   请围绕这些词构建 3-5 个自然场景短句和 1 篇包含这些单词的新闻短文（50-80 词）。
   ```

3. **后置校验 (Post-Generation Validation)**：
   - LLM 输出后，服务端对生成文本进行词频校验。
   - 逐词检查是否在 Allowed Vocabulary Set 内。
   - 超纲词占比 > 5% → 拒绝该生成，重新请求（最多 2 次）。
   - 超纲词占比 ≤ 5% → 将超纲词用 `[*]` 标注，前端以特殊样式高亮提示"新词预览"。

### 2.2 新闻短文生成器 (Leveled News Article Generator)

为辅助听力和阅读训练，系统通过 LLM 生成符合 RAZ 词汇约束的新闻短文：

```json
{
  "type": "leveled_reading",
  "raz_level": "C",
  "article": {
    "title": "The Big Tree in the Park",
    "body": "There is a big tree in the park. It has many green leaves. The leaves grow on the branch. When the wind blows, the leaves move. Some leaves fall down. Children like to play with the leaves.",
    "word_count": 42,
    "target_words_used": ["leaves", "branch", "grow"],
    "comprehension_questions": [
      {
        "question": "Where is the big tree?",
        "options": ["In the park", "In the house", "At school"],
        "correct": 0
      }
    ]
  },
  "audio_url": null
}
```

**生成策略**：
- Level AA-E：简单叙事短文（30-60 词），主语 + 动词 + 宾语基本句型。
- Level F-L：新闻播报风格（60-120 词），引入时间状语和因果关系。
- Level M-R：议论短文（100-200 词），出现观点对比和复合句。
- Level S-Z2：仿真学术摘要（150-300 词），允许被动语态和从句嵌套。

### 2.3 Lesson JSON Schema（升级版）

每节微课由 10-15 道互动题目 + 1 篇分级阅读短文组成：

```json
{
  "lesson_id": "C_01_gen_8x99a",
  "raz_level": "C",
  "target_words": ["leaves", "branch", "grow"],
  "vocab_wall_levels": ["AA", "A", "B", "C"],
  "exercises": [
    {
      "type": "listen_and_tap",
      "target_chunk": "The leaves grow",
      "l2_text": "The leaves grow on the branch.",
      "l1_translation": "叶子长在树枝上。",
      "audio_url": null,
      "emotion_tag": "neutral",
      "interference_options": ["leaves", "branch", "grow", "the", "on", "jump", "run"]
    },
    {
      "type": "translate_l1_to_l2",
      "target_chunk": "many leaves",
      "l1_text": "树上有很多叶子。",
      "l2_text": "The tree has many leaves.",
      "audio_url": null,
      "emotion_tag": "descriptive",
      "interference_options": ["tree", "has", "many", "leaves", "The", "big", "small"]
    },
    {
      "type": "shadowing_speak",
      "target_chunk": "branch",
      "l2_text": "Look at this long branch.",
      "audio_url": null,
      "emotion_tag": "excited",
      "expected_phonemes": ["lʊk", "æt", "ðɪs", "lɔŋ", "bræntʃ"]
    }
  ],
  "reading": {
    "title": "The Big Tree in the Park",
    "body": "There is a big tree in the park...",
    "audio_url": null,
    "comprehension_questions": [...]
  }
}
```

---

## 3. TTS 预合成与 CDN 缓存分发 (Audio Cache & CDN)

后台生成线已负责端到端的资产装配。基于不打 ZIP 的设计，音频资产分发如下：

1. **Hash Key 标准**: Worker 在调用阿里云 TTS 前，按 `SHA256(LOWER(TRIM(l2_text)) + '\x00' + LOWER(emotion_tag))` 计算出文件名。
2. **CDN 平面结构路径**:
   单课内容在 CDN 上呈现彻底的横向平面结构：
   - `{raz_level}/{lessonId}/manifest.json`
   - `{raz_level}/{lessonId}/lesson.json`
   - `{raz_level}/{lessonId}/{audio_hash}.mp3`
3. **客户端运行时路径注入**: 客户端读取 Manifest 发起并行的文件下载策略，将其落盘到移动系统的 document 目录下。所有题目中 JSON 占位用的相对 URL，将在读取内存时被注入为本地的 `file://` 绝对路径，彻底剥离断网崩溃可能。

---

## 4. 客户端表现层 (The Dumb Player)

多端应用被设计为一个**无状态播放器 (Stateless Player)**：
- 前端只认 Schema 中的 `type`。
- **离线冷库引擎 (Local Chunk Vault)**：App 内置了 SQLite 数据库，默默存储了用户在过去三个月内掌握的所有核心组块。如果网络在过场阶段抖动，App 利用这个 Local Vault 生成轻量级的**离线文字消消乐 (Text Matching Game)** 供用户热身。
- **生命周期机制**：当用户在一道题选错时，前端将此题压入本地 `Queue` 的最尾部，直到这 10 道题被穷尽且没有错误才展示"Lesson Complete"动画。
- **反馈上报与过场拦截 (Interstitial Transition)**：课程结束后，前端触发 3-5 秒的**功能性过场动画**。在此期间，前端将本节课错题权重异步上报后台。

### 4.1 认知增强型过场机制 (Cognitive Interstitial)

为掩盖 LLM 流式输出与 TTS 合成的延迟：

1. **神经突触连结回放 (Synaptic Consolidation Vis)**：呈现刚刚掌握的词汇如何与已学词汇在情境网格中连线。
2. **情绪总线干预 (Affective Filter Reset)**：错题较多时，引导 4-7-8 呼吸降解皮质醇。
3. **RAZ 级别进度卡**：显示当前级别掌握百分比和距离 Boss 战的距离。

---

## 5. 初始架构: 语言动态定位课 (Diagnostic Quest)

### 5.1 RAZ 级别定位

新用户不再从 AA 开始。系统通过一组跨级别采样词汇（每级 3 个词，共 87 个词）进行快速二分法定位：

1. 从 Level J（中间级别）开始，抛出 5 个词汇的听音辨义题。
2. 全对 → 跳至 Level Q；全错 → 跳至 Level D。
3. 最多 15 题，通过自适应步进锁定用户的 RAZ 起始级别。

### 5.2 交互形式

1. **意图判断 (Intention Mapping)**：
   - *播放音频*："I was wondering if you could possibly..."
   - *UI*：两个情境短语 `A. 委婉请求` vs `B. 愤怒指责`
   - *原理*：测试语用功能模块的瞬时反射。
2. **高速碎片组装 (Rapid Assembly)**：
   - *抛出情境*："你想要冰美式免糖"。
   - *UI 散落碎片*：`I'd like / without / syrup / an iced Americano / please`。

---

## 6. 架构哲学自检

**优势区**：
- **词汇边界绝对可控**：通过 RAZ 29 级词表 + 后置校验，杜绝了 LLM 生造超纲内容的风险。学生看到的每一个词都在 i+1 窗口之内。
- **无穷内容供给**：不依赖固定语料库，LLM 可以围绕同一组目标词汇生成无数种场景句和新闻短文。同一个 Level C 的用户每次打开看到的课程都不同。
- **认知增强型过场**：将架构的技术硬伤（生成耗时）变废为宝，转化为符合 Krashen 情绪过滤理论的降压时间。

**妥协与劣势（最不优雅之处）**：
- **句子自然度**：在低级别（AA-C），可用词汇极少（约 200-400 词），LLM 构建的长句可能出现机械感。需要通过 Prompt 中注入"像儿童读物作者一样写作"来缓解。
- **后置校验成本**：每次生成后的词频校验增加了约 50ms 延迟和一次重试概率（约 15%）。但由于是后台异步生成，不影响用户体验。
