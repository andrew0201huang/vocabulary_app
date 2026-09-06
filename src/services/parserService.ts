import { WordItem } from '../types/vocabulary';
import { createWordItemFromPreset } from '../data/sampleData';

export interface ParsedWordEntry {
  word: string;
  translation: string;
  pos?: string;
  phonetic?: string;
  exampleEn?: string;
  exampleZh?: string;
  tags: string[];
  isDuplicate?: boolean;
  /** True when only a word was provided (no translation) — needs dictionary lookup */
  needsLookup?: boolean;
}

export interface ParseResult {
  validWords: ParsedWordEntry[];
  duplicates: ParsedWordEntry[];
  invalidLines: { line: number; text: string; error: string }[];
  totalParsed: number;
}

// ── Detect language ────────────────────────────────────────────────────────────
const CJK = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
const ENG_WORD = /^[a-zA-Z][a-zA-Z0-9\s\-'.]*$/;

function isChinese(s: string) { return CJK.test(s); }
function isEnglishWord(s: string) { return ENG_WORD.test(s.trim()); }

// ── Smart tokenizer ────────────────────────────────────────────────────────────
/**
 * Tries every possible separator to split a line into (word, translation).
 * Returns null only if the line is completely blank or unparseable into
 * any meaningful token.
 */
function tokenizeLine(line: string): { word: string; translation: string; pos?: string; phonetic?: string } | null {
  if (!line) return null;

  // 1. Tab-separated (Excel/Sheets)
  if (line.includes('\t')) {
    const cols = line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const w = cols[0];
    const t = cols[1] ?? '';
    let pos = '', phonetic = '';
    if (cols[2]) {
      if (/^\[.*\]$|^\/.*\/$/.test(cols[2])) phonetic = cols[2];
      else pos = cols[2];
    }
    if (cols[3] && !phonetic && /^\[.*\]$|^\/.*\/$/.test(cols[3])) phonetic = cols[3];
    return { word: w, translation: t, pos, phonetic };
  }

  // 2. Dash / colon / colon-fullwidth separators
  const dashMatch = line.match(/^(.+?)\s*[-—–:：]\s*(.+)$/);
  if (dashMatch) {
    return { word: dashMatch[1].trim(), translation: dashMatch[2].trim() };
  }

  // 3. Comma-separated (CSV)
  if (line.includes(',')) {
    const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    return { word: cols[0], translation: cols[1] ?? '' };
  }

  // 4. "English Chinese" (space) — first token English, rest Chinese
  const spaceMatch = line.match(/^([a-zA-Z][a-zA-Z0-9\-'.]*)\s+([\s\S]+)$/);
  if (spaceMatch) {
    return { word: spaceMatch[1].trim(), translation: spaceMatch[2].trim() };
  }

  // 5. Single token — could be just an English word or just Chinese
  const single = line.trim();
  if (isEnglishWord(single)) {
    return { word: single, translation: '' };     // needs lookup
  }
  if (isChinese(single)) {
    return { word: single, translation: '' };     // Chinese word, needs reverse lookup
  }

  return null;
}

/**
 * Universal parser — accepts any reasonable format.
 * Lines with only an English word (no translation) are marked needsLookup=true.
 * Lines with only Chinese are passed through as word=chinese with needsLookup.
 */
export function parseBatchWords(
  rawText: string,
  existingWords: WordItem[],
  defaultTags: string[] = ['自訂匯入']
): ParseResult {
  const lines = rawText.split(/\r?\n/);
  const existingWordMap = new Map<string, WordItem>();
  existingWords.forEach(w => existingWordMap.set(w.word.toLowerCase().trim(), w));

  const validWords: ParsedWordEntry[] = [];
  const duplicates: ParsedWordEntry[] = [];
  const invalidLines: { line: number; text: string; error: string }[] = [];
  const seenInBatch = new Set<string>();

  lines.forEach((rawLine, idx) => {
    const lineNumber = idx + 1;
    const line = rawLine.trim();
    if (!line) return;

    const parsed = tokenizeLine(line);
    if (!parsed) {
      invalidLines.push({ line: lineNumber, text: line, error: '無法解析' });
      return;
    }

    let { word, translation, pos = '', phonetic = '' } = parsed;

    // Normalise word
    word = word.trim().replace(/^["'(\[]+|["')\]]+$/g, '').toLowerCase();

    // Determine if this needs a dictionary lookup
    const needsLookup = !translation || !translation.trim();

    // If neither English nor Chinese, skip
    if (!word) {
      invalidLines.push({ line: lineNumber, text: line, error: '空白單字' });
      return;
    }

    const tags = [...defaultTags];

    const entry: ParsedWordEntry = {
      word,
      translation: translation.trim(),
      pos: pos || undefined,
      phonetic: phonetic || undefined,
      tags: Array.from(new Set(tags)),
      needsLookup,
    };

    const key = word.toLowerCase();
    if (existingWordMap.has(key) || seenInBatch.has(key)) {
      entry.isDuplicate = true;
      duplicates.push(entry);
    } else {
      seenInBatch.add(key);
      validWords.push(entry);
    }
  });

  return {
    validWords,
    duplicates,
    invalidLines,
    totalParsed: validWords.length + duplicates.length,
  };
}

// ── Dictionary lookup ──────────────────────────────────────────────────────────

export interface DictResult {
  translation: string;
  pos?: string;
  phonetic?: string;
  exampleEn?: string;
}

/**
 * Translate a single English word to Traditional Chinese.
 * Tries multiple free services in order until one succeeds.
 */
async function translateToZH(word: string): Promise<string> {
  const encoded = encodeURIComponent(word);

  // 1. MyMemory (single word only, no quota issue)
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|zh-TW&de=a@b.com`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      const t: string = data?.responseData?.translatedText ?? '';
      // MyMemory returns 'QUERY LENGTH LIMIT EXCEDEED' or the original on failure
      if (t && t !== word && !t.toUpperCase().includes('LIMIT') && !t.toUpperCase().includes('QUERY')) {
        return t;
      }
    }
  } catch { /* try next */ }

  // 2. Google Translate unofficial single-word endpoint (no key needed for short queries)
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q=${encoded}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      const t: string = data?.[0]?.[0]?.[0] ?? '';
      if (t && t !== word) return t;
    }
  } catch { /* try next */ }

  return '';
}

/**
 * Look up an English word via Free Dictionary API (phonetic/pos/example) + translation.
 * Returns basic info. Falls back gracefully on any network error.
 */
export async function lookupWord(word: string): Promise<DictResult> {
  const clean = word.trim().toLowerCase();

  let pos: string | undefined;
  let phonetic: string | undefined;
  let exampleEn: string | undefined;

  // 1. Free Dictionary API — phonetic + pos + example sentence (English only)
  try {
    const dictRes = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (dictRes.ok) {
      const data = await dictRes.json();
      const entry = data[0];
      phonetic = entry?.phonetic || entry?.phonetics?.find((p: any) => p.text)?.text;
      const firstMeaning = entry?.meanings?.[0];
      if (firstMeaning) {
        pos = firstMeaning.partOfSpeech;
        const firstDef = firstMeaning.definitions?.[0];
        if (firstDef) exampleEn = firstDef.example;
      }
    }
  } catch { /* ignore, proceed to translation */ }

  // 2. Translate the word itself (just the word, not definition) → more reliable
  const translation = await translateToZH(clean);

  return {
    translation: translation || '',   // empty = failed, user can fill in manually
    pos,
    phonetic,
    exampleEn,
  };
}

/**
 * Batch lookup for entries with needsLookup=true.
 * Calls onProgress(done, total) after each lookup.
 */
export async function lookupMissingWords(
  entries: ParsedWordEntry[],
  onProgress?: (done: number, total: number) => void
): Promise<ParsedWordEntry[]> {
  const toLookup = entries.filter(e => e.needsLookup);
  const total = toLookup.length;
  let done = 0;

  const results = await Promise.allSettled(
    toLookup.map(async entry => {
      const result = await lookupWord(entry.word);
      done++;
      onProgress?.(done, total);
      return { entry, result };
    })
  );

  const resultMap = new Map<string, DictResult>();
  results.forEach(r => {
    if (r.status === 'fulfilled') {
      resultMap.set(r.value.entry.word, r.value.result);
    }
  });

  return entries.map(entry => {
    if (!entry.needsLookup) return entry;
    const looked = resultMap.get(entry.word);
    if (!looked) return entry;
    const stillMissing = !looked.translation;
    return {
      ...entry,
      translation: looked.translation,
      pos: entry.pos || looked.pos,
      phonetic: entry.phonetic || looked.phonetic,
      exampleEn: entry.exampleEn || looked.exampleEn,
      needsLookup: stillMissing, // keep true if lookup failed (empty translation)
    };
  });
}

// ── Merge ──────────────────────────────────────────────────────────────────────

export function mergeParsedWords(
  existingWords: WordItem[],
  entriesToAdd: ParsedWordEntry[],
  overwriteExisting: boolean = false
): WordItem[] {
  const wordMap = new Map<string, WordItem>();
  existingWords.forEach(w => wordMap.set(w.word.toLowerCase(), w));

  entriesToAdd.forEach(entry => {
    const key = entry.word.toLowerCase();
    if (wordMap.has(key)) {
      if (overwriteExisting) {
        const current = wordMap.get(key)!;
        wordMap.set(key, {
          ...current,
          translation: entry.translation || current.translation,
          pos: entry.pos || current.pos,
          phonetic: entry.phonetic || current.phonetic,
          exampleEn: entry.exampleEn || current.exampleEn,
          exampleZh: entry.exampleZh || current.exampleZh,
          tags: Array.from(new Set([...current.tags, ...entry.tags])),
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      wordMap.set(key, createWordItemFromPreset(entry));
    }
  });

  return Array.from(wordMap.values());
}

// ── Export utilities ───────────────────────────────────────────────────────────

export function exportToCSV(words: WordItem[]): string {
  const headers = ['單字', '中文釋義', '詞性', '音標', '標籤', '熟悉度', '連續正確', '測驗次數', '最佳反應時間(秒)', '平均反應時間(秒)', '上次複習時間', '下次複習時間'];
  const rows = words.map(w => [
    `"${(w.word || '').replace(/"/g, '""')}"`,
    `"${(w.translation || '').replace(/"/g, '""')}"`,
    `"${(w.pos || '').replace(/"/g, '""')}"`,
    `"${(w.phonetic || '').replace(/"/g, '""')}"`,
    `"${(w.tags || []).join(';').replace(/"/g, '""')}"`,
    `"${w.familiarity}"`,
    w.consecutiveCorrect,
    w.totalPracticed,
    w.bestTimeMs ? (w.bestTimeMs / 1000).toFixed(2) : '',
    w.averageTimeMs ? (w.averageTimeMs / 1000).toFixed(2) : '',
    w.lastReviewedAt || '',
    w.nextReviewAt || '',
  ]);
  return '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

export function exportToJSON(data: any): string {
  return JSON.stringify(data, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
