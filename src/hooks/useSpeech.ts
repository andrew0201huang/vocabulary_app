import { useState, useEffect, useCallback } from 'react';
import { speechService } from '../services/speechService';
import { AppSettings } from '../types/vocabulary';

export function useSpeech(settings?: AppSettings) {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    setIsSupported(speechService.isSpeechRecognitionSupported());
    setVoices(speechService.getVoices());
  }, []);

  const speak = useCallback(async (word: string, customRate?: number, customPitch?: number) => {
    if (!word) return;
    setIsSpeaking(true);
    const rate = customRate ?? settings?.speechRate ?? 0.95;
    const pitch = customPitch ?? settings?.speechPitch ?? 1.0;
    try {
      await speechService.speakWord(word, rate, pitch);
    } finally {
      setIsSpeaking(false);
    }
  }, [settings]);

  const startVoiceSpelling = useCallback((
    onUpdate: (spelled: string, isFinal: boolean) => void,
    onError?: (err: string) => void
  ) => {
    setIsListening(true);
    speechService.startVoiceSpelling(
      (spelled, isFinal) => {
        onUpdate(spelled, isFinal);
      },
      (err) => {
        setIsListening(false);
        onError?.(err);
      }
    );
  }, []);

  const stopVoiceSpelling = useCallback(() => {
    speechService.stopVoiceSpelling();
    setIsListening(false);
  }, []);

  return {
    speak,
    isSpeaking,
    voices,
    isListening,
    isSpeechRecognitionSupported: isSupported,
    startVoiceSpelling,
    stopVoiceSpelling,
  };
}
