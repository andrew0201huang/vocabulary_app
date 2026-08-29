import { AppSettings } from '../types/vocabulary';

// Read default Client ID from build-time environment variable or fallback to configured project ID
const DEFAULT_CLIENT_ID = '547959897484-dehotni3pme8ng2jog0btirtbrb99qpd.apps.googleusercontent.com';
const ENV_CLIENT_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) || DEFAULT_CLIENT_ID;

export const DEFAULT_SETTINGS: AppSettings = {
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
  chineseDelaySeconds: 10,
  darkMode: true,
};
