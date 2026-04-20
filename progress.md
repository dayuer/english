# 执行进度纪要 (Execution Progress)

## [2026-04-18] 课件多文件下载与跟读逻辑重构

**高阶摘要**:
将原先对网络极度依赖的 AOT 流式推流架构重构成 "AI后台预制 -> 阿里云 TTS -> 单课独立下载 -> 完全纯离线学习 + 归一化 ASR 评核" 架构。放弃本地打 ZIP 避免原生模块解压依赖，采用 Manifest 清单并发下载。针对 shadowing 场景引入2次失败静默过关的容错机制。

**执行记录**:
- 确定架构模型：纯离线按清单下载模型，确立采用阿里云TTS/ASR生态。
- 修订了 `docs/architecture.md`, `docs/course_generator_arch.md`, `AGENTS.md`。
- 修改并迁移了 `app/src/db/schema.ts`（引入了 `courseware_cache` 与字段调整）。
- 构建了 `app/src/types/courseware.ts` 及完善练习题目属性（加入 `audioLocalPath` 和 `expectedText`）。
- 构建了基于池化并发下载引擎 `app/src/services/courseware.ts`。
- 构建了包含防死锁（失败两次静默护航）逻辑和简单归一化对比算法的录音评测代理 `app/src/services/shadowing.ts`。
- 扩充了 Zustand State (`lesson.store.ts`) 支持了 shadowing 的生命周期。
- 插入了 `ShadowingExercise` UI组块，并在 `LessonScreen` 响应状态拦截。

**当前阻碍**:
架构梳理就绪。服务端实现移交。此任务闭环。

## [2026-04-19] qwerty-learner 架构分析与 RAZ 词库集成

**高阶摘要**:
深度分析 qwerty-learner (21.8k Star) 项目源码，提取对 NeuroGlot 有价值的设计模式和数据资产。最终决策：仅复用 RAZ 分级词库数据（29 级、12,526 词条），配合有道发音 API 建立完整的词汇基础层。

**执行记录**:
- 分析了 qwerty-learner 的状态管理（Jotai atomWithStorage）、打字引擎、IndexedDB 五层记录模型。
- 提取设计模式：声明式词库注册 + 惰性加载、LetterMistakes 字母级错误建模、默写遮蔽策略。
- 批量下载 29 个 RAZ 分级词库 JSON 至 `assets/dicts/raz/`，自动生成 `_manifest.json`。
- 创建 `scripts/download-raz.mjs`：零依赖 Node.js 批量下载脚本（并发 5 路限流）。
- 创建 `app/src/types/vocabulary.ts`：桥接 qwerty-learner Word 格式与 NeuroGlot VocabularyEntry，含 RAZ 分级枚举和 i+1 数值映射。
- 创建 `app/src/services/vocabulary.ts`：词库惰性加载、i+1 窗口查询（±N 级）、Fisher-Yates 随机抽样、全局单词精确查找。
- 创建 `app/src/services/pronunciation.ts`：有道词典发音 API 封装（开发阶段），统一接口设计便于切换阿里云 TTS。
- 同步更新 `AGENTS.md` 架构文档。

**关键决策**:
- ⚠ 不复用 qwerty-learner 的"惩罚式清空重输"交互——与 NeuroGlot 零惩罚设计哲学冲突。
- ✓ 仅使用 RAZ 词库（用户指令），不导入 CET/IELTS/GRE 等其他词库。
- ✓ 先用有道发音 API，后续切换阿里云 TTS（用户确认）。

**当前状态**: 词汇基础层就绪，可供 Curriculum Topology Agent 和诊断系统消费。
## 2026-04-20
- 初始化 git 仓库，添加 origin 配置并使用 init message 推送至 https://github.com/dayuer/english.git (master/main)
