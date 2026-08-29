import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, Square, CornerDownLeft, AlertCircle, RotateCcw, Delete,
  CheckCircle2, Loader2, Radio
} from 'lucide-react';
import { AppSettings } from '../../types/vocabulary';

interface WhisperVoiceInputProps {
  targetWord: string;
  settings: AppSettings;
  onSubmit: (spelled: string) => void;
  onSwitchToKeyboard?: () => void;
  disabled?: boolean;
}

type RecordState = 'idle' | 'recording' | 'uploading' | 'done' | 'error';

export const WhisperVoiceInput: React.FC<WhisperVoiceInputProps> = ({
  targetWord,
  settings,
  onSubmit,
  onSwitchToKeyboard,
  disabled = false,
}) => {
  const [state, setState] = useState<RecordState>('idle');
  const [spelledBuffer, setSpelledBuffer] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Reset when word changes
  useEffect(() => {
    stopRecording();
    stopStream();
    setState('idle');
    setSpelledBuffer('');
    setErrorMsg(null);
    setElapsedSec(0);
  }, [targetWord]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      stopStream();
    };
  }, []);

  // Auto-start on mount (when component first appears)
  useEffect(() => {
    if (!disabled && settings.openaiApiKey) {
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseLettersFromWhisperText = (text: string): string => {
    const letterMap: Record<string, string> = {
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

    const cleaned = text.toLowerCase().replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleaned.split(/\s+/);

    // First check: if input is a single word matching the target, treat as direct spelling
    const singleWord = cleaned.replace(/\s/g, '');
    if (/^[a-z]+$/.test(singleWord) && singleWord.length >= 2) {
      // Check if it could be the word itself (direct spelling attempt)
      // e.g. user said "apple" → "apple"
      return singleWord;
    }

    // Otherwise parse letter-by-letter
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
  };

  const uploadToWhisper = useCallback(async (audioBlob: Blob) => {
    setState('uploading');
    setErrorMsg(null);

    try {
      const formData = new FormData();
      // Convert to mp4 if supported, fallback to webm
      const mimeType = audioBlob.type || 'audio/webm';
      const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      formData.append('file', new File([audioBlob], `recording.${ext}`, { type: mimeType }));
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('prompt', `Spell the word letter by letter, for example: A P P L E. Or say the word directly.`);

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.openaiApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('OpenAI API 金鑰無效，請在設定中更新正確的金鑰。');
        }
        throw new Error(errBody?.error?.message || `OpenAI API 錯誤 (${response.status})`);
      }

      const data = await response.json();
      const rawText = data.text?.trim() || '';
      const parsed = parseLettersFromWhisperText(rawText);
      setSpelledBuffer(parsed);
      setState('done');
    } catch (err: any) {
      console.error('Whisper upload error:', err);
      setState('error');
      setErrorMsg(err.message || '上傳辨識失敗，請重試。');
    }
  }, [settings.openaiApiKey]);

  const startRecording = useCallback(async () => {
    setSpelledBuffer('');
    setErrorMsg(null);
    setElapsedSec(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Try to use a format Whisper accepts
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 100) {
          await uploadToWhisper(blob);
        } else {
          setState('idle');
        }
      };

      recorder.start(100); // collect chunks every 100ms
      setState('recording');

      // Timer
      timerRef.current = setInterval(() => {
        setElapsedSec(s => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Mic error:', err);
      setState('error');
      if (err.name === 'NotAllowedError') {
        setErrorMsg('請允許瀏覽器使用麥克風（設定 → 隱私權 → 麥克風）。');
      } else {
        setErrorMsg(err.message || '無法存取麥克風，請確認裝置設定。');
      }
    }
  }, [uploadToWhisper, stopStream]);

  const handleDeleteLast = () => setSpelledBuffer(prev => prev.slice(0, -1));
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
          const typedChar = spelledBuffer[idx] || '';
          return (
            <div
              key={idx}
              className={`w-9 h-11 sm:w-11 sm:h-13 rounded-lg border-2 flex items-center justify-center font-mono text-xl sm:text-2xl font-bold transition-all ${
                typedChar
                  ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200 shadow-md'
                  : 'border-slate-800 bg-slate-900/60 text-transparent'
              }`}
            >
              {typedChar || '•'}
            </div>
          );
        })}
      </div>

      {/* Main Recording Card */}
      <div className="w-full max-w-md rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col items-center gap-3 p-5 text-center">

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 text-sm font-semibold">
          {state === 'idle' && <span className="text-slate-400">點擊麥克風開始錄音</span>}
          {state === 'recording' && (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-rose-300">錄音中... {elapsedSec}s</span>
              <span className="text-xs text-slate-400">(說完後點 ■ 送出辨識)</span>
            </>
          )}
          {state === 'uploading' && (
            <>
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <span className="text-indigo-300">Whisper AI 辨識中...</span>
            </>
          )}
          {state === 'done' && spelledBuffer && (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">辨識完成！請確認後送出</span>
            </>
          )}
          {state === 'error' && (
            <span className="text-rose-300">辨識失敗</span>
          )}
        </div>

        {/* Big Action Button */}
        <div className="flex items-center gap-3">
          {state === 'recording' ? (
            <button
              type="button"
              onClick={stopRecording}
              disabled={disabled}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-950/40 animate-pulse ring-4 ring-rose-500/30 transition-all active:scale-95"
              title="停止錄音並上傳辨識"
            >
              <Square className="w-7 h-7 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled || state === 'uploading'}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
                state === 'uploading'
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105'
              }`}
              title="開始錄音"
            >
              {state === 'uploading'
                ? <Loader2 className="w-8 h-8 animate-spin" />
                : <Mic className="w-8 h-8" />
              }
            </button>
          )}

          {/* Waveform decoration */}
          {state === 'recording' && (
            <div className="flex items-center gap-0.5">
              {[3, 5, 8, 6, 4, 7, 5, 3].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-rose-400 opacity-80 animate-pulse"
                  style={{ height: `${h * 4}px`, animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-indigo-500" />
          <span>逐字唸 <strong className="text-slate-300">A P P L E</strong> 或直接唸出單字，錄音後自動送 Whisper AI 辨識</span>
        </div>

        {/* Recognized text display */}
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

        {/* Error banner */}
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
          <button type="button" onClick={handleDeleteLast}
            disabled={!spelledBuffer || disabled}
            className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5">
            <Delete className="w-3.5 h-3.5" />
            <span>退格</span>
          </button>

          <button type="button" onClick={handleClear}
            disabled={!spelledBuffer || disabled}
            className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold text-slate-400 hover:text-rose-400">
            清空
          </button>

          <button type="button" onClick={handleSubmit}
            disabled={!spelledBuffer || disabled}
            className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md">
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>送出確認</span>
          </button>
        </div>
      </div>
    </div>
  );
};
