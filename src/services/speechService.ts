export class SpeechService {
  private voices: SpeechSynthesisVoice[] = [];
  private isVoiceLoaded = false;
  private recognition: any = null;
  private isListening = false;
  private networkRetryCount = 0;
  private maxNetworkRetries = 2;

  constructor() {
    this.initVoices();
  }

  // --- Web Speech API Synthesis (TTS) ---
  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const load = () => {
      this.voices = window.speechSynthesis.getVoices();
      this.isVoiceLoaded = this.voices.length > 0;
    };

    load();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    if (!this.isVoiceLoaded || this.voices.length === 0) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return this.voices.filter((v) => v.lang.startsWith('en'));
  }

  public speak(
    text: string,
    rate: number = 0.95,
    pitch: number = 1.0,
    voiceName?: string
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.5, Math.min(2.0, rate));
      utterance.pitch = Math.max(0.5, Math.min(2.0, pitch));
      utterance.lang = 'en-US';

      const voices = this.getAvailableVoices();
      if (voiceName) {
        const selectedVoice = voices.find((v) => v.name === voiceName);
        if (selectedVoice) utterance.voice = selectedVoice;
      } else {
        const preferred = voices.find(
          (v) =>
            v.lang.startsWith('en-US') &&
            (v.name.includes('Google') ||
              v.name.includes('Natural') ||
              v.name.includes('Samantha') ||
              v.name.includes('Karen'))
        );
        if (preferred) utterance.voice = preferred;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // --- Web Speech API Recognition for Voice Spelling ---
  public isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /**
   * Start listening for voice spelling
   */
  public startVoiceSpelling(
    onSpelledUpdate: (spelledLetters: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ): boolean {
    if (typeof window === 'undefined') return false;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      onError?.('您的瀏覽器不支援語音辨識（建議使用 Google Chrome 或 Edge 瀏覽器）。');
      return false;
    }

    this.stopVoiceSpelling();
    this.isListening = true;
    this.networkRetryCount = 0;

    const runRecognitionSession = () => {
      if (!this.isListening) return;

      try {
        const recognition = new SpeechRecognitionClass();
        // Use non-continuous chunks to prevent Chrome WebSocket network stream timeout
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 3;

        let sessionAccumulated = '';

        recognition.onresult = (event: any) => {
          this.networkRetryCount = 0; // Reset on successful result
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0]?.transcript?.toLowerCase() || '';
            if (event.results[i].isFinal) {
              const parsed = this.parseLettersFromTranscript(transcript);
              sessionAccumulated += parsed;
              onSpelledUpdate(sessionAccumulated, true);
            } else {
              interim += transcript;
            }
          }

          if (interim) {
            const interimParsed = this.parseLettersFromTranscript(interim);
            onSpelledUpdate(sessionAccumulated + interimParsed, false);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech Recognition event error:', event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            this.isListening = false;
            onError?.('請允許瀏覽器麥克風權限以進行語音拼讀。');
          } else if (event.error === 'network') {
            if (this.networkRetryCount < this.maxNetworkRetries && this.isListening) {
              this.networkRetryCount++;
              setTimeout(() => {
                if (this.isListening) runRecognitionSession();
              }, 600);
            } else {
              this.isListening = false;
              onError?.('無法連線至 Google 語音辨識伺服器 (Network Error)。建議檢查網路或改用鍵盤輸入。');
            }
          } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            onError?.(`語音辨識提示：${event.error}`);
          }
        };

        recognition.onend = () => {
          // If still listening, seamlessly restart next speech chunk
          if (this.isListening) {
            setTimeout(() => {
              if (this.isListening) {
                runRecognitionSession();
              }
            }, 100);
          }
        };

        this.recognition = recognition;
        recognition.start();
      } catch (err: any) {
        console.error('Failed to start recognition instance:', err);
        if (this.isListening) {
          onError?.(err.message || '語音辨識啟動失敗');
          this.isListening = false;
        }
      }
    };

    runRecognitionSession();
    return true;
  }

  public stopVoiceSpelling() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.stop();
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Parse letter strings from spoken words / letters
   */
  public parseLettersFromTranscript(text: string): string {
    const letterMap: Record<string, string> = {
      'ay': 'a', 'eh': 'a', 'alpha': 'a', 'a': 'a', 'hey': 'a',
      'bee': 'b', 'bravo': 'b', 'be': 'b', 'b': 'b',
      'see': 'c', 'sea': 'c', 'charlie': 'c', 'si': 'c', 'c': 'c',
      'dee': 'd', 'delta': 'd', 'd': 'd',
      'ee': 'e', 'echo': 'e', 'e': 'e', 'he': 'e',
      'ef': 'f', 'foxtrot': 'f', 'f': 'f', 'eff': 'f',
      'gee': 'g', 'golf': 'g', 'ji': 'g', 'g': 'g',
      'aitch': 'h', 'hotel': 'h', 'age': 'h', 'h': 'h', 'eight': 'h',
      'eye': 'i', 'india': 'i', 'ai': 'i', 'i': 'i',
      'jay': 'j', 'juliet': 'j', 'j': 'j',
      'kay': 'k', 'kilo': 'k', 'k': 'k', 'ok': 'k',
      'el': 'l', 'lima': 'l', 'l': 'l', 'ell': 'l',
      'em': 'm', 'mike': 'm', 'm': 'm',
      'en': 'n', 'november': 'n', 'n': 'n', 'and': 'n',
      'oh': 'o', 'oscar': 'o', 'o': 'o',
      'pee': 'p', 'papa': 'p', 'p': 'p', 'pea': 'p',
      'cue': 'q', 'quebec': 'q', 'q': 'q', 'queue': 'q',
      'ar': 'r', 'are': 'r', 'romeo': 'r', 'r': 'r', 'our': 'r',
      'es': 's', 'sierra': 's', 's': 's', 'yes': 's',
      'tee': 't', 'tango': 't', 'tea': 't', 't': 't',
      'you': 'u', 'uniform': 'u', 'u': 'u',
      'vee': 'v', 'victor': 'v', 'v': 'v', 'we': 'v',
      'double you': 'w', 'whiskey': 'w', 'w': 'w', 'double-u': 'w',
      'ex': 'x', 'x-ray': 'x', 'x': 'x',
      'why': 'y', 'yankee': 'y', 'y': 'y',
      'zee': 'z', 'zed': 'z', 'zulu': 'z', 'z': 'z',
    };

    // Clean up text
    const words = text
      .toLowerCase()
      .replace(/[^a-z\s-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    let result = '';

    for (const w of words) {
      if (w.length === 1 && /[a-z]/.test(w)) {
        result += w;
      } else if (letterMap[w]) {
        result += letterMap[w];
      } else {
        // If user spells or says the word, take alpha letters
        result += w.replace(/[^a-z]/g, '');
      }
    }

    return result;
  }
}

export const speechService = new SpeechService();
