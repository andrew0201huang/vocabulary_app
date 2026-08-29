import { AppSettings } from '../types/vocabulary';

// Read default Client ID from build-time environment variable (e.g. VITE_GOOGLE_CLIENT_ID)
const ENV_CLIENT_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) || '';

export const DEFAULT_SETTINGS: AppSettings = {
  // App-level default Google Client ID
  googleClientId: ENV_CLIENT_ID,
  speechRate: 0.95,
  speechPitch: 1.0,
  speechVoiceName: '',
  soundEffectsEnabled: true,
  speedThresholds: {
    lightningMs: 1800, // < 1.8s is Mastered / Lightning
    goodMs: 3500,      // < 3.5s is Good / Familiar
    slowMs: 6000,      // > 6.0s is Struggling
  },
  defaultRoundWordCount: 10,
  defaultInputMode: 'keyboard',
  autoPlayPronunciation: true,
  darkMode: true,
};
