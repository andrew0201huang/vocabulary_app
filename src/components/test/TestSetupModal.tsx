import React, { useState } from 'react';
import { Play, Keyboard, PenTool, Mic, Sparkles, Filter, Volume2, Headphones } from 'lucide-react';
import { Modal } from '../common/Modal';
import { RoundConfig, InputMode, WordItem } from '../../types/vocabulary';
import { isWordDueForReview } from '../../services/spacedRepetition';

interface TestSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRound: (config: RoundConfig) => void;
  words: WordItem[];
  allTags: string[];
}

export const TestSetupModal: React.FC<TestSetupModalProps> = ({
  isOpen,
  onClose,
  onStartRound,
  words,
  allTags,
}) => {
  const [wordCount, setWordCount] = useState<number>(10);
  const [filterMode, setFilterMode] = useState<RoundConfig['filterMode']>('due');
  const [customTag, setCustomTag] = useState<string>(allTags[0] || '');
  const [inputMode, setInputMode] = useState<InputMode>('keyboard');
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(true);
  const [showPhoneticHint, setShowPhoneticHint] = useState<boolean>(false);
  const [chineseDelaySeconds, setChineseDelaySeconds] = useState<number>(10);

  // Calculate word count for each category
  const dueCount = words.filter(isWordDueForReview).length;
  const strugglingCount = words.filter(w => w.familiarity === 'struggling').length;
  const newCount = words.filter(w => w.familiarity === 'new').length;
  const elementaryCount = words.filter(w => w.tags.includes('國小必備')).length;
  const juniorHighCount = words.filter(w => w.tags.includes('國中核心')).length;

  const handleStart = () => {
    onStartRound({
      wordCount,
      filterMode,
      customTag: filterMode === 'custom_tag' ? customTag : undefined,
      inputMode,
      autoPlayAudio,
      showPhoneticHint,
      handwritingSelfGrade: true,
      chineseDelaySeconds,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span>設定測驗回合 (Round Setup)</span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="flex flex-col gap-6">
        {/* Section 1: Word Filter Mode */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>選擇測驗範圍 (Filter Mode)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setFilterMode('due')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                filterMode === 'due'
                  ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/20 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-sm">📅 優先複習 (到期)</div>
              <div className="text-xs text-indigo-400 font-mono mt-1">{dueCount} 個單字</div>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('struggling')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                filterMode === 'struggling'
                  ? 'border-rose-500 bg-rose-950/40 ring-2 ring-rose-500/20 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-sm">⚠️ 生疏/需加強</div>
              <div className="text-xs text-rose-400 font-mono mt-1">{strugglingCount} 個單字</div>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('new')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                filterMode === 'new'
                  ? 'border-cyan-500 bg-cyan-950/40 ring-2 ring-cyan-500/20 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-sm">🌱 全新單字</div>
              <div className="text-xs text-cyan-400 font-mono mt-1">{newCount} 個單字</div>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('elementary')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                filterMode === 'elementary'
                  ? 'border-emerald-500 bg-emerald-950/40 ring-2 ring-emerald-500/20 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-sm">🎒 教育部國小單字</div>
              <div className="text-xs text-emerald-400 font-mono mt-1">{elementaryCount} 個單字</div>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('junior_high')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                filterMode === 'junior_high'
                  ? 'border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/20 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-sm">🏫 國中會考核心</div>
              <div className="text-xs text-blue-400 font-mono mt-1">{juniorHighCount} 個單字</div>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                filterMode === 'all'
                  ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/20 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-sm">📚 全部字庫</div>
              <div className="text-xs text-slate-400 font-mono mt-1">{words.length} 個單字</div>
            </button>
          </div>

          {/* Custom tag dropdown if tags exist */}
          {allTags.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterMode('custom_tag')}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  filterMode === 'custom_tag'
                    ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                依標籤篩選：
              </button>
              <select
                value={customTag}
                onChange={(e) => {
                  setCustomTag(e.target.value);
                  setFilterMode('custom_tag');
                }}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Section 2: Word Count Selection */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            每回合題數 (Word Count)
          </label>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15, 20, 30, 50].map(count => (
              <button
                key={count}
                type="button"
                onClick={() => setWordCount(count)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  wordCount === count
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/30'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {count} 題
              </button>
            ))}
            <button
              type="button"
              onClick={() => setWordCount(999)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                wordCount === 999
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/30'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              全部 (All)
            </button>
          </div>
        </div>

        {/* Section 3: Input Method */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            作答輸入方式 (Input Method)
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setInputMode('keyboard')}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                inputMode === 'keyboard'
                  ? 'border-indigo-500 bg-indigo-950/40 text-white ring-2 ring-indigo-500/20'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Keyboard className="w-5 h-5" />
              <span className="text-xs font-bold">鍵盤打字 (預設)</span>
            </button>

            <button
              type="button"
              onClick={() => setInputMode('handwriting')}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                inputMode === 'handwriting'
                  ? 'border-indigo-500 bg-indigo-950/40 text-white ring-2 ring-indigo-500/20'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <PenTool className="w-5 h-5" />
              <span className="text-xs font-bold">手寫畫布評分</span>
            </button>

            <button
              type="button"
              onClick={() => setInputMode('voice')}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                inputMode === 'voice'
                  ? 'border-indigo-500 bg-indigo-950/40 text-white ring-2 ring-indigo-500/20'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-5 h-5" />
              <span className="text-xs font-bold">語音逐字拼讀</span>
            </button>
          </div>
        </div>

        {/* Section 4: Prompt Options */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-400">題目提示設定 (Prompts)</div>
          
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              出題時自動播放英文發音 (SpeechSynthesis)
            </span>
            <input
              type="checkbox"
              checked={autoPlayAudio}
              onChange={(e) => setAutoPlayAudio(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300">
              顯示 KK / IPA 音標提示 (Visual Hint)
            </span>
            <input
              type="checkbox"
              checked={showPhoneticHint}
              onChange={(e) => setShowPhoneticHint(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
            />
          </label>

          {/* Listening Delay Selector */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                <span>聽音優先模式 (先聽發音，延遲顯示中文釋義)</span>
              </span>
              <span className="text-xs font-mono text-indigo-300 font-bold">
                {chineseDelaySeconds === 0 ? '即時顯示' : `${chineseDelaySeconds} 秒`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { sec: 0, label: '0s (即時)' },
                { sec: 5, label: '5 秒' },
                { sec: 10, label: '10 秒 (推薦)' },
                { sec: 15, label: '15 秒' },
              ].map(({ sec, label }) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setChineseDelaySeconds(sec)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    chineseDelaySeconds === sec
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          type="button"
          onClick={handleStart}
          disabled={words.length === 0}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 text-white font-bold text-base flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/50 transition-all active:scale-[0.99]"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>開始計時測驗</span>
        </button>
      </div>
    </Modal>
  );
};
