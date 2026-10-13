import { WordItem, RoundSummary } from '../types/vocabulary';
import { createWordItemFromPreset } from '../data/sampleData';

/**
 * Phase 0 sharing — no backend.
 * A tag's words (content only, no personal progress) are packed into the URL hash:
 *   https://.../vocabulary_app/#/s/<base64url(JSON)>
 * Opening the link lets the receiver import the words as a tag, and optionally
 * play a "challenge" with a fixed word order + fixed rules so scores are comparable.
 */

export interface ChallengeRules {
  seed: number;              // fixed word order
  slowMs: number;            // speed threshold used for scoring
  chineseDelaySeconds: number;
}

export interface SharedPack {
  v: 1;
  title: string;
  tag: string;
  words: Array<{
    word: string;
    translation: string;
    phonetic?: string;
    pos?: string;
    exampleEn?: string;
    exampleZh?: string;
  }>;
  challenge?: ChallengeRules;
}

// Compact wire format: arrays instead of objects to keep URLs short
type WireWord = [string, string, string?, string?, string?, string?];
interface WirePack {
  v: 1;
  t: string;          // title
  g: string;          // tag
  w: WireWord[];
  c?: [number, number, number]; // seed, slowMs, chineseDelaySeconds
}

const HASH_PREFIX = '#/s/';

// ── base64url <-> UTF-8 ──────────────────────────────────────────
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  const norm = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = norm + '==='.slice((norm.length + 3) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ── Pack building ────────────────────────────────────────────────
export function buildPackFromTag(
  allWords: WordItem[],
  tag: string,
  title: string,
  challenge?: ChallengeRules,
): SharedPack {
  const words = allWords
    .filter(w => w.tags.includes(tag))
    .map(w => ({
      word: w.word,
      translation: w.translation,
      phonetic: w.phonetic || undefined,
      pos: w.pos || undefined,
      exampleEn: w.exampleEn || undefined,
      exampleZh: w.exampleZh || undefined,
    }));
  return { v: 1, title: title.trim() || tag, tag, words, challenge };
}

export function encodePackToUrl(pack: SharedPack): string {
  const trimEnd = (arr: (string | undefined)[]): WireWord => {
    const a = arr.map(x => x ?? '');
    while (a.length > 2 && a[a.length - 1] === '') a.pop();
    return a as WireWord;
  };
  const wire: WirePack = {
    v: 1,
    t: pack.title,
    g: pack.tag,
    w: pack.words.map(w =>
      trimEnd([w.word, w.translation, w.phonetic, w.pos, w.exampleEn, w.exampleZh])
    ),
  };
  if (pack.challenge) {
    wire.c = [pack.challenge.seed, pack.challenge.slowMs, pack.challenge.chineseDelaySeconds];
  }
  const base = window.location.origin + window.location.pathname;
  return base + HASH_PREFIX + toBase64Url(JSON.stringify(wire));
}

/** Returns a pack if the current URL hash contains one, otherwise null. Throws on corrupt data. */
export function decodePackFromHash(hash: string): SharedPack | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const wire: WirePack = JSON.parse(fromBase64Url(hash.slice(HASH_PREFIX.length)));
  if (wire.v !== 1 || !Array.isArray(wire.w)) throw new Error('不支援的分享格式');
  return {
    v: 1,
    title: String(wire.t || wire.g || '分享單字'),
    tag: String(wire.g || wire.t || '分享單字'),
    words: wire.w
      .filter(w => Array.isArray(w) && w[0])
      .map(w => ({
        word: String(w[0]),
        translation: String(w[1] ?? ''),
        phonetic: w[2] || undefined,
        pos: w[3] || undefined,
        exampleEn: w[4] || undefined,
        exampleZh: w[5] || undefined,
      })),
    challenge: wire.c
      ? { seed: Number(wire.c[0]), slowMs: Number(wire.c[1]), chineseDelaySeconds: Number(wire.c[2]) }
      : undefined,
  };
}

export function clearShareHash() {
  if (window.location.hash.startsWith(HASH_PREFIX)) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

/**
 * Merge pack words into the existing bank.
 * Existing words (same spelling) just get the tag added; translation filled in if blank.
 * Returns the new full word list and the IDs of the pack's words (in pack order).
 */
export function importPack(
  existing: WordItem[],
  pack: SharedPack,
): { words: WordItem[]; packWordIds: string[]; addedCount: number } {
  const byWord = new Map(existing.map(w => [w.word.toLowerCase(), w]));
  const result = [...existing];
  const packWordIds: string[] = [];
  let addedCount = 0;
  const now = new Date().toISOString();

  for (const pw of pack.words) {
    const key = pw.word.trim().toLowerCase();
    const found = byWord.get(key);
    if (found) {
      const idx = result.findIndex(w => w.id === found.id);
      const updated: WordItem = {
        ...found,
        tags: found.tags.includes(pack.tag) ? found.tags : [...found.tags, pack.tag],
        translation: found.translation || pw.translation,
        phonetic: found.phonetic || pw.phonetic,
        pos: found.pos || pw.pos,
        exampleEn: found.exampleEn || pw.exampleEn,
        exampleZh: found.exampleZh || pw.exampleZh,
        updatedAt: now,
      };
      result[idx] = updated;
      byWord.set(key, updated);
      packWordIds.push(updated.id);
    } else {
      const item = createWordItemFromPreset({ ...pw, tags: [pack.tag] });
      result.push(item);
      byWord.set(key, item);
      packWordIds.push(item.id);
      addedCount++;
    }
  }
  return { words: result, packWordIds, addedCount };
}

// ── Challenge helpers ───────────────────────────────────────────
/** mulberry32 — tiny deterministic PRNG */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Same seed + same word set => same order on every device (sorted by spelling first, since IDs differ per user). */
export function seededOrder<T extends { word: string }>(items: T[], seed: number): T[] {
  const arr = [...items].sort((a, b) => a.word.localeCompare(b.word));
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function newChallengeSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export interface ChallengeScore {
  score: number;
  maxScore: number;
  correct: number;
  total: number;
  totalTimeMs: number;
}

/**
 * Only the first attempt of each word counts (retries ignored).
 * Correct = 100 + speed bonus (0..100, linear down to 0 at slowMs). Wrong = 0.
 */
export function computeChallengeScore(summary: RoundSummary, rules: ChallengeRules): ChallengeScore {
  const firstAttempts = new Map<string, RoundSummary['results'][number]>();
  for (const r of summary.results) {
    if (r.isRetry) continue;
    if (!firstAttempts.has(r.wordId)) firstAttempts.set(r.wordId, r);
  }
  let score = 0;
  let correct = 0;
  let totalTimeMs = 0;
  firstAttempts.forEach(r => {
    totalTimeMs += r.responseTimeMs;
    if (r.isCorrect) {
      correct++;
      const bonus = Math.max(0, 1 - r.responseTimeMs / Math.max(1, rules.slowMs));
      score += 100 + Math.round(100 * bonus);
    }
  });
  const total = firstAttempts.size;
  return { score, maxScore: total * 200, correct, total, totalTimeMs };
}

/** Try the native share sheet (mobile), fall back to clipboard. Returns how it was shared. */
export async function shareOrCopy(text: string, url?: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share(url ? { text, url } : { text });
      return 'shared';
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
