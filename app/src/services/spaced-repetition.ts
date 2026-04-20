/**
 * Spaced Repetition Engine (SM-2 Variant)
 * Calculates next_review_at based on mastery level and error history
 */

/** Return ISO date string for next review */
export function calculateNextReview(
  masteryLevel: number,
  errorCount: number,
  avgReactionMs: number,
): string {
  const intervals = [
    0,          // Level 0 (New): immediate
    1,          // Level 1 (Recognized): 1 day
    3,          // Level 2 (Recalled): 3 days
    7,          // Level 3 (Fluent): 1 week
    14,         // Level 4 (Automatic): 2 weeks
    30,         // Level 5 (Native): 1 month
  ];

  let days = intervals[Math.min(masteryLevel, 5)];

  // Penalty for errors: reduce interval
  if (errorCount > 3) {
    days = Math.max(1, days - 2);
  }

  // Fast reactions get a slight boost
  if (avgReactionMs > 0 && avgReactionMs < 500) {
    days = Math.ceil(days * 1.2);
  }

  // Slow reactions get shortened interval
  if (avgReactionMs > 2000) {
    days = Math.max(1, Math.floor(days * 0.7));
  }

  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

/** Determine mastery level change after an interaction */
export function computeMasteryDelta(
  currentLevel: number,
  isCorrect: boolean,
  reactionMs: number,
): number {
  if (isCorrect) {
    if (reactionMs < 400) return 2;   // Fast & correct: big jump
    if (reactionMs < 800) return 1;   // Normal correct: +1
    return 0;                          // Slow but correct: stay
  } else {
    return -1;                         // Wrong: drop
  }
}
