// Speech Synthesis & Recognition Service

export class SpeechService {
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private recognition: any = null;
  private isListening: boolean = false;

  constructor() {
    this.initVoices();
    this.initRecognition();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const updateVoices = () => {
      this.voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
      // Prefer Google US English, Samantha, Daniel, or natural voices
      const preferred = this.voices.find(v => 
        v.name.includes('Google') || 
        v.name.includes('Natural') || 
        v.name.includes('Samantha') || 
        v.name.includes('Daniel') ||
        v.lang === 'en-US'
      );
      this.selectedVoice = preferred || this.voices[0] || null;
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
    }
    return this.voices;
  }

  public setVoiceByName(name: string) {
    const v = this.voices.find(item => item.name === name);
    if (v) this.selectedVoice = v;
  }

  /**
   * Pronounce English word with configurable speed and pitch
   */
  public speakWord(word: string, rate: number = 0.95, pitch: number = 1.0): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = Math.max(0.5, Math.min(1.5, rate));
      utterance.pitch = Math.max(0.5, Math.min(1.5, pitch));
      utterance.lang = 'en-US';

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
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
  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 3;
    }
  }

  public isSpeechRecognitionSupported(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /**
   * Start listening for voice spelling
   * Calls onLetter callback when new letters are recognized
   */
  public startVoiceSpelling(
    onSpelledUpdate: (spelledLetters: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ) {
    if (!this.recognition) {
      onError?.('您的瀏覽器不支援語音辨識功能（建議使用 Chrome / Edge 瀏覽器）。');
      return;
    }

    if (this.isListening) {
      this.stopVoiceSpelling();
    }

    let recognizedBuffer = '';

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        if (event.results[i].isFinal) {
          const parsed = this.parseLettersFromTranscript(transcript);
          recognizedBuffer += parsed;
          onSpelledUpdate(recognizedBuffer, true);
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        const interimLetters = this.parseLettersFromTranscript(interim);
        onSpelledUpdate(recognizedBuffer + interimLetters, false);
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        onError?.(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    try {
      this.recognition.start();
    } catch {
      // recognition already started
    }
  }

  public stopVoiceSpelling() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.isListening = false;
    }
  }

  /**
   * Parse letter strings from spoken words / letters
   */
  private parseLettersFromTranscript(text: string): string {
    const letterMap: Record<string, string> = {
      'ay': 'a', 'eh': 'a', 'alpha': 'a',
      'bee': 'b', 'bravo': 'b', 'be': 'b',
      'see': 'c', 'sea': 'c', 'charlie': 'c', 'si': 'c',
      'dee': 'd', 'delta': 'd',
      'ee': 'e', 'echo': 'e',
      'ef': 'f', 'foxtrot': 'f',
      'gee': 'g', 'golf': 'g', 'ji': 'g',
      'aitch': 'h', 'hotel': 'h', 'age': 'h',
      'eye': 'i', 'india': 'i', 'ai': 'i',
      'jay': 'j', 'juliet': 'j',
      'kay': 'k', 'kilo': 'k',
      'el': 'l', 'lima': 'l',
      'em': 'm', 'mike': 'm',
      'en': 'n', 'november': 'n',
      'oh': 'o', 'oscar': 'o',
      'pee': 'p', 'papa': 'p',
      'cue': 'q', 'quebec': 'q',
      'ar': 'r', 'are': 'r', 'romeo': 'r',
      'es': 's', 'sierra': 's',
      'tee': 't', 'tango': 't', 'tea': 't',
      'you': 'u', 'uniform': 'u',
      'vee': 'v', 'victor': 'v',
      'double you': 'w', 'whiskey': 'w',
      'ex': 'x', 'x-ray': 'x',
      'why': 'y', 'yankee': 'y',
      'zee': 'z', 'zed': 'z', 'zulu': 'z',
    };

    // Clean up text
    const words = text.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter(Boolean);
    let result = '';

    for (const w of words) {
      if (w.length === 1 && /[a-z]/.test(w)) {
        result += w;
      } else if (letterMap[w]) {
        result += letterMap[w];
      } else {
        // If user says whole word or phonemes, keep alpha characters
        result += w.replace(/[^a-z]/g, '');
      }
    }

    return result;
  }
}

export const speechService = new SpeechService();
