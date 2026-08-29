export class SpeechService {
  private voices: SpeechSynthesisVoice[] = [];
  private isVoiceLoaded = false;
  private recognition: any = null;
  private isListening = false;
  private _onSpelledUpdate: ((s: string, isFinal: boolean) => void) | null = null;
  private _onError: ((e: string) => void) | null = null;
  private accumulated = '';
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  // iOS Safari requires a silent utterance triggered inside a user gesture to unlock audio
  private iosUnlocked = false;
  private pendingSpeakArgs: { text: string; rate: number; pitch: number; voiceName?: string; resolve: () => void } | null = null;

  constructor() {
    this.initVoices();
    this.setupIOSUnlock();
  }

  /** Call once on first user interaction (touch/click) to unlock audio on iOS */
  public unlockAudio() {
    if (this.iosUnlocked) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    // Speak an empty utterance to unlock
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    u.onend = () => {
      this.iosUnlocked = true;
      // If there's a queued speak, play it now
      if (this.pendingSpeakArgs) {
        const args = this.pendingSpeakArgs;
        this.pendingSpeakArgs = null;
        this.speakInternal(args.text, args.rate, args.pitch, args.voiceName).then(args.resolve);
      }
    };
    window.speechSynthesis.speak(u);
  }

  private setupIOSUnlock() {
    if (typeof window === 'undefined') return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isIOS) {
      this.iosUnlocked = true; // Non-iOS: no unlock needed
      return;
    }
    // On iOS: unlock on first user gesture anywhere on page
    const unlock = () => {
      this.unlockAudio();
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('click', unlock, true);
    };
    window.addEventListener('touchstart', unlock, { passive: true, capture: true });
    window.addEventListener('click', unlock, { passive: true, capture: true });
  }

  // --- Web Speech API Synthesis (TTS) ---
  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
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

  private speakInternal(
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
      // iOS: resume suspended context (page visibility change can suspend it)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.5, Math.min(2.0, rate));
      utterance.pitch = Math.max(0.5, Math.min(2.0, pitch));
      utterance.lang = 'en-US';
      const voices = this.getAvailableVoices();
      if (voiceName) {
        const selected = voices.find((v) => v.name === voiceName);
        if (selected) utterance.voice = selected;
      } else {
        const preferred = voices.find(
          (v) =>
            v.lang.startsWith('en-US') &&
            (v.name.includes('Google') ||
              v.name.includes('Natural') ||
              v.name.includes('Samantha') ||
              v.name.includes('Karen') ||
              v.name.includes('Nicky') ||      // iOS voice
              v.name.includes('Daniel'))        // iOS voice
        );
        if (preferred) utterance.voice = preferred;
      }
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);

      // iOS workaround: speechSynthesis sometimes stalls silently — resume it periodically
      const resumeTimer = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(resumeTimer);
          return;
        }
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 250);
      utterance.onend = () => { clearInterval(resumeTimer); resolve(); };
      utterance.onerror = () => { clearInterval(resumeTimer); resolve(); };
    });
  }

  public speak(
    text: string,
    rate: number = 0.95,
    pitch: number = 1.0,
    voiceName?: string
  ): Promise<void> {
    if (!text) return Promise.resolve();
    // iOS: if not yet unlocked by user gesture, queue the speak and resolve immediately (silent)
    if (!this.iosUnlocked) {
      return new Promise<void>((resolve) => {
        this.pendingSpeakArgs = { text, rate, pitch, voiceName, resolve };
      });
    }
    return this.speakInternal(text, rate, pitch, voiceName);
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // --- Web Speech API Recognition ---
  public isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  private clearRestartTimer() {
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  private createRecognitionInstance() {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return null;

    const rec = new SpeechRecognitionClass();
    // Use short-session mode: Chrome closes the WebSocket stream after ~10s of silence
    // with continuous=true. We keep continuous=true but handle the `onend` restart
    // ourselves, which is more reliable than chunked sessions.
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 3;
    return rec;
  }

  private scheduleRestart(delayMs = 200) {
    this.clearRestartTimer();
    if (!this.isListening) return;
    this.restartTimer = setTimeout(() => {
      if (this.isListening) {
        this.startRecognitionSession();
      }
    }, delayMs);
  }

  private startRecognitionSession() {
    if (!this.isListening) return;

    try {
      // Always abort previous instance cleanly
      if (this.recognition) {
        try {
          this.recognition.onend = null;
          this.recognition.onerror = null;
          this.recognition.abort();
        } catch { /* ignore */ }
        this.recognition = null;
      }

      const rec = this.createRecognitionInstance();
      if (!rec) return;
      this.recognition = rec;

      rec.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0]?.transcript?.toLowerCase() || '';
          if (event.results[i].isFinal) {
            const parsed = this.parseLettersFromTranscript(transcript);
            this.accumulated += parsed;
            this._onSpelledUpdate?.(this.accumulated, true);
          } else {
            interim += transcript;
          }
        }
        if (interim) {
          const interimParsed = this.parseLettersFromTranscript(interim);
          this._onSpelledUpdate?.(this.accumulated + interimParsed, false);
        }
      };

      rec.onerror = (event: any) => {
        const err = event.error;
        // "network" and "no-speech" are transient; silently restart
        if (err === 'network' || err === 'no-speech' || err === 'aborted') {
          this.scheduleRestart(500);
          return;
        }
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          this.isListening = false;
          this._onError?.('請允許瀏覽器麥克風權限以進行語音拼讀。');
          return;
        }
        // Other errors: try to restart silently once
        this.scheduleRestart(800);
      };

      rec.onend = () => {
        // Chrome ends the session naturally; restart if we're still active
        this.scheduleRestart(150);
      };

      rec.start();
    } catch (err: any) {
      // InvalidStateError can happen if start() is called on an already-started instance
      this.scheduleRestart(500);
    }
  }

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
    this.accumulated = '';
    this._onSpelledUpdate = onSpelledUpdate;
    this._onError = onError || null;

    this.startRecognitionSession();
    return true;
  }

  public stopVoiceSpelling() {
    this.isListening = false;
    this._onSpelledUpdate = null;
    this._onError = null;
    this.accumulated = '';
    this.clearRestartTimer();

    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.abort();
      } catch { /* ignore */ }
      this.recognition = null;
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

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
      'en': 'n', 'november': 'n', 'n': 'n',
      'oh': 'o', 'oscar': 'o', 'o': 'o',
      'pee': 'p', 'papa': 'p', 'p': 'p', 'pea': 'p',
      'cue': 'q', 'quebec': 'q', 'q': 'q', 'queue': 'q',
      'ar': 'r', 'are': 'r', 'romeo': 'r', 'r': 'r', 'our': 'r',
      'es': 's', 'sierra': 's', 's': 's',
      'tee': 't', 'tango': 't', 'tea': 't', 't': 't',
      'you': 'u', 'uniform': 'u', 'u': 'u',
      'vee': 'v', 'victor': 'v', 'v': 'v',
      'double you': 'w', 'whiskey': 'w', 'w': 'w', 'double-u': 'w',
      'ex': 'x', 'x-ray': 'x', 'x': 'x',
      'why': 'y', 'yankee': 'y', 'y': 'y',
      'zee': 'z', 'zed': 'z', 'zulu': 'z', 'z': 'z',
    };

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
        result += w.replace(/[^a-z]/g, '');
      }
    }
    return result;
  }
}

export const speechService = new SpeechService();
