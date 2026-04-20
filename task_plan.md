# 课件分发模式重构与跟读引擎装配计划

## [x] Phase 1: 文档与架构心智对齐
- [x] 1.1 更新 `docs/architecture.md`：改 AOT 为离线下载架构，明确阿里云生态（TTS/ASR）。
- [x] 1.2 更新 `docs/course_generator_arch.md`：调整为单课多文件清单模型（弃用 ZIP）。
- [x] 1.3 更新 `AGENTS.md`：修改前端 Sandbox Agent 及下载职责声明。

## [x] Phase 2: 类型与数据库层改造
- [x] 2.1 修改 `app/src/db/schema.ts`：添加 `courseware_cache`，并加状态到 `lesson_queue`。
- [x] 2.2 新建/修改 `app/src/types/courseware.ts` 与 `exercise.ts`：支持 Manifest 清单类型、多文件寻址、以及 `expectedText`。

## [x] Phase 3: 服务与逻辑层建设
- [x] 3.1 创建 `app/src/services/courseware.ts`：实现基于 Manifest 的并发离线下载引擎。
- [x] 3.2 创建 `app/src/services/shadowing.ts`：封存 `ShadowingEvaluator`，实现连续2次失败直接判定 `skip` 的保护逻辑（含相似度判定）。

## [x] Phase 4: UI 与状态整合
- [x] 4.1 修改 `app/src/stores/lesson.store.ts`：融入 shadowing 独立状态支持。
- [x] 4.2 添加 `ShadowingExercise` 的UI占位与逻辑连接。
- [x] 4.3 `app/src/app/lesson/[id].tsx`：切换到读取离线文件模式，并响应下载保护。

## [x] Phase 5: 测试与回滚点验证
- [x] 5.1 本地编译与数据结构迁移确认。
- [x] 5.2 验证状态正常后标记任务完成。
