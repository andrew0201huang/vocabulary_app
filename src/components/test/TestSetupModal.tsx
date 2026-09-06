import React, { useState } from 'react';
import { Play, Keyboard, PenTool, Mic, Sparkles, Volume2, Headphones, Filter } from 'lucide-react';
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

  const dueCount = words.filter(isWordDueForReview).length;
  const strugglingCount = words.filter(w => w.familiarity === 'struggling').length;
  const newCount = words.filter(w => w.familiarity === 'new').length;
  const elementaryCount = words.filter(w => w.tags.includes('國小必備')).length;
  const juniorHighCount = words.filter(w => w.tags.includes('國中核心')).length;

  const getTagCount = (tag: string) => words.filter(w => w.tags.includes(tag)).length;

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

  const FILTER_OPTIONS: { mode: RoundConfig['filterMode']; label: string; count: number; color: string }[] = [
    { mode: 'due',        label: '📅 到期複習',   count: dueCount,       color: 'indigo' },
    { mode: 'struggling', label: '⚠️ 需加強',     count: strugglingCount, color: 'rose' },
    { mode: 'new',        label: '🌱 全新單字',   count: newCount,       color: 'cyan' },
    { mode: 'elementary', label: '🎒 國小單字',   count: elementaryCount, color: 'emerald' },
    { mode: 'junior_high',label: '🏫 國中單字',   count: juniorHighCount, color: 'blue' },
    { mode: 'all',        label: '📚 全部字庫',   count: words.length,   color: 'slate' },
  ];

  const COLOR_MAP: Record<string, { sel: string; badge: string }> = {
    indigo:  { sel: 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/20',  badge: 'text-indigo-400' },
    rose:    { sel: 'border-rose-500 bg-rose-950/40 ring-2 ring-rose-500/20',        badge: 'text-rose-400' },
    cyan:    { sel: 'border-cyan-500 bg-cyan-950/40 ring-2 ring-cyan-500/20',        badge: 'text-cyan-400' },
    emerald: { sel: 'border-emerald-500 bg-emerald-950/40 ring-2 ring-emerald-500/20', badge: 'text-emerald-400' },
    blue:    { sel: 'border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/20',        badge: 'text-blue-400' },
    slate:   { sel: 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/20',  badge: 'text-slate-400' },
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span>設定測驗</span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="flex flex-col gap-5">

        {/* 1. Filter */}
        <div>
          <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-2">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            測驗範圍
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FILTER_OPTIONS.map(({ mode, label, count, color }) => {
              const isSelected = filterMode === mode;
              const c = COLOR_MAP[color];
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all text-white ${
                    isSelected
                      ? c.sel
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-sm">{label}</div>
                  <div className={`text-xs font-mono ${isSelected ? c.badge : 'text-slate-500'}`}>
                    {count} 個單字
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom tag filter */}
          {allTags.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterMode('custom_tag')}
                className={`shrink-0 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  filterMode === 'custom_tag'
                    ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                依標籤：
              </button>
              <select
                value={customTag}
                onChange={e => { setCustomTag(e.target.value); setFilterMode('custom_tag'); }}
                className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}（{getTagCount(tag)} 個）</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 2. Word count */}
        <div>
          <div className="text-xs font-bold text-slate-400 mb-2">每回合題數</div>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15, 20, 30, 50].map(count => (
              <button
                key={count}
                type="button"
                onClick={() => setWordCount(count)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  wordCount === count
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
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
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              全部
            </button>
          </div>
        </div>

        {/* 3. Input method */}
        <div>
          <div className="text-xs font-bold text-slate-400 mb-2">輸入方式</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { mode: 'keyboard' as InputMode, icon: <Keyboard className="w-5 h-5" />, label: '鍵盤打字' },
              { mode: 'handwriting' as InputMode, icon: <PenTool className="w-5 h-5" />, label: '手寫畫布' },
              { mode: 'voice' as InputMode, icon: <Mic className="w-5 h-5" />, label: '語音拼讀' },
            ].map(({ mode, icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setInputMode(mode)}
                className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                  inputMode === mode
                    ? 'border-indigo-500 bg-indigo-950/40 text-white ring-2 ring-indigo-500/20'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {icon}
                <span className="text-xs font-bold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Options */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-400">其他設定</div>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              出題自動播放英文發音
            </span>
            <input
              type="checkbox"
              checked={autoPlayAudio}
              onChange={e => setAutoPlayAudio(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300">顯示音標提示</span>
            <input
              type="checkbox"
              checked={showPhoneticHint}
              onChange={e => setShowPhoneticHint(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700"
            />
          </label>

          <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                延遲顯示中文釋義
              </span>
              <span className="text-xs font-mono text-indigo-300 font-bold">
                {chineseDelaySeconds === 0 ? '即時顯示' : `${chineseDelaySeconds} 秒`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { sec: 0, label: '即時' },
                { sec: 5, label: '5 秒' },
                { sec: 10, label: '10 秒' },
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

        {/* Start */}
        <button
          type="button"
          onClick={handleStart}
          disabled={words.length === 0}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 text-white font-bold text-base flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/50 transition-all active:scale-[0.99]"
        >
          <Play className="w-5 h-5 fill-current" />
          開始測驗
        </button>
      </div>
    </Modal>
  );
};
