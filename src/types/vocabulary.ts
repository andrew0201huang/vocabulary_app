export type FamiliarityLevel = 'new' | 'struggling' | 'learning' | 'familiar' | 'mastered';

export type InputMode = 'keyboard' | 'handwriting' | 'voice';

export interface WordItem {
  id: string;
  word: string;               // English word (lowercase trimmed)
  translation: string;        // Traditional Chinese translation
  phonetic?: string;          // Phonetic alphabet / KK / IPA (optional)
  pos?: string;               // Part of speech (e.g. n., v., adj.)
  exampleEn?: string;         // Example sentence in English
  exampleZh?: string;         // Example sentence translation
  tags: string[];             // Categories e.g. ["國小必備", "國中基礎", "日常", "商務"]
  
  // Learning & Speed Metrics
  familiarity: FamiliarityLevel;
  consecutiveCorrect: number;  // Consecutive correct answers streak
  totalPracticed: number;      // Total attempts
  totalCorrect: number;        // Total correct attempts
  totalTimeSpentMs: number;    // Cumulative time spent on this word
  bestTimeMs: number | null;   // Fastest response time in ms
  lastTimeMs: number | null;   // Most recent response time in ms
  averageTimeMs: number | null;// Average response time in ms
  
  // Spaced Repetition (SM-2 variant based on response latency)
  easeFactor: number;          // Default 2.5
  intervalDays: number;        // Interval until next review in days
  lastReviewedAt: string | null;// ISO string
  nextReviewAt: string | null;  // ISO string
  createdAt: string;           // ISO string
  updatedAt: string;           // ISO string
}

export interface RoundConfig {
  wordCount: number;           // Number of words per round (e.g. 5, 10, 20, 50, all)
  filterMode: 'all' | 'due' | 'struggling' | 'new' | 'elementary' | 'junior_high' | 'custom_tag';
  customTag?: string;
  inputMode: InputMode;
  autoPlayAudio: boolean;
  showPhoneticHint: boolean;
  handwritingSelfGrade: boolean; // For handwriting mode: self-grade vs auto
}

export interface WordTestResult {
  wordId: string;
  word: string;
  translation: string;
  isCorrect: boolean;
  responseTimeMs: number;
  inputMethod: InputMode;
  userTyped?: string;
  previousFamiliarity: FamiliarityLevel;
  newFamiliarity: FamiliarityLevel;
  isRetry: boolean;            // Whether this was a dynamic review retry
  timestamp: string;
}

export interface RoundSummary {
  id: string;
  startedAt: string;
  endedAt: string;
  totalTested: number;
  totalUniqueWords: number;
  correctCount: number;
  accuracyRate: number;        // 0 - 100
  averageTimeMs: number;
  fastestTimeMs: number | null;
  results: WordTestResult[];
  strugglingWordIds: string[];  // Words that were slow, incorrect, or retried
  masteredWordIds: string[];    // Words that achieved fast/mastered in this round
}

export interface AppSettings {
  googleClientId: string;
  speechRate: number;          // 0.5 to 1.5 (default: 0.95)
  speechPitch: number;         // 0.5 to 1.5 (default: 1.0)
  speechVoiceName: string;     // Preferred TTS voice
  soundEffectsEnabled: boolean;
  
  // Speed Thresholds (in seconds)
  speedThresholds: {
    lightningMs: number;       // e.g. 1800ms (Fast / 精通)
    goodMs: number;            // e.g. 3500ms (Good / 熟練)
    slowMs: number;            // e.g. 6000ms (Slow / 生疏)
  };
  
  defaultRoundWordCount: number;
  defaultInputMode: InputMode;
  autoPlayPronunciation: boolean;
  darkMode: boolean;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'local_only' | 'error' | 'offline';

export interface StorageData {
  version: number;
  words: WordItem[];
  roundHistory: RoundSummary[];
  settings: Partial<AppSettings>;
  lastSyncedAt: string | null;
}
