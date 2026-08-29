/**
 * OfflineVoiceInput – unified record-then-recognize UI for all three engines:
 *   - browser: MediaRecorder + concurrent Web Speech API (no upload needed)
 *   - google:  MediaRecorder → upload to Google Cloud Speech-to-Text v1
 *   - openai:  MediaRecorder → upload to OpenAI Whisper-1
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, Square, CornerDownLeft, AlertCircle, RotateCcw, Delete,
  CheckCircle2, Loader2, Radio,
} from 'lucide-react';
import { AppSettings, VoiceSpeechEngine } from '../../types/vocabulary';

interface OfflineVoiceInputProps {
  targetWord: string;
  settings: AppSettings;
  onSubmit: (spelled: string) => void;
  onSwitchToKeyboard?: () => void;
  disabled?: boolean;
}

type RecordState = 'idle' | 'recording' | 'uploading' | 'done' | 'error';

// ── Letter parsing ────────────────────────────────────────────────────────────
const LETTER_MAP: Record<string, string> = {
  'a': 'a', 'ay': 'a', 'alpha': 'a', 'eh': 'a',
  'b': 'b', 'bee': 'b', 'be': 'b', 'bravo': 'b',
  'c': 'c', 'see': 'c', 'sea': 'c', 'charlie': 'c',
  'd': 'd', 'dee': 'd', 'delta': 'd',
  'e': 'e', 'ee': 'e', 'echo': 'e',
  'f': 'f', 'ef': 'f', 'eff': 'f', 'foxtrot': 'f',
  'g': 'g', 'gee': 'g', 'golf': 'g',
  'h': 'h', 'aitch': 'h', 'hotel': 'h',
  'i': 'i', 'eye': 'i', 'india': 'i', 'ai': 'i',
  'j': 'j', 'jay': 'j', 'juliet': 'j',
  'k': 'k', 'kay': 'k', 'kilo': 'k',
  'l': 'l', 'el': 'l', 'ell': 'l', 'lima': 'l',
  'm': 'm', 'em': 'm', 'mike': 'm',
  'n': 'n', 'en': 'n', 'november': 'n',
  'o': 'o', 'oh': 'o', 'oscar': 'o',
  'p': 'p', 'pee': 'p', 'pea': 'p', 'papa': 'p',
  'q': 'q', 'cue': 'q', 'queue': 'q', 'quebec': 'q',
  'r': 'r', 'ar': 'r', 'are': 'r', 'romeo': 'r', 'our': 'r',
  's': 's', 'es': 's', 'sierra': 's',
  't': 't', 'tee': 't', 'tea': 't', 'tango': 't',
  'u': 'u', 'you': 'u', 'uniform': 'u',
  'v': 'v', 'vee': 'v', 'victor': 'v',
  'w': 'w', 'whiskey': 'w', 'double you': 'w', 'double-u': 'w',
  'x': 'x', 'ex': 'x', 'x-ray': 'x',
  'y': 'y', 'why': 'y', 'yankee': 'y',
  'z': 'z', 'zee': 'z', 'zed': 'z', 'zulu': 'z',
};

function parseLetters(text: string): string {
  const cleaned = text.toLowerCase().replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  const asWord = cleaned.replace(/\s/g, '');
  // Whole word attempt (no spaces, multi-char)
  if (/^[a-z]{2,}$/.test(asWord) && !cleaned.includes(' ')) return asWord;
  return cleaned.split(/\s+/).map(w => {
    if (w.length === 1 && /[a-z]/.test(w)) return w;
    if (LETTER_MAP[w]) return LETTER_MAP[w];
    return w.replace(/[^a-z]/g, '');
  }).join('');
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Engine metadata ───────────────────────────────────────────────────────────
const ENGINE_LABEL: Record<VoiceSpeechEngine, string> = {
  browser: '🌐 Chrome 語音辨識',
  google:  '🔵 Google Speech API',
  openai:  '🟣 OpenAI Whisper',
};

const ENGINE_STATUS_LABEL: Record<VoiceSpeechEngine, string> = {
  browser: '辨識中（瀏覽器）...',
  google:  'Google Speech 辨識中...',
  openai:  'Whisper AI 辨識中...',
};

// ── Cloud API callers ─────────────────────────────────────────────────────────

async function recognizeWithGoogle(audioBlob: Blob, apiKey: string): Promise<string> {
  const mimeType = audioBlob.type || 'audio/webm';
  const encoding = mimeType.includes('mp4') ? 'MP3'
    : mimeType.includes('ogg') ? 'OGG_OPUS'
    : 'WEBM_OPUS';
  const audioBase64 = await blobToBase64(audioBlob);
  const body = {
    config: {
      encoding,
      languageCode: 'en-US',
      maxAlternatives: 1,
      model: 'latest_short',
      enableAutomaticPunctuation: false,
      speechContexts: [{ phrases: Object.keys(LETTER_MAP), boost: 15 }],
    },
    audio: { content: audioBase64 },
  };
  const res = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(apiKey)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 400 && (err?.error?.message as string)?.includes('API_KEY')) {
      throw new Error('Google Speech API 金鑰無效，請在設定中確認。');
    }
    throw new Error(err?.error?.message || `Google Speech API 錯誤 (${res.status})`);
  }
  const data = await res.json();
  return parseLetters(data.results?.[0]?.alternatives?.[0]?.transcript || '');
}

async function recognizeWithOpenAI(audioBlob: Blob, apiKey: string): Promise<string> {
  const mimeType = audioBlob.type || 'audio/webm';
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
  const formData = new FormData();
  formData.append('file', new File([audioBlob], `rec.${ext}`, { type: mimeType }));
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  formData.append('prompt', 'Spell the word letter by letter, e.g. A P P L E. Or say the word directly.');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('OpenAI API 金鑰無效，請在設定中更新。');
    throw new Error(err?.error?.message || `OpenAI Whisper API 錯誤 (${res.status})`);
  }
  const data = await res.json();
  return parseLetters(data.text?.trim() || '');
}

// ── Browser Web Speech recognition (runs concurrently during recording) ───────
function recognizeWithBrowser(): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error('您的瀏覽器不支援語音辨識，請改用 Chrome 或 Edge。'));
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.maxAlternatives = 3;

    let accumulated = '';

    rec.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const t = event.results[i][0]?.transcript?.toLowerCase() || '';
          accumulated += parseLetters(t);
        }
      }
    };

    rec.onerror = (event: any) => {
      const err = event.error;
      // Ignore transient errors; network errors during stop are fine
      if (err === 'no-speech' || err === 'aborted') return;
      if (err === 'network') return; // will resolve with whatever we have
      if (err === 'not-allowed') {
        reject(new Error('請允許麥克風權限。'));
      }
    };

    rec.onend = () => {
      resolve(accumulated);
    };

    // Start recognition using the same stream from MediaRecorder
    // Web Speech API always opens its own mic channel — we just start it alongside recording
    try {
      rec.start();
    } catch {
      reject(new Error('無法啟動語音辨識。'));
    }

    // Expose a stop handle on the promise itself (called when MediaRecorder.onstop fires)
    (recognizeWithBrowser as any)._stopCurrentRec = () => {
      try { rec.stop(); } catch { /* ignore */ }
    };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export const WhisperVoiceInput: React.FC<OfflineVoiceInputProps> = ({
  targetWord,
  settings,
  onSubmit,
  onSwitchToKeyboard,
  disabled = false,
}) => {
  const engine = settings.voiceSpeechEngine || 'browser';
  const [state, setState] = useState<RecordState>('idle');
  const [spelledBuffer, setSpelledBuffer] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [rawTranscript, setRawTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Promise resolve/reject for browser recognition
  const browserRecPromiseRef = useRef<Promise<string> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    stopTimer();
    // Stop browser Web Speech recognition first (before MediaRecorder.stop → onstop)
    if ((recognizeWithBrowser as any)._stopCurrentRec) {
      (recognizeWithBrowser as any)._stopCurrentRec();
      (recognizeWithBrowser as any)._stopCurrentRec = null;
    }
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
  }, []);

  // Reset on word change
  useEffect(() => {
    stopRecording();
    stopStream();
    setState('idle');
    setSpelledBuffer('');
    setErrorMsg(null);
    setElapsedSec(0);
    setRawTranscript('');
    browserRecPromiseRef.current = null;
  }, [targetWord]);

  useEffect(() => () => { stopRecording(); stopStream(); }, []);

  // Auto-start on mount
  useEffect(() => {
    if (!disabled) startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processAudio = useCallback(async (blob: Blob, browserRecPromise: Promise<string> | null) => {
    setState('uploading');
    setErrorMsg(null);
    try {
      let result = '';
      if (engine === 'google' && settings.googleSpeechApiKey) {
        result = await recognizeWithGoogle(blob, settings.googleSpeechApiKey);
      } else if (engine === 'openai' && settings.openaiApiKey) {
        result = await recognizeWithOpenAI(blob, settings.openaiApiKey);
      } else if (engine === 'browser' && browserRecPromise) {
        // Browser mode: just await the already-running Web Speech recognition result
        result = await browserRecPromise;
      } else {
        throw new Error('尚未設定 API 金鑰，請前往設定頁面填入。');
      }
      setRawTranscript(result);
      setSpelledBuffer(result);
      setState('done');
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message || '辨識失敗，請重試。');
    }
  }, [engine, settings.googleSpeechApiKey, settings.openaiApiKey]);

  const startRecording = useCallback(async () => {
    setSpelledBuffer('');
    setErrorMsg(null);
    setRawTranscript('');
    setElapsedSec(0);
    chunksRef.current = [];
    browserRecPromiseRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';

      // For browser mode: start Web Speech recognition in parallel BEFORE MediaRecorder
      let browserProm: Promise<string> | null = null;
      if (engine === 'browser') {
        browserProm = recognizeWithBrowser();
        browserRecPromiseRef.current = browserProm;
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 100 || engine === 'browser') {
          await processAudio(blob, browserRecPromiseRef.current);
        } else {
          setState('idle');
        }
      };

      recorder.start(100);
      setState('recording');
      timerRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
    } catch (err: any) {
      setState('error');
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? '請允許瀏覽器存取麥克風（設定 → 隱私權 → 麥克風）。'
          : err.message || '無法存取麥克風，請確認裝置設定。'
      );
    }
  }, [engine, processAudio, stopStream]);

  const handleDeleteLast = () => setSpelledBuffer(p => p.slice(0, -1));
  const handleClear = () => setSpelledBuffer('');
  const handleSubmit = () => {
    if (!spelledBuffer || disabled) return;
    onSubmit(spelledBuffer);
  };

  const targetLetters = targetWord.split('');

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Letter slot preview */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 my-1 max-w-full">
        {targetLetters.map((_, idx) => {
          const ch = spelledBuffer[idx] || '';
          return (
            <div key={idx} className={`w-9 h-11 sm:w-11 sm:h-13 rounded-lg border-2 flex items-center justify-center font-mono text-xl sm:text-2xl font-bold transition-all ${
              ch ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200 shadow-md'
                 : 'border-slate-800 bg-slate-900/60 text-transparent'
            }`}>
              {ch || '•'}
            </div>
          );
        })}
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col items-center gap-3 p-5 text-center">

        {/* Engine badge */}
        <div className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold tracking-wide">
          {ENGINE_LABEL[engine]}
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 text-sm font-semibold min-h-[22px]">
          {state === 'idle' && <span className="text-slate-400">點擊麥克風開始錄音</span>}
          {state === 'recording' && (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-rose-300">
                錄音中... {elapsedSec}s
                {engine === 'browser' && <span className="text-xs text-slate-400 ml-1">（說完點 ■ 停止）</span>}
                {engine !== 'browser' && <span className="text-xs text-slate-400 ml-1">（說完後點 ■ 送出辨識）</span>}
              </span>
            </>
          )}
          {state === 'uploading' && (
            <>
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <span className="text-indigo-300">{ENGINE_STATUS_LABEL[engine]}</span>
            </>
          )}
          {state === 'done' && spelledBuffer && (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">辨識完成！確認後送出</span>
            </>
          )}
          {state === 'error' && <span className="text-rose-300">辨識失敗</span>}
        </div>

        {/* Big button */}
        <div className="flex items-center gap-3">
          {state === 'recording' ? (
            <button type="button" onClick={stopRecording} disabled={disabled}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl animate-pulse ring-4 ring-rose-500/30 transition-all active:scale-95"
              title="停止錄音">
              <Square className="w-7 h-7 fill-current" />
            </button>
          ) : (
            <button type="button" onClick={startRecording}
              disabled={disabled || state === 'uploading'}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
                state === 'uploading'
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105'
              }`}
              title="開始錄音">
              {state === 'uploading'
                ? <Loader2 className="w-8 h-8 animate-spin" />
                : <Mic className="w-8 h-8" />
              }
            </button>
          )}

          {/* Waveform */}
          {state === 'recording' && (
            <div className="flex items-center gap-0.5">
              {[3, 6, 8, 5, 7, 4, 6, 3].map((h, i) => (
                <div key={i} className="w-1 rounded-full bg-rose-400 opacity-80 animate-pulse"
                  style={{ height: `${h * 4}px`, animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-indigo-500 shrink-0" />
          <span>逐字唸 <strong className="text-slate-300">A · P · P · L · E</strong> 或直接念出完整單字</span>
        </div>

        {/* Recognized text */}
        <div className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-center">
          {spelledBuffer ? (
            <span className="font-mono text-xl font-bold text-indigo-300 tracking-widest uppercase">
              {spelledBuffer.split('').join(' ')}
            </span>
          ) : (
            <span className="text-slate-600 text-xs italic">
              {state === 'uploading' ? '辨識中...' : '尚未辨識到字母'}
            </span>
          )}
        </div>

        {/* Raw transcript debug */}
        {rawTranscript && state === 'done' && (
          <div className="w-full text-[10px] text-slate-600 text-left px-1">
            語音原文：「{rawTranscript}」
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="w-full p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-500/20">
              {onSwitchToKeyboard && (
                <button type="button" onClick={onSwitchToKeyboard}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold">
                  切換鍵盤打字
                </button>
              )}
              <button type="button" onClick={startRecording}
                className="px-2.5 py-1 rounded-lg bg-rose-600/40 hover:bg-rose-600 text-rose-100 text-xs font-bold flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                <span>重新錄音</span>
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full">
          <button type="button" onClick={handleDeleteLast} disabled={!spelledBuffer || disabled}
            className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5">
            <Delete className="w-3.5 h-3.5" /><span>退格</span>
          </button>
          <button type="button" onClick={handleClear} disabled={!spelledBuffer || disabled}
            className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold text-slate-400 hover:text-rose-400">
            清空
          </button>
          <button type="button" onClick={handleSubmit} disabled={!spelledBuffer || disabled}
            className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md">
            <CornerDownLeft className="w-3.5 h-3.5" /><span>送出確認</span>
          </button>
        </div>
      </div>
    </div>
  );
};
