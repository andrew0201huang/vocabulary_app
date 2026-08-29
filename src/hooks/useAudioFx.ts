import { useCallback, useEffect } from 'react';
import { soundEffects } from '../services/soundEffectService';
import { AppSettings } from '../types/vocabulary';

export function useAudioFx(settings?: AppSettings) {
  useEffect(() => {
    if (settings) {
      soundEffects.setEnabled(settings.soundEffectsEnabled ?? true);
    }
  }, [settings?.soundEffectsEnabled]);

  const playCorrect = useCallback((speedFactor: 'fast' | 'normal' | 'slow' = 'normal') => {
    soundEffects.playCorrect(speedFactor);
  }, []);

  const playWrong = useCallback(() => {
    soundEffects.playWrong();
  }, []);

  const playFanfare = useCallback(() => {
    soundEffects.playFanfare();
  }, []);

  const playTick = useCallback(() => {
    soundEffects.playTick();
  }, []);

  return {
    playCorrect,
    playWrong,
    playFanfare,
    playTick,
  };
}
