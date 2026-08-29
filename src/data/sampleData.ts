import { WordItem } from '../types/vocabulary';
import { ELEMENTARY_WORDS, PresetWord } from './elementaryWords';

export function createWordItemFromPreset(preset: PresetWord): WordItem {
  const now = new Date().toISOString();
  return {
    id: 'word_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36),
    word: preset.word.trim().toLowerCase(),
    translation: preset.translation.trim(),
    phonetic: preset.phonetic,
    pos: preset.pos,
    exampleEn: preset.exampleEn,
    exampleZh: preset.exampleZh,
    tags: [...preset.tags],
    familiarity: 'new',
    consecutiveCorrect: 0,
    totalPracticed: 0,
    totalCorrect: 0,
    totalTimeSpentMs: 0,
    bestTimeMs: null,
    lastTimeMs: null,
    averageTimeMs: null,
    easeFactor: 2.5,
    intervalDays: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function getInitialStarterWords(): WordItem[] {
  // Combine a subset of elementary words as standard starter list
  return ELEMENTARY_WORDS.slice(0, 25).map(createWordItemFromPreset);
}
