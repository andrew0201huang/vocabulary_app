import { AppSettings } from '../types/vocabulary';

// Read default Client ID from build-time environment variable or fallback to configured project ID
const DEFAULT_CLIENT_ID = '547959897484-dehotni3pme8ng2jog0btirtbrb99qpd.apps.googleusercontent.com';
const ENV_CLIENT_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) || DEFAULT_CLIENT_ID;

export const DEFAULT_SETTINGS: AppSettings = {
  googleClientId: ENV_CLIENT_ID,
  openaiApiKey: '',
  speechRate: 0.95,
  speechPitch: 1.0,
  speechVoiceName: '',
  soundEffectsEnabled: true,
  speedThresholds: {
    lightningMs: 5000,  // < 5.0s (極速精通)
    goodMs: 10000,      // < 10.0s (熟練反應)
    slowMs: 15000,      // > 10.0s ~ 15.0s (生疏重測)
  },
  defaultRoundWordCount: 10,
  defaultInputMode: 'keyboard',
  autoPlayPronunciation: true,
  chineseDelaySeconds: 10, // 預設以生疏重測時間作為聽音延遲
  darkMode: true,
};
