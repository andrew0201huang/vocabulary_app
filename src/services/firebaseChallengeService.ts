import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { WordItem, RoundSummary } from '../types/vocabulary';
import { createWordItemFromPreset } from '../data/sampleData';

const firebaseConfig = {
  projectId: "vocab-speed-challenge-2026",
  appId: "1:336093461885:web:5643e1e06805e415eb6014",
  storageBucket: "vocab-speed-challenge-2026.firebasestorage.app",
  apiKey: "AIzaSyBXxTAYku1_NKmyMLCQO5rMEVFJT7GX1eI",
  authDomain: "vocab-speed-challenge-2026.firebaseapp.com",
  messagingSenderId: "336093461885",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Data Interfaces
export interface ChallengeDoc {
  id: string;               // 6-character code e.g. "K7Q2XM"
  title: string;
  tag: string;
  createdBy: string;
  creatorName: string;
  startsAt: string;          // ISO string
  endsAt: string | null;     // ISO string (null for unlimited)
  words: Array<{
    word: string;
    translation: string;
    phonetic?: string;
    pos?: string;
    exampleEn?: string;
    exampleZh?: string;
  }>;
  seed: number;
  slowMs: number;
  chineseDelaySeconds: number;
  createdAt: any;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL?: string;
  score: number;
  accuracy: number;
  totalTimeMs: number;
  correctCount: number;
  totalQuestions: number;
  attempts: number;
  updatedAt: any;
}

export interface CurrentPlayer {
  uid: string;
  displayName: string;
  isAnonymous: boolean;
  photoURL?: string | null;
  email?: string | null;
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

export function subscribeAuth(callback: (player: CurrentPlayer | null) => void) {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (!user) {
      callback(null);
    } else {
      const storedName = localStorage.getItem('speedvocab_player_name');
      let localName = '';
      try {
        const raw = localStorage.getItem('speedvocab_local_profile');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.name) localName = parsed.name;
        }
      } catch {
        // ignore
      }
      const name = user.displayName || storedName || localName || (user.isAnonymous ? '匿名挑戰者' : '挑戰玩家');
      callback({
        uid: user.uid,
        displayName: name,
        isAnonymous: user.isAnonymous,
        photoURL: user.photoURL,
        email: user.email,
      });
    }
  });
}

export async function loginAnonymouslyWithNickname(nickname: string): Promise<CurrentPlayer> {
  const cred = await signInAnonymously(auth);
  const cleanName = nickname.trim() || '匿名挑戰者';
  if (cred.user) {
    try {
      await updateProfile(cred.user, { displayName: cleanName });
    } catch {
      // ignore
    }
  }
  localStorage.setItem('speedvocab_player_name', cleanName);
  return {
    uid: cred.user.uid,
    displayName: cleanName,
    isAnonymous: true,
  };
}

export async function loginWithGoogle(): Promise<CurrentPlayer> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  const user = cred.user;
  const name = user.displayName || 'Google 玩家';
  localStorage.setItem('speedvocab_player_name', name);
  return {
    uid: user.uid,
    displayName: name,
    isAnonymous: false,
    photoURL: user.photoURL,
    email: user.email,
  };
}

export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
  localStorage.removeItem('speedvocab_player_name');
}

// ── Challenge Code Generation ────────────────────────────────────────────────

function generateChallengeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ── Challenge Firestore APIs ─────────────────────────────────────────────────

export async function createOnlineChallenge(params: {
  title: string;
  tag: string;
  words: WordItem[];
  durationDays: number | null; // 7 for 1 week, null for unlimited
  slowMs?: number;
  chineseDelaySeconds?: number;
}): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) {
    throw new Error('只有使用 Google 帳號登入的使用者才可發起競賽');
  }

  const storedName = localStorage.getItem('speedvocab_player_name') || '挑戰發起人';
  const code = generateChallengeCode();
  const tagWords = params.words
    .filter(w => w.tags.includes(params.tag))
    .map(w => ({
      word: w.word,
      translation: w.translation,
      phonetic: w.phonetic || '',
      pos: w.pos || '',
      exampleEn: w.exampleEn || '',
      exampleZh: w.exampleZh || '',
    }));

  if (tagWords.length === 0) {
    throw new Error('此標籤內沒有單字可供競賽');
  }

  const now = new Date();
  const startsAt = now.toISOString();
  let endsAt: string | null = null;
  if (params.durationDays && params.durationDays > 0) {
    const end = new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000);
    endsAt = end.toISOString();
  }

  const challengeData: ChallengeDoc = {
    id: code,
    title: params.title.trim() || params.tag,
    tag: params.tag,
    createdBy: currentUser.uid,
    creatorName: currentUser.displayName || storedName,
    startsAt,
    endsAt,
    words: tagWords,
    seed: Math.floor(Math.random() * 2 ** 31),
    slowMs: params.slowMs ?? 15000,
    chineseDelaySeconds: params.chineseDelaySeconds ?? 10,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'challenges', code), challengeData);
  return code;
}

export interface UserChallengeItem extends ChallengeDoc {
  relation: 'created' | 'participated';
}

export function getLocalParticipatedCodes(): string[] {
  try {
    const raw = localStorage.getItem('speedvocab_participated_challenges');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(c => String(c).toUpperCase());
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveLocalParticipatedCode(code: string): void {
  try {
    const list = getLocalParticipatedCodes();
    const upper = code.trim().toUpperCase();
    if (!list.includes(upper)) {
      list.unshift(upper);
      localStorage.setItem('speedvocab_participated_challenges', JSON.stringify(list.slice(0, 50)));
    }
  } catch {
    // ignore
  }
}

export async function recordChallengeParticipation(code: string): Promise<void> {
  const upper = code.trim().toUpperCase();
  saveLocalParticipatedCode(upper);
  const user = auth.currentUser;
  if (user && !user.isAnonymous) {
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'participations', upper),
        { code: upper, participatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      console.warn('[recordChallengeParticipation error]', e);
    }
  }
}

export function subscribeUserChallenges(
  uid: string | null,
  callback: (challenges: UserChallengeItem[]) => void
): () => void {
  let createdList: ChallengeDoc[] = [];
  const participatedCodes = new Set<string>(getLocalParticipatedCodes());
  let unsubCreated: (() => void) | null = null;
  let unsubParticipated: (() => void) | null = null;
  let isMounted = true;

  const emitMerged = async () => {
    if (!isMounted) return;
    const itemsMap = new Map<string, UserChallengeItem>();

    // 1. Add created challenges
    for (const ch of createdList) {
      itemsMap.set(ch.id, { ...ch, relation: 'created' });
    }

    // 2. Add participated challenges
    const fetchPromises: Promise<ChallengeDoc | null>[] = [];
    for (const code of participatedCodes) {
      if (!itemsMap.has(code)) {
        fetchPromises.push(getChallenge(code));
      }
    }

    if (fetchPromises.length > 0) {
      const fetched = await Promise.all(fetchPromises);
      if (!isMounted) return;
      fetched.forEach((ch) => {
        if (ch) {
          itemsMap.set(ch.id, { ...ch, relation: 'participated' });
        }
      });
    }

    const merged = Array.from(itemsMap.values());
    merged.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    callback(merged);
  };

  if (uid) {
    const qCreated = query(
      collection(db, 'challenges'),
      where('createdBy', '==', uid)
    );

    unsubCreated = onSnapshot(
      qCreated,
      (snapshot) => {
        createdList = [];
        snapshot.forEach(docSnap => {
          createdList.push(docSnap.data() as ChallengeDoc);
        });
        emitMerged();
      },
      (err) => console.error('[subscribeCreatedChallenges error]', err)
    );

    const qPart = collection(db, 'users', uid, 'participations');
    unsubParticipated = onSnapshot(
      qPart,
      (snapshot) => {
        snapshot.forEach(docSnap => {
          participatedCodes.add(docSnap.id.toUpperCase());
        });
        emitMerged();
      },
      (err) => console.error('[subscribeParticipatedChallenges error]', err)
    );
  } else {
    emitMerged();
  }

  return () => {
    isMounted = false;
    if (unsubCreated) unsubCreated();
    if (unsubParticipated) unsubParticipated();
  };
}

export function subscribeMyChallenges(
  uid: string,
  callback: (challenges: ChallengeDoc[]) => void
) {
  const q = query(
    collection(db, 'challenges'),
    where('createdBy', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ChallengeDoc[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as ChallengeDoc);
      });
      // Sort descending by startsAt on client side to avoid requiring composite indexes
      list.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
      callback(list);
    },
    (err) => {
      console.error('[subscribeMyChallenges error]', err);
    }
  );
}

export async function getChallenge(code: string): Promise<ChallengeDoc | null> {
  const snap = await getDoc(doc(db, 'challenges', code.toUpperCase()));
  if (!snap.exists()) return null;
  return snap.data() as ChallengeDoc;
}

export function subscribeLeaderboard(
  code: string,
  callback: (entries: LeaderboardEntry[]) => void
) {
  const colRef = collection(db, 'challenges', code.toUpperCase(), 'scores');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: LeaderboardEntry[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as LeaderboardEntry);
      });
      // Sort client-side: highest score first, then fastest time first
      list.sort((a, b) => b.score - a.score || a.totalTimeMs - b.totalTimeMs);
      callback(list);
    },
    (err) => {
      console.error('[subscribeLeaderboard error]', err);
    }
  );
}

export async function submitChallengeScore(params: {
  code: string;
  summary: RoundSummary;
  challenge: ChallengeDoc;
  displayName: string;
}): Promise<LeaderboardEntry> {
  // Ensure user is signed in (auto-sign in anonymously if not yet signed in)
  let user = auth.currentUser;
  if (!user) {
    const cred = await signInAnonymously(auth);
    user = cred.user;
  }

  const now = new Date();
  if (params.challenge.endsAt && now.getTime() > new Date(params.challenge.endsAt).getTime()) {
    throw new Error('本場競賽已結束，無法再上傳成績');
  }

  // Calculate score (only first attempts count, wrong=0, correct=100 + bonus)
  const firstAttempts = new Map<string, RoundSummary['results'][number]>();
  for (const r of params.summary.results) {
    if (r.isRetry) continue;
    if (!firstAttempts.has(r.wordId)) firstAttempts.set(r.wordId, r);
  }

  let totalScore = 0;
  let correctCount = 0;
  let totalTimeMs = 0;
  firstAttempts.forEach(r => {
    totalTimeMs += r.responseTimeMs;
    if (r.isCorrect) {
      correctCount++;
      const bonus = Math.max(0, 1 - r.responseTimeMs / Math.max(1, params.challenge.slowMs));
      totalScore += 100 + Math.round(100 * bonus);
    }
  });

  const totalQuestions = firstAttempts.size;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const scoreRef = doc(db, 'challenges', params.code.toUpperCase(), 'scores', user.uid);
  const existingSnap = await getDoc(scoreRef);

  let attempts = 1;
  if (existingSnap.exists()) {
    const existing = existingSnap.data() as LeaderboardEntry;
    attempts = (existing.attempts || 1) + 1;
    // Only overwrite if new score is higher, or equal score with faster time
    if (existing.score > totalScore || (existing.score === totalScore && existing.totalTimeMs <= totalTimeMs)) {
      await setDoc(scoreRef, { attempts }, { merge: true });
      await recordChallengeParticipation(params.code);
      return { ...existing, attempts };
    }
  }

  const newEntry: LeaderboardEntry = {
    uid: user.uid,
    displayName: params.displayName || user.displayName || '挑戰者',
    photoURL: user.photoURL || '',
    score: totalScore,
    accuracy,
    totalTimeMs,
    correctCount,
    totalQuestions,
    attempts,
    updatedAt: serverTimestamp(),
  };

  await setDoc(scoreRef, newEntry);
  await recordChallengeParticipation(params.code);
  return newEntry;
}

/**
 * Merge challenge words into player's local word bank
 */
export function importChallengeWords(
  existingWords: WordItem[],
  challenge: ChallengeDoc
): { words: WordItem[]; wordIds: string[]; addedCount: number } {
  const byWord = new Map(existingWords.map(w => [w.word.toLowerCase(), w]));
  const result = [...existingWords];
  const wordIds: string[] = [];
  let addedCount = 0;
  const now = new Date().toISOString();

  for (const cw of challenge.words) {
    const key = cw.word.trim().toLowerCase();
    const found = byWord.get(key);
    if (found) {
      const idx = result.findIndex(w => w.id === found.id);
      const updated: WordItem = {
        ...found,
        tags: found.tags.includes(challenge.tag) ? found.tags : [...found.tags, challenge.tag],
        translation: found.translation || cw.translation,
        phonetic: found.phonetic || cw.phonetic,
        pos: found.pos || cw.pos,
        exampleEn: found.exampleEn || cw.exampleEn,
        exampleZh: found.exampleZh || cw.exampleZh,
        updatedAt: now,
      };
      result[idx] = updated;
      byWord.set(key, updated);
      wordIds.push(updated.id);
    } else {
      const item = createWordItemFromPreset({
        word: cw.word,
        translation: cw.translation,
        phonetic: cw.phonetic,
        pos: cw.pos,
        exampleEn: cw.exampleEn,
        exampleZh: cw.exampleZh,
        tags: [challenge.tag],
      });
      result.push(item);
      byWord.set(key, item);
      wordIds.push(item.id);
      addedCount++;
    }
  }

  return { words: result, wordIds, addedCount };
}
