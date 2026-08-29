import React, { useState, useEffect, useRef } from 'react';
import { CornerDownLeft } from 'lucide-react';

interface KeyboardInputProps {
  targetWord: string;
  onSubmit: (typed: string) => void;
  disabled?: boolean;
  isError?: boolean;
}

export const KeyboardInput: React.FC<KeyboardInputProps> = ({
  targetWord,
  onSubmit,
  disabled = false,
  isError = false,
}) => {
  const [value, setValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and auto-focus when target word changes
  useEffect(() => {
    setValue('');
    if (!disabled) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [targetWord, disabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  };

  // Letter slot visualizer
  const targetLetters = targetWord.split('');

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Visual Letter Slots */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 my-1 max-w-full">
        {targetLetters.map((char, idx) => {
          const typedChar = value[idx] || '';
          const isSpaceOrSpecial = /[^a-zA-Z]/.test(char);

          if (isSpaceOrSpecial) {
            return (
              <div key={idx} className="w-6 flex items-center justify-center text-slate-500 font-mono font-bold">
                {char}
              </div>
            );
          }

          return (
            <div
              key={idx}
              className={`w-9 h-11 sm:w-11 sm:h-13 rounded-lg border-2 flex items-center justify-center font-mono text-xl sm:text-2xl font-bold transition-all duration-150 shadow-sm ${
                typedChar
                  ? 'border-indigo-500 bg-indigo-950/30 text-indigo-200'
                  : idx === value.length
                  ? 'border-indigo-400/80 bg-slate-800/80 text-transparent animate-pulse'
                  : 'border-slate-800 bg-slate-900/60 text-transparent'
              }`}
            >
              {typedChar || '•'}
            </div>
          );
        })}
      </div>

      {/* Actual Input Box */}
      <div className="w-full max-w-md relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase())}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          placeholder="請輸入英文單字..."
          className={`w-full px-5 py-3.5 pr-14 text-center font-mono text-xl sm:text-2xl rounded-xl bg-slate-900/90 border-2 text-slate-100 placeholder-slate-600 focus:outline-none transition-all ${
            isError
              ? 'border-rose-500 bg-rose-950/20 animate-shake'
              : 'border-indigo-600/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20'
          }`}
        />

        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className="absolute right-2 p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white transition-all shadow-md active:scale-95"
          title="送出答案 (Enter)"
        >
          <CornerDownLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="text-xs text-slate-500 flex items-center gap-1.5">
        <span>按</span>
        <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
          Enter ↵
        </kbd>
        <span>立即送出答案</span>
      </div>
    </div>
  );
};
