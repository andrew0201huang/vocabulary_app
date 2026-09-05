import { dbg } from '../utils/debugLogger';

/** Detect iOS (iPhone/iPad — includes Chrome on iOS which is still WebKit) */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export class SpeechService {
  private voices: SpeechSynthesisVoice[] = [];
  private isVoiceLoaded = false;
  private recognition: any = null;
  private isListening = false;
  private _onSpelledUpdate: ((s: string, isFinal: boolean) => void) | null = null;
  private _onError: ((e: string) => void) | null = null;
  private accumulated = '';
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  // iOS audio gate: true once the user has interacted with the page
  public iosAudioUnlocked = false;
  public readonly isIOSDevice: boolean;

  constructor() {
    this.isIOSDevice = isIOS();
    dbg.info('SpeechService init', { ios: this.isIOSDevice, ua: navigator?.userAgent?.slice(0, 60) });
    this.initVoices();
  }

  /**
   * Must be called directly inside a user-gesture handler (tap / click).
   * Plays a zero-duration utterance to "prime" the iOS audio engine.
   * After this, speak() calls from non-gesture contexts also work.
   */
  public unlockIOSAudio(): void {
    if (!this.isIOSDevice || this.iosAudioUnlocked) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    dbg.info('Attempting iOS audio unlock…');
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(' ');  // single space — empty string unreliable
    u.volume = 0.01;
    u.rate = 2;
    u.lang = 'en-US';
    u.onstart = () => dbg.ok('iOS unlock utterance started');
    u.onend = () => {
      this.iosAudioUnlocked = true;
      dbg.ok('iOS audio UNLOCKED');
    };
    u.onerror = (e) => {
      // Some iOS versions still fire onend even after onerror — mark as unlocked anyway
      dbg.warn('iOS unlock utterance error', (e as any).error);
      this.iosAudioUnlocked = true;
    };

    try {
      window.speechSynthesis.speak(u);
      dbg.info('iOS unlock utterance queued');
    } catch (err) {
      dbg.error('iOS unlock speak() threw', String(err));
    }
  }

  // --- TTS / Voices ---
  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => {
      this.voices = window.speechSynthesis.getVoices();
      this.isVoiceLoaded = this.voices.length > 0;
      dbg.info('Voices loaded', this.voices.length);
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

  /**
   * Speak text. On iOS this MUST be called from a user-gesture handler for the
   * first call after page load (handled by unlockIOSAudio). Subsequent calls
   * from useEffect also work once unlocked.
   */
  public speak(
    text: string,
    rate: number = 0.95,
    pitch: number = 1.0,
    voiceName?: string
  ): Promise<void> {
    if (!text) return Promise.resolve();

    dbg.info(`speak("${text}")`, { ios: this.isIOSDevice, unlocked: this.iosAudioUnlocked, rate });

    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        dbg.warn('speechSynthesis not available');
        resolve();
        return;
      }

      // Resume if paused (iOS background/foreground toggle)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        dbg.info('Resumed paused speechSynthesis');
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.5, Math.min(2.0, rate));
      utterance.pitch = Math.max(0.5, Math.min(2.0, pitch));
      utterance.lang = 'en-US';

      // Voice selection
      const voices = this.getAvailableVoices();
      let chosen: SpeechSynthesisVoice | undefined;
      if (voiceName) {
        chosen = voices.find((v) => v.name === voiceName);
      }
      if (!chosen) {
        chosen = voices.find((v) =>
          v.lang.startsWith('en-US') &&
          (v.name.includes('Google') || v.name.includes('Natural') ||
           v.name.includes('Samantha') || v.name.includes('Karen') ||
           v.name.includes('Nicky') || v.name.includes('Daniel') ||
           v.name.includes('Siri'))
        );
      }
      if (!chosen && voices.length > 0) {
        chosen = voices.find(v => v.lang.startsWith('en')) ?? voices[0];
      }
      if (chosen) {
        utterance.voice = chosen;
        dbg.info('Voice', chosen.name);
      } else {
        dbg.warn('No English voice found, using browser default');
      }

      let resolved = false;
      const done = () => { if (!resolved) { resolved = true; clearInterval(stallWatch); resolve(); } };

      utterance.onstart = () => dbg.ok(`speak onstart: "${text}"`);
      utterance.onend   = () => { dbg.ok(`speak onend: "${text}"`); done(); };
      utterance.onerror = (e) => {
        dbg.error(`speak onerror: "${text}"`, (e as any).error);
        done(); // resolve anyway so app doesn't stall
      };

      // iOS stall watchdog: resume if paused mid-utterance
      const stallWatch = setInterval(() => {
        if (!window.speechSynthesis.speaking) { clearInterval(stallWatch); return; }
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          dbg.warn('iOS stall detected — resumed');
        }
      }, 250);

      try {
        window.speechSynthesis.speak(utterance);
        dbg.info('speak() queued');
      } catch (err) {
        dbg.error('speak() threw', String(err));
        clearInterval(stallWatch);
        resolve();
      }
    });
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // --- Web Speech Recognition ---
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
      if (this.isListening) this.startRecognitionSession();
    }, delayMs);
  }

  private startRecognitionSession() {
    if (!this.isListening) return;
    try {
      if (this.recognition) {
        try { this.recognition.onend = null; this.recognition.onerror = null; this.recognition.abort(); } catch { /* ignore */ }
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
          this._onSpelledUpdate?.(this.accumulated + this.parseLettersFromTranscript(interim), false);
        }
      };

      rec.onerror = (event: any) => {
        const err = event.error;
        if (err === 'network' || err === 'no-speech' || err === 'aborted') {
          this.scheduleRestart(500);
          return;
        }
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          this.isListening = false;
          this._onError?.('請允許麥克風權限。');
          return;
        }
        this.scheduleRestart(800);
      };

      rec.onend = () => { this.scheduleRestart(150); };
      rec.start();
    } catch {
      this.scheduleRestart(500);
    }
  }

  public startVoiceSpelling(
    onSpelledUpdate: (spelled: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ): boolean {
    if (typeof window === 'undefined') return false;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      onError?.('不支援語音辨識，請使用 Chrome 或 Edge 瀏覽器。');
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
      try { this.recognition.onend = null; this.recognition.onerror = null; this.recognition.abort(); } catch { /* ignore */ }
      this.recognition = null;
    }
  }

  public getIsListening(): boolean { return this.isListening; }

  public parseLettersFromTranscript(text: string): string {
    const letterMap: Record<string, string> = {
      'ay': 'a', 'eh': 'a', 'alpha': 'a', 'a': 'a',
      'bee': 'b', 'bravo': 'b', 'be': 'b', 'b': 'b',
      'see': 'c', 'sea': 'c', 'charlie': 'c', 'si': 'c', 'c': 'c',
      'dee': 'd', 'delta': 'd', 'd': 'd',
      'ee': 'e', 'echo': 'e', 'e': 'e',
      'ef': 'f', 'foxtrot': 'f', 'f': 'f', 'eff': 'f',
      'gee': 'g', 'golf': 'g', 'g': 'g',
      'aitch': 'h', 'hotel': 'h', 'h': 'h',
      'eye': 'i', 'india': 'i', 'ai': 'i', 'i': 'i',
      'jay': 'j', 'juliet': 'j', 'j': 'j',
      'kay': 'k', 'kilo': 'k', 'k': 'k',
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
    const words = text.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter(Boolean);
    let result = '';
    for (const w of words) {
      if (w.length === 1 && /[a-z]/.test(w)) result += w;
      else if (letterMap[w]) result += letterMap[w];
      else result += w.replace(/[^a-z]/g, '');
    }
    return result;
  }
}

export const speechService = new SpeechService();
