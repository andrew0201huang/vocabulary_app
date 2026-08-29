import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Delete, CornerDownLeft, AlertCircle, Sparkles, RotateCcw } from 'lucide-react';
import { useSpeech } from '../../hooks/useSpeech';

interface VoiceInputProps {
  targetWord: string;
  onSubmit: (spelled: string) => void;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  targetWord,
  onSubmit,
  disabled = false,
}) => {
  const [spelledBuffer, setSpelledBuffer] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { isListening, isSpeechRecognitionSupported, startVoiceSpelling, stopVoiceSpelling } = useSpeech();

  // Reset when word changes
  useEffect(() => {
    setSpelledBuffer('');
    setErrorMessage(null);
    stopVoiceSpelling();
  }, [targetWord]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopVoiceSpelling();
    };
  }, []);

  const handleToggleListening = () => {
    if (isListening) {
      stopVoiceSpelling();
    } else {
      setErrorMessage(null);
      const started = startVoiceSpelling(
        (spelled) => {
          const cleaned = spelled.replace(/[^a-zA-Z]/g, '').toLowerCase();
          setSpelledBuffer(cleaned);
        },
        (err) => {
          setErrorMessage(err);
        }
      );
      if (!started && !errorMessage) {
        setErrorMessage('無法啟動語音辨識，請確認是否允許麥克風權限。');
      }
    }
  };

  const handleDeleteLast = () => {
    setSpelledBuffer((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setSpelledBuffer('');
  };

  const handleSubmit = () => {
    if (!spelledBuffer || disabled) return;
    stopVoiceSpelling();
    onSubmit(spelledBuffer);
  };

  const targetLetters = targetWord.split('');

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Speech Recognition Status Banner */}
      {!isSpeechRecognitionSupported && (
        <div className="w-full max-w-md p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>您的瀏覽器可能不支援語音辨識（建議使用 Google Chrome 或 Edge 瀏覽器）。</span>
        </div>
      )}

      {errorMessage && (
        <div className="w-full max-w-md p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={handleToggleListening}
            className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-200 text-xs font-bold shrink-0 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>重試</span>
          </button>
        </div>
      )}

      {/* Target Letter Slot Preview */}
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

      {/* Voice Visualizer / Microphone Action Card */}
      <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col items-center gap-3 text-center shadow-lg">
        {/* Animated Mic Button */}
        <button
          type="button"
          onClick={handleToggleListening}
          disabled={disabled || !isSpeechRecognitionSupported}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-xl ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/30 scale-105'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105'
          }`}
          title={isListening ? '點擊暫停語音辨識' : '點擊開始語音辨識'}
        >
          {isListening ? <Mic className="w-8 h-8 animate-bounce" /> : <MicOff className="w-7 h-7" />}
        </button>

        <div>
          <div className="text-sm font-bold text-slate-200 flex items-center justify-center gap-1.5">
            {isListening ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-rose-300">正在聆聽字母拼讀...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>點擊上方麥克風開始拼讀</span>
              </>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            可逐字唸出字母 (例如：A - P - P - L - E) 或直接唸出單字
          </div>
        </div>

        {/* Real-time Spelled Text */}
        <div className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-center">
          {spelledBuffer ? (
            <span className="font-mono text-xl font-bold text-indigo-300 tracking-widest uppercase">
              {spelledBuffer.split('').join(' ')}
            </span>
          ) : (
            <span className="text-slate-600 text-xs italic">尚未辨識到字母</span>
          )}
        </div>

        {/* Editing Controls */}
        <div className="flex items-center gap-2 w-full pt-1">
          <button
            type="button"
            onClick={handleDeleteLast}
            disabled={!spelledBuffer || disabled}
            className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Delete className="w-3.5 h-3.5" />
            <span>退格 (Back)</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={!spelledBuffer || disabled}
            className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors"
          >
            清空
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!spelledBuffer || disabled}
            className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors shadow-md"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>送出確認</span>
          </button>
        </div>
      </div>
    </div>
  );
};
