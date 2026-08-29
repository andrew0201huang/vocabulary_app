import { FamiliarityLevel, WordItem, AppSettings } from '../types/vocabulary';

export interface SM2UpdateResult {
  updatedWord: WordItem;
  previousFamiliarity: FamiliarityLevel;
  newFamiliarity: FamiliarityLevel;
  grade: number; // 0 to 5
}

/**
 * Calculates updated familiarity, spaced repetition intervals, and statistics
 * based on response time and accuracy.
 */
export function calculateSpacedRepetition(
  word: WordItem,
  isCorrect: boolean,
  responseTimeMs: number,
  settings: AppSettings
): SM2UpdateResult {
  const previousFamiliarity = word.familiarity;
  const now = new Date();
  const nowIso = now.toISOString();

  const { lightningMs, goodMs, slowMs } = settings.speedThresholds;

  let grade: number;
  let newFamiliarity: FamiliarityLevel;
  let newConsecutiveCorrect: number;
  let newEaseFactor = word.easeFactor || 2.5;
  let newIntervalDays = word.intervalDays || 0;

  if (!isCorrect) {
    // Incorrect or skipped -> Grade 0
    grade = 0;
    newFamiliarity = 'struggling';
    newConsecutiveCorrect = 0;
    newEaseFactor = Math.max(1.3, newEaseFactor - 0.25);
    newIntervalDays = 1;
  } else {
    // Correct answer -> grade determined by response latency
    if (responseTimeMs <= lightningMs) {
      grade = 5; // Lightning Fast (精通)
      newConsecutiveCorrect = word.consecutiveCorrect + 1;
      newEaseFactor = Math.min(3.2, newEaseFactor + 0.15);

      if (newConsecutiveCorrect >= 2) {
        newFamiliarity = 'mastered';
      } else {
        newFamiliarity = 'familiar';
      }

      // Fast expansion of review interval
      if (newConsecutiveCorrect === 1) {
        newIntervalDays = 2;
      } else if (newConsecutiveCorrect === 2) {
        newIntervalDays = 6;
      } else if (newConsecutiveCorrect === 3) {
        newIntervalDays = 14;
      } else {
        newIntervalDays = Math.round(Math.max(6, newIntervalDays) * newEaseFactor * 1.4);
      }
    } else if (responseTimeMs <= goodMs) {
      grade = 4; // Good (熟練)
      newConsecutiveCorrect = word.consecutiveCorrect + 1;
      newEaseFactor = Math.min(3.0, newEaseFactor + 0.05);

      if (newConsecutiveCorrect >= 3) {
        newFamiliarity = 'familiar';
      } else {
        newFamiliarity = 'learning';
      }

      if (newConsecutiveCorrect === 1) {
        newIntervalDays = 1;
      } else if (newConsecutiveCorrect === 2) {
        newIntervalDays = 3;
      } else {
        newIntervalDays = Math.round(Math.max(2, newIntervalDays) * newEaseFactor);
      }
    } else if (responseTimeMs <= slowMs) {
      grade = 3; // Learning / Slow (學習中)
      newConsecutiveCorrect = Math.max(1, word.consecutiveCorrect);
      newFamiliarity = 'learning';
      newIntervalDays = Math.max(1, Math.round((newIntervalDays || 1) * 1.1));
    } else {
      grade = 2; // Very Slow / Stumbling (生疏)
      newFamiliarity = 'struggling';
      newConsecutiveCorrect = 0;
      newEaseFactor = Math.max(1.3, newEaseFactor - 0.15);
      newIntervalDays = 1;
    }
  }

  // Calculate next review date
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + newIntervalDays);

  // Update response time statistics
  const newTotalPracticed = word.totalPracticed + 1;
  const newTotalCorrect = word.totalCorrect + (isCorrect ? 1 : 0);
  const newTotalTimeSpentMs = word.totalTimeSpentMs + responseTimeMs;
  const newBestTimeMs = word.bestTimeMs !== null 
    ? (isCorrect ? Math.min(word.bestTimeMs, responseTimeMs) : word.bestTimeMs)
    : (isCorrect ? responseTimeMs : null);
  const newLastTimeMs = responseTimeMs;
  const newAverageTimeMs = Math.round(newTotalTimeSpentMs / newTotalPracticed);

  const updatedWord: WordItem = {
    ...word,
    familiarity: newFamiliarity,
    consecutiveCorrect: newConsecutiveCorrect,
    totalPracticed: newTotalPracticed,
    totalCorrect: newTotalCorrect,
    totalTimeSpentMs: newTotalTimeSpentMs,
    bestTimeMs: newBestTimeMs,
    lastTimeMs: newLastTimeMs,
    averageTimeMs: newAverageTimeMs,
    easeFactor: Number(newEaseFactor.toFixed(2)),
    intervalDays: newIntervalDays,
    lastReviewedAt: nowIso,
    nextReviewAt: nextReviewDate.toISOString(),
    updatedAt: nowIso,
  };

  return {
    updatedWord,
    previousFamiliarity,
    newFamiliarity,
    grade,
  };
}

/**
 * Filter words that are due for spaced repetition review
 */
export function isWordDueForReview(word: WordItem): boolean {
  if (!word.nextReviewAt) return true; // Never practiced
  const nextReview = new Date(word.nextReviewAt).getTime();
  const now = Date.now();
  return now >= nextReview;
}

/**
 * Get speed rating classification label and color
 */
export function getSpeedCategory(timeMs: number, settings: AppSettings): {
  label: string;
  rating: 'lightning' | 'good' | 'slow' | 'struggling';
  color: string;
  badgeBg: string;
} {
  const { lightningMs, goodMs, slowMs } = settings.speedThresholds;
  if (timeMs <= lightningMs) {
    return { label: '極速精通', rating: 'lightning', color: 'text-amber-400', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
  }
  if (timeMs <= goodMs) {
    return { label: '熟練迅速', rating: 'good', color: 'text-emerald-400', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  }
  if (timeMs <= slowMs) {
    return { label: '尚可反應', rating: 'slow', color: 'text-blue-400', badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
  }
  return { label: '生疏遲疑', rating: 'struggling', color: 'text-rose-400', badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
}
