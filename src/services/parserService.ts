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
}

export interface ParseResult {
  validWords: ParsedWordEntry[];
  duplicates: ParsedWordEntry[];
  invalidLines: { line: number; text: string; error: string }[];
  totalParsed: number;
}

/**
 * Parses multi-line pasted text from Excel/Sheets (Tab-separated) or CSV or Colon/Dash formatted text.
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
    if (!line) return; // Skip empty lines

    let word = '';
    let translation = '';
    let pos = '';
    let phonetic = '';
    let exampleEn = '';
    let exampleZh = '';
    let tags = [...defaultTags];

    if (line.includes('\t')) {
      // Tab-separated (Excel / Google Sheets direct copy)
      const cols = line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
      word = cols[0] || '';
      translation = cols[1] || '';
      if (cols[2]) {
        if (/^\[.*\]$|^\/.*\/$/.test(cols[2])) {
          phonetic = cols[2];
        } else if (/^[a-z]+\.?$/i.test(cols[2])) {
          pos = cols[2];
        } else {
          pos = cols[2];
        }
      }
      if (cols[3]) {
        if (!phonetic && (/^\[.*\]$|^\/.*\/$/.test(cols[3]))) {
          phonetic = cols[3];
        } else {
          exampleEn = cols[3];
        }
      }
      if (cols[4]) exampleZh = cols[4];
      if (cols[5]) tags.push(...cols[5].split(/[,/]/).map(t => t.trim()).filter(Boolean));
    } else if (line.includes(',')) {
      // Comma-separated (CSV format)
      // Basic CSV token parser
      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      word = cols[0] || '';
      translation = cols[1] || '';
      if (cols[2]) pos = cols[2];
      if (cols[3]) phonetic = cols[3];
      if (cols[4]) exampleEn = cols[4];
      if (cols[5]) exampleZh = cols[5];
    } else if (line.includes(' - ') || line.includes(' — ') || line.includes('：') || line.includes(':')) {
      // Dash or colon separated (e.g. "apple - 蘋果" or "apple: 蘋果")
      const parts = line.split(/\s*[-—:：]\s*/);
      word = parts[0] || '';
      translation = parts.slice(1).join(' ') || '';
    } else {
      // Space separated heuristic if first word is English and rest is Chinese
      const match = line.match(/^([a-zA-Z\s\-']+)\s+([\u4e00-\u9fa5\w\s.,;()（）/]+)$/);
      if (match) {
        word = match[1].trim();
        translation = match[2].trim();
      } else {
        invalidLines.push({
          line: lineNumber,
          text: line,
          error: '無法辨識格式。請確認包含單字與中文釋義（Tab、逗號或「單字 - 中文」格式）。',
        });
        return;
      }
    }

    // Clean word
    word = word.trim().toLowerCase();
    // Strip surrounding quotes or parentheses
    word = word.replace(/^["'(\[]+|["')\]]+$/g, '');
    translation = translation.trim();

    if (!word || !/^[a-zA-Z\s\-'.]+$/.test(word)) {
      invalidLines.push({
        line: lineNumber,
        text: line,
        error: `英文單字格式不符：「${word}」`,
      });
      return;
    }

    if (!translation) {
      invalidLines.push({
        line: lineNumber,
        text: line,
        error: `缺少中文釋義：「${word}」`,
      });
      return;
    }

    const entry: ParsedWordEntry = {
      word,
      translation,
      pos: pos || undefined,
      phonetic: phonetic || undefined,
      exampleEn: exampleEn || undefined,
      exampleZh: exampleZh || undefined,
      tags: Array.from(new Set(tags)),
    };

    if (existingWordMap.has(word) || seenInBatch.has(word)) {
      entry.isDuplicate = true;
      duplicates.push(entry);
    } else {
      seenInBatch.add(word);
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

/**
 * Merge parsed entries into word database
 */
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
          translation: entry.translation,
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

/**
 * Export word bank to CSV string with UTF-8 BOM
 */
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

  // \uFEFF BOM ensures Excel opens UTF-8 Chinese characters properly without garbling
  return '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

/**
 * Export full database to JSON string
 */
export function exportToJSON(data: any): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Triggers browser file download
 */
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
