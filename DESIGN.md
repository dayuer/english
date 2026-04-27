# NeuroGlot Design System — Nordic Minimal

> 本文件是 NeuroGlot 项目的设计系统唯一真理来源（Single Source of Truth）。
> 所有 UI 组件、屏幕布局和视觉决策必须以此为准。
> 对应代码实现位于 `app/src/theme/` 目录。

---

## 1. 设计哲学

**Nordic Minimalism** — 临床级的克制与精确。

- 拒绝装饰性元素（无渐变背景、无阴影堆叠、无游戏化徽章）
- 信息密度优先于"呼吸感"
- 使用色调阶梯（Tonal Layering）代替分割线
- 功能色仅在反馈瞬间出现，日常界面保持中性
- 交互反馈通过触觉（Haptic）优先于视觉动画

---

## 2. 色彩体系（Light Mode）

### 2.1 背景层

| Token | Hex | 用途 |
|-------|-----|------|
| `bgDeep` | `#f7f8f9` | 主背景 |
| `bgCard` | `#ffffff` | 卡片背景 |
| `bgSurface` | `#F9F9F9` | 兼容旧字段 |

### 2.2 表面层级（Material Design 3 Surface Tonal System）

| Token | Hex | 用途 |
|-------|-----|------|
| `surfaceContainerLowest` | `#ffffff` | 最浅容器（输入框） |
| `surfaceContainerLow` | `#f3f3f4` | 低层容器 |
| `surfaceContainer` | `#F2F4F5` | 标准容器（Chip 底色） |
| `surfaceContainerHigh` | `#EBEEF0` | 高层容器（锁定节点） |
| `surfaceContainerHighest` | `#DEE1E3` | 最高层容器 |

### 2.3 文字色

| Token | Hex | 用途 |
|-------|-----|------|
| `textPrimary` | `#1a1c1c` | 标题、主要文字 |
| `textSecondary` | `#3f4850` | 正文、次要文字 |
| `textMuted` | `#999999` | 辅助文字、标签 |

### 2.4 主色系（Nordic Deep Teal）

| Token | Hex | 用途 |
|-------|-----|------|
| `primary` | `#00628f` | 主按钮、活跃态、进度条 |
| `primaryContainer` | `#E1F1FA` | 浅蓝容器背景 |
| `primaryDim` | `#007cb3` | 渐变终点、按压态 |
| `onPrimary` | `#FFFFFF` | 主色上的前景色 |
| `accentBlue` | `#1A8ECA` | Badge/Icon 高亮 |

### 2.5 功能色

| Token | Hex | 用途 |
|-------|-----|------|
| `accentEmerald` | `#2ECC71` | 正确反馈 |
| `accentRose` | `#E74C3C` | 错误反馈 |
| `accentAmber` | `#F39C12` | 警告 / Good 状态 |
| `accentSky` | `#5BC0EB` | 信息提示 |
| `accentIndigo` | `#6366F1` | 音频波形 |

### 2.6 边界与分割

| Token | Hex | 用途 |
|-------|-----|------|
| `borderSubtle` | `rgba(0,0,0,0.06)` | 微妙分割线 |
| `outline` | `#737c7f` | 标准轮廓 |
| `outlineVariant` | `#bfc7d1` | 次要轮廓 |

### 2.7 反馈背景

| Token | Hex | 用途 |
|-------|-----|------|
| `correctBg` | `rgba(46,204,113,0.10)` | 正确答案底色 |
| `wrongBg` | `rgba(0,0,0,0.04)` | 错误答案底色 |

### 2.8 发音分析状态色

| Token | Hex | 用途 |
|-------|-----|------|
| `statusPerfect` | `#00628f` | 完美发音 |
| `statusGood` | `#ffb964` | 良好发音 |
| `statusPractice` | `#ba1a1a` | 需要练习 |

---

## 3. 排版体系

**字体**: Inter（全局统一）

### 3.1 尺寸阶梯

| Token | Size (px) | 用途 |
|-------|-----------|------|
| `xs` | 11 | 标签、状态文字、信息标签 |
| `sm` | 13 | 副标题、辅助说明 |
| `base` | 15 | 正文、卡片内容 |
| `md` | 16 | 指令文字、选项文字 |
| `lg` | 18 | 统计数值、小标题 |
| `xl` | 22 | 页面标题 |
| `2xl` | 28 | 大标题、欢迎语 |
| `3xl` | 32 | 结果/判定大字 |
| `display` | 48 | 超大分数展示 |

### 3.2 字重

| Token | Weight | 用途 |
|-------|--------|------|
| `regular` | 400 | — |
| `medium` | 500 | 正文 |
| `semibold` | 600 | 标签、副标题 |
| `bold` | 700 | 统计数值、小标题 |
| `extrabold` | 800 | 大标题 |

### 3.3 行高

| Token | Value (px) |
|-------|------------|
| `tight` | 18 |
| `normal` | 22 |
| `relaxed` | 26 |
| `spacious` | 28 |
| `loose` | 32 |

---

## 4. 间距体系

基于 4px 基线网格。

| Token | Value (px) |
|-------|------------|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 |
| `xl` | 20 |
| `2xl` | 24 |
| `3xl` | 32 |
| `4xl` | 40 |

---

## 5. 圆角体系

| Token | Value (px) | 用途 |
|-------|------------|------|
| `sm` | 6 | 小元素 |
| `md` | 12 | 标准卡片、按钮 |
| `lg` | 16 | 大卡片、Drop Zone |
| `xl` | 20 | 圆润卡片 |
| `2xl` | 24 | 特大圆角 |
| `full` | 9999 | 药丸形（Badge、Chip） |

---

## 6. 阴影体系

仅使用单一阴影 Token，保持 Nordic 克制风格：

```
card: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 2,
}
```

**规则**：
- 普通卡片使用 `card` 阴影
- 活跃节点追加 `shadowOpacity: 0.35` + `shadowRadius: 16` + 主色 shadowColor
- 禁止多层阴影堆叠

---

## 7. 核心组件规范

### 7.1 Card
- 背景：`bgCard` (#ffffff)
- 圆角：`md` (12px)
- 阴影：`card` shadow
- 内边距：`xl` (20px) 标准

### 7.2 Button (Primary)
- 背景：`primary` (#00628f)
- 文字色：`onPrimary` (#fff)
- 圆角：`lg` (16px)
- 字号：`md` (16px)，字重 600
- 全宽，内边距 `lg` (16px) 垂直

### 7.3 Chip
- Fragment 变体：`surfaceContainer` 底色，`md` 圆角
- Selected 变体：`primaryContainer` 底色
- 字号：`sm` (13px)，字重 600

### 7.4 ProgressBar
- 轨道：`surfaceContainerHigh` (#EBEEF0)
- 填充：`primary` (#00628f)
- 高度：6px
- 圆角：full

### 7.5 Icon
- 基于 Feather Icons 子集的自定义 SVG 图标系统
- 默认尺寸：24px
- 颜色继承父组件

### 7.6 StatCard
- Card 容器 + 居中对齐
- 数值：`lg` (18px) `bold` `primary` 色
- 标签：`xs` (11px) `semibold` `textMuted` 色 + uppercase + letterSpacing: 1

---

## 8. 屏幕清单

| # | 路由 | 功能 | 核心组件 |
|---|------|------|----------|
| 1 | `/welcome` | 欢迎 | LogoOrb, Button |
| 2 | `/(tabs)/home` | 主仪表盘 | Card, ProgressBar, Icon, SectionTitle |
| 3 | `/(tabs)/map` | 学习路径 | 节点圆 + 连接线 |
| 4 | `/(tabs)/analysis` | 发音分析 | SVG Ring, Card, Icon |
| 5 | `/(tabs)/discover` | 占位 | LogoOrb |
| 6 | `/(tabs)/profile` | 个人主页 | Card, Icon, StatCard |
| 7 | `/diagnostic` | 诊断测试 | ProgressBar, AudioWave, Chip |
| 8 | `/diagnostic-result` | 诊断结果 | SVG Ring, StatCard, Button |
| 9 | `/lesson/[id]` | 课程练习 | Chip, ProgressBar, Button |
| 10 | `/lesson/complete` | 课程完成 | Icon, StatCard, Button |
| 11 | `/interstitial` | 呼吸引导 | NeuralCanvas, Animated |
| 12 | `/settings` | 设置 | Card, Section, Row |
| 13 | `/raz-demo` | RAZ 词库浏览 | Card, ScrollView |
| 14 | `/raz-boss` | Boss 战 | ProgressBar, Card, Chip, AudioWave |

---

## 9. 设计规则

### Do
- ✅ 使用色调阶梯区分层级（`bgDeep` → `surfaceContainer` → `bgCard`）
- ✅ 用 uppercase + letter-spacing 标记标签类文字
- ✅ 保持全局 20px 水平内边距
- ✅ 统计数值使用 `primary` 色 + `bold` 字重
- ✅ 触觉反馈优先于视觉动画

### Don't
- ❌ 禁止使用纯黑 `#000000` 作为文字色
- ❌ 禁止多层阴影堆叠
- ❌ 禁止游戏化元素（星星、宝箱、经验条等）
- ❌ 禁止页面间过渡动画超过 300ms
- ❌ 禁止在日常界面使用功能色（仅限反馈瞬间）
