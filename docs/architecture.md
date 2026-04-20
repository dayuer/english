# System Architecture Design: NeuroGlot (神经语言习得引擎)

> "语言不是你学会的技能，而是你升级后的大脑本身。"

本文档基于 Herbert Simon 的组块化理论 (Chunking Theory) 和 Stephen Krashen 的二语习得理论 (Second Language Acquisition)，设计了一套突破传统"词汇-语法"范式、直击神经可塑性的外语习得系统——**NeuroGlot**。

## 0. 架构哲学 (Architectural Philosophy)

传统的语言学习类 App (如 Duolingo, 单词背诵软件) 存在系统性的认知错位：它们将语言视为**需要死记硬背的离散数据**，触发的是海马体的短期记忆机制。
**NeuroGlot** 的架构核心是**神经重塑引擎 (Neuro-plasticity Engine)**：将语言恢复为"多感官的、情境化的模式识别系统"。

- **极简优先**：没有孤立的单词库，没有脱离语境的语法树。只有"场景"与"组块"。所有交互（包括选择拼装）都在完整情境中发生。
- **底层重构**：用图数据库 (GraphDB) 替代关系型词库，存储语言单元之间的连接，抹掉语言学习中的"碎片化激活"。
- **情绪即数据**：将 Krashen 的"情感过滤器降维"作为系统第一优先级，UI 和用户流转必须绝对"安全、低压"。<br/>

---

## 1. 核心系统模块 (Core Modules)

整个系统由四个核心子系统构成，对齐理论中"输入-组块-输出-情绪"的认知链路。

### 1.1 可理解输入计算矩阵 (i+1 Content Matrix)
**解决问题**：摆脱无效输入，动态匹配处于"最近发展区" (90%已知 + 10%未知) 的多模态材料。
- **动态难度标记仪 (Dynamic Difficulty Assessor)**：
  - 弃用传统的 CEFR 分级词库表。改为实时分析用户的**组块图谱 (Chunk Graph)**。
  - 通过 LLM + NLP 技术，实时抓取 Project Gutenberg (公版文献)、维基百科与 Creative Commons 新闻流，彻底规避音视频版权风险，计算内容中包含的预估"已知组块"与"未知组块"比例。强制推送符合 `i+1` 阈值的材料。
- **全感官锚定流 (Multisensory Anchoring Stream)**：
  - 拒绝干瘪的机器合成音。纯文本的知识流必须先经过 LLM 的情感标记器 (Emotion Tagger) 分配情感标签（如 `[Sarcastic]`, `[Hostile]`, `[Warm]`），随后导入阿里云情感 TTS 生成极度仿生且带有呼吸声的原声重现，配合背景颜色的细微渐变达到神经锚定。

### 1.2 神经组块提取与知识图谱 (Neural Chunking & Graph Network)
**解决问题**：停止背诵离散单词，建立"音素-词汇-短语-句式-语用"的层级组块。
- **智能切片器 (Chunk Parser)**：
  - 用户在阅读或听音过程中标记某段表达，系统立即通过 LLM 进行**功能性切割**，而非词性切割。
  - 自动归类为三层模块库：
    1. *固定搭配模块*：不可拆解的肌肉记忆。
    2. *半固定框架模块*：提供插槽参数的句型 (`I'm looking forward to [Variable]`)。
    3. *语用功能模块*：承载社交属性的非字面意表达段落。
- **上下文封存库 (Context Vault)**：
  - 当一个组块入库时，不再展示“词典释义”。它将强绑定一段 `[强烈情感驱动的高拟真音频] + [原公版书或新闻事件的具体场景事实]`。用丰富的情境信息激活由于缺少真实视频而可能沉睡的镜像神经元。

### 1.3 三阶输出与反馈网格 (3-Tier Output Sandbox)
**解决问题**：打破"强迫即时输出导致焦虑"的死局，用"延迟输出"与"替换创造"完成神经固化。
- **静默期熔断 (Delay Output Mechanism)**：
  - 组块入库的 24 小时内，系统在前端强制锁死"口语考核"按钮，仅允许复听，让潜意识进行数据预处理。
- **替换与重构测试层 (Substitution & Reconstruction Interface)**：
  - **Level 1 镜像复述**：回放一段情感 TTS 合成的高拟真音频，用户通过麦克风 1:1 模仿。语音引擎仅分析频率、节奏与情感起伏（声学特征），切断对"语法对错"的批判。
  - **Level 2 变量插槽**：系统给出一个生活变量（例如："Coffee" 切换为 "Meeting"），要求用户用已掌握的[半固定框架模块]重组开口发音。
  - **Level 3 自由对抗**：AI NPC (Voice AI) 进入情境扮演，要求用户在完成某个谈判任务时，必须激活并讲出本周刚刚拾取的 3 个[语用功能模块]。
  
### 1.4 低激活性情绪管理总线 (Affective Filter Regulator)
**解决问题**：焦虑释放皮质醇，阻断海马体运转。系统必须在 UI 和交互上成为一个"安全空间"。
- **生物节律介入 (Bio-rhythm Interventions)**：
  - 在开始口语（Level 3）前，系统 UI 进入暗色呼吸态，强制进行 20 秒的 4-7-8 呼吸引导。
- **无惩罚验证体系 (Zero-Punishment UI)**：
  - 全局抹杀红色警示、"❌"图标与"失败"文案。
  - 若产出错误，只展示："这个场景下，伦敦人更习惯这样的声导通路线 -> [播放母语者示范]"。
- **目标重构看板 (Progress Visualizer)**：
  - 废弃"已背单词 2000"这种焦虑型指标。
  - 看板指标设计为：`组块收集数 (Chunks Acquired)`、`网络密度 (Network Density: 组块间的关联数)`、`情境解锁率 (Contexts Unlocked)`。

---

## 2. 数据流与技术栈 (Data Flow & Tech Stack)

为了支撑极简但厚重的神经溯源计算，采用以下确定栈：

- **Frontend**: React Native (Expo) — 跨端移动优先，重度依赖音频流处理与麦克风交互。Expo 的 OTA 热更新能力可覆盖课程 Schema 的快速迭代，无需重新发版。
- **Core AI Middleware**:
  - `LLM Engine`: **DeepSeek R1** — 作为课程格式化封装器与组块切割引擎。通过 RAG 从语料向量库召回真实母语切片后，DeepSeek R1 负责降级改写与 JSON Schema 组装。其深度推理能力适合处理复杂的语用功能模块拆解。
  - `Speech Engine`: **阿里云 (Aliyun) TTS / 一句话识别 (ASR)** — 用于后台预生成组块音频资产。同时在客户端承担 Level 1 镜像复述 (Shadowing) 的单次录音识别，建立失败2次静默过关的容错对比。
- **Database Architecture**:
  - `MySQL`: 存储结构化的用户信息、学习进度、组块元属性、课程缓存索引。
  - `Neo4j / Milvus`: 图数据库存储组块间的联结关系（组块图谱）。向量库存储公版文献与新闻的 Embedding 切片，供 RAG 语义召回。
- **Message Queue**: Redis Stream — 驱动 AOT 后台 Worker 的课程预生成管线。
- **Object Storage**: S3 / Cloudflare R2 — 持久化 TTS 音频资产。

## 3. 架构结语 (Architect's Verdict)

这个系统的底层逻辑是**反脆弱的**。传统的机器教育试图将人脑变成硬盘，而 NeuroGlot 是将数字系统变成**人类神经突触的外部外骨骼**。通过 i+1 控制信息熵，通过组块化降低认知负荷，通过无罚输出绕过杏仁核的高压防御。

这是一个不再让人"学"外语的系统，这是一个让人"长出"新外语神经网络的操作系统。
