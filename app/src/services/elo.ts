/**
 * Elo Rating Engine
 * Based on demo app.js:227-230 threshold logic
 * Will be refined with proper Elo math in future phases
 */

export interface DiagnosticResult {
  level: string;
  competenceScore: number;
}

export function calculateDiagnosticResult(
  accuracy: number,
  avgReactionTimeSec: number,
): DiagnosticResult {
  if (accuracy >= 0.8 && avgReactionTimeSec < 3) {
    return { level: 'B2', competenceScore: 1600 };
  } else if (accuracy >= 0.6 && avgReactionTimeSec < 4) {
    return { level: 'B1', competenceScore: 1400 };
  } else if (accuracy >= 0.4) {
    return { level: 'A2', competenceScore: 1200 };
  } else {
    return { level: 'A1', competenceScore: 1000 };
  }
}

export const levelDescriptions: Record<string, string> = {
  A1: '你正处于起步阶段，系统将从最基础的生存组块开始。',
  A2: '你已掌握基础表达。系统将加速你的短语模块积累。',
  B1: '你的组块反应速度达到 B1 中级水平。\n系统已为你生成个性化路径。',
  B2: 'impressive！你的潜意识处理速度接近流利。\n系统将聚焦语用功能模块。',
};
