export const colors = {
  // 背景
  bgDeep: '#f7f8f9',           // 主背景
  bgCard: '#ffffff',           // 卡片 

  // 文字 (Material Design 3 on-surface)
  textPrimary: '#1a1c1c',      // 标题
  textSecondary: '#3f4850',    // 正文 (on-surface-variant)
  textMuted: '#999999',        // 辅助

  // 主色 — Nordic Deep Teal
  primary: '#00628f',
  primaryContainer: '#E1F1FA', // 浅蓝底
  primaryDim: '#007cb3',       // 渐变终点 / 按压态
  onPrimary: '#FFFFFF',

  // 功能色
  accentEmerald: '#2ECC71',    // 正确
  accentRose: '#E74C3C',       // 错误
  accentAmber: '#F39C12',      // 警告 / Good 状态
  accentSky: '#5BC0EB',        // 信息
  accentIndigo: '#6366F1',     // 音频波形

  // 旧字段兼容
  bgSurface: '#F9F9F9',
  bgDefault: '#FFFFFF',

  // 表面层级
  surfaceContainerLowest: '#ffffff',
  surfaceContainer: '#F2F4F5',
  surfaceContainerLow: '#f3f3f4',
  surfaceContainerHigh: '#EBEEF0',
  surfaceContainerHighest: '#DEE1E3',

  // 边界
  borderSubtle: 'rgba(0,0,0,0.06)',
  outline: '#737c7f',
  outlineVariant: '#bfc7d1',

  // 反馈
  correctBg: 'rgba(46,204,113,0.10)',
  wrongBg: 'rgba(0,0,0,0.04)',

  // 扩展功能色
  accentBlue: '#1A8ECA',       // Badge/icon highlight

  // 发音分析状态色
  statusPerfect: '#00628f',
  statusGood: '#ffb964',
  statusPractice: '#ba1a1a',
} as const;
