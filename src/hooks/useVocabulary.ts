import { useState, useEffect, useMemo, useCallback } from 'react';
import { WordItem, StorageData, AppSettings, RoundSummary } from '../types/vocabulary';
import { storageService } from '../services/storageService';
import { isWordDueForReview } from '../services/spacedRepetition';
import { ELEMENTARY_WORDS } from '../data/elementaryWords';
import { JUNIOR_HIGH_WORDS } from '../data/juniorHighWords';
import { createWordItemFromPreset } from '../data/sampleData';

export function useVocabulary() {
  const [data, setData] = useState<StorageData>(() => storageService.getData());

  useEffect(() => {
    const unsubscribe = storageService.subscribeData((newData) => {
      setData(newData);
    });
    return unsubscribe;
  }, []);

  const words = data.words;
  const roundHistory = data.roundHistory;
  const settings = data.settings as AppSettings;

  // Add Single Word
  const addWord = useCallback((wordItem: Omit<WordItem, 'id' | 'createdAt' | 'updatedAt' | 'familiarity' | 'consecutiveCorrect' | 'totalPracticed' | 'totalCorrect' | 'totalTimeSpentMs' | 'bestTimeMs' | 'lastTimeMs' | 'averageTimeMs' | 'easeFactor' | 'intervalDays' | 'lastReviewedAt' | 'nextReviewAt'>) => {
    const now = new Date().toISOString();
    const newWord: WordItem = {
      ...wordItem,
      id: 'word_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36),
      word: wordItem.word.toLowerCase().trim(),
      translation: wordItem.translation.trim(),
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

    const updated = [newWord, ...words.filter(w => w.word.toLowerCase() !== newWord.word)];
    storageService.saveWords(updated);
  }, [words]);

  // Update Single Word
  const updateWord = useCallback((id: string, updates: Partial<WordItem>) => {
    const updated = words.map(w => {
      if (w.id === id) {
        return {
          ...w,
          ...updates,
          word: updates.word ? updates.word.toLowerCase().trim() : w.word,
          updatedAt: new Date().toISOString(),
        };
      }
      return w;
    });
    storageService.saveWords(updated);
  }, [words]);

  // Delete Single Word
  const deleteWord = useCallback((id: string) => {
    const updated = words.filter(w => w.id !== id);
    storageService.saveWords(updated);
  }, [words]);

  // Reset Progress for Single Word
  const resetWordProgress = useCallback((id: string) => {
    const updated = words.map(w => {
      if (w.id === id) {
        return {
          ...w,
          familiarity: 'new' as const,
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
          updatedAt: new Date().toISOString(),
        };
      }
      return w;
    });
    storageService.saveWords(updated);
  }, [words]);

  // Import Preset Word Banks (Elementary / Junior High)
  const importPresetBank = useCallback((bankType: 'elementary' | 'junior_high', overwrite: boolean = false) => {
    const presets = bankType === 'elementary' ? ELEMENTARY_WORDS : JUNIOR_HIGH_WORDS;
    const wordMap = new Map<string, WordItem>();
    words.forEach(w => wordMap.set(w.word.toLowerCase(), w));

    presets.forEach(p => {
      const key = p.word.toLowerCase();
      if (!wordMap.has(key)) {
        wordMap.set(key, createWordItemFromPreset(p));
      } else if (overwrite) {
        const cur = wordMap.get(key)!;
        wordMap.set(key, {
          ...cur,
          translation: p.translation,
          pos: p.pos || cur.pos,
          phonetic: p.phonetic || cur.phonetic,
          exampleEn: p.exampleEn || cur.exampleEn,
          exampleZh: p.exampleZh || cur.exampleZh,
          tags: Array.from(new Set([...cur.tags, ...p.tags])),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    const newWords = Array.from(wordMap.values());
    storageService.saveWords(newWords);
    return presets.length;
  }, [words]);

  // Replace Entire Word List (e.g. Restore from backup)
  const replaceAllWords = useCallback((newWords: WordItem[]) => {
    storageService.saveWords(newWords);
  }, []);

  // Update Settings
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    storageService.updateSettings(newSettings);
  }, []);

  // Record Round
  const recordRound = useCallback((summary: RoundSummary, updatedWords: WordItem[]) => {
    storageService.recordRoundCompletion(summary, updatedWords);
  }, []);

  // Computed Bank Statistics
  const stats = useMemo(() => {
    const totalWords = words.length;
    let masteredCount = 0;
    let familiarCount = 0;
    let learningCount = 0;
    let strugglingCount = 0;
    let newCount = 0;
    let dueCount = 0;
    let totalReactionTime = 0;
    let countWithAverage = 0;

    words.forEach(w => {
      switch (w.familiarity) {
        case 'mastered': masteredCount++; break;
        case 'familiar': familiarCount++; break;
        case 'learning': learningCount++; break;
        case 'struggling': strugglingCount++; break;
        case 'new':
        default:
          newCount++;
          break;
      }

      if (isWordDueForReview(w)) {
        dueCount++;
      }

      if (w.averageTimeMs && w.averageTimeMs > 0) {
        totalReactionTime += w.averageTimeMs;
        countWithAverage++;
      }
    });

    const overallAverageTimeMs = countWithAverage > 0 ? Math.round(totalReactionTime / countWithAverage) : null;

    // Extract all unique tags
    const allTagsSet = new Set<string>();
    words.forEach(w => (w.tags || []).forEach(t => allTagsSet.add(t)));
    const allTags = Array.from(allTagsSet).sort();

    return {
      totalWords,
      masteredCount,
      familiarCount,
      learningCount,
      strugglingCount,
      newCount,
      dueCount,
      overallAverageTimeMs,
      allTags,
    };
  }, [words]);

  return {
    words,
    roundHistory,
    settings,
    stats,
    addWord,
    updateWord,
    deleteWord,
    resetWordProgress,
    importPresetBank,
    replaceAllWords,
    updateSettings,
    recordRound,
  };
}
