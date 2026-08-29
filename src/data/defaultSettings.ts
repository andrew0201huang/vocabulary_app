import { AppSettings } from '../types/vocabulary';

export const DEFAULT_SETTINGS: AppSettings = {
  // Can be filled by user or default client ID
  googleClientId: '',
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
