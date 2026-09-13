import React, { useState } from 'react';
import { Play, Sparkles, Volume2, Headphones, Filter } from 'lucide-react';
import { Modal } from '../common/Modal';
import { RoundConfig, WordItem } from '../../types/vocabulary';
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
  const inputMode = 'keyboard' as const; // 手寫/語音入口暫時隱藏
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

  // Light-theme color map: border hex, bg rgba, label text color, count text color
  const COLOR_MAP: Record<string, { border: string; bg: string; label: string; count: string }> = {
    indigo:  { border: '#3B6FF0', bg: 'rgba(59,111,240,0.06)',  label: '#1a3a8f', count: '#3B6FF0' },
    rose:    { border: '#e11d48', bg: 'rgba(225,29,72,0.05)',   label: '#9f1239', count: '#e11d48' },
    cyan:    { border: '#0891b2', bg: 'rgba(8,145,178,0.05)',   label: '#155e75', count: '#0891b2' },
    emerald: { border: '#059669', bg: 'rgba(5,150,105,0.05)',   label: '#065f46', count: '#059669' },
    blue:    { border: '#2563eb', bg: 'rgba(37,99,235,0.05)',   label: '#1e40af', count: '#2563eb' },
    slate:   { border: '#64748b', bg: 'rgba(100,116,139,0.05)', label: '#334155', count: '#64748b' },
  };

  const FILTER_OPTIONS: { mode: RoundConfig['filterMode']; label: string; count: number; color: string }[] = [
    { mode: 'due',        label: '到期複習', count: dueCount,        color: 'indigo' },
    { mode: 'struggling', label: '需加強',   count: strugglingCount, color: 'rose' },
    { mode: 'new',        label: '全新單字', count: newCount,        color: 'cyan' },
    { mode: 'elementary', label: '國小單字', count: elementaryCount, color: 'emerald' },
    { mode: 'junior_high',label: '國中單字', count: juniorHighCount, color: 'blue' },
    { mode: 'all',        label: '全部字庫', count: words.length,    color: 'slate' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <span>設定測驗</span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="flex flex-col gap-5">

        {/* 1. 測驗範圍 */}
        <div>
          <div className="text-xs font-semibold flex items-center gap-1.5 mb-2.5"
            style={{ color: 'var(--text-2)' }}>
            <Filter className="w-3.5 h-3.5" />
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
                  style={isSelected ? {
                    borderColor: c.border,
                    borderWidth: '1.5px',
                    backgroundColor: c.bg,
                    color: c.label,
                  } : {
                    borderColor: 'var(--border)',
                    borderWidth: '1px',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-2)',
                  }}
                  className="p-3 rounded-xl border text-left flex flex-col gap-1 transition-all"
                >
                  <div className="font-semibold text-sm">{label}</div>
                  <div
                    className="text-xs font-mono font-semibold"
                    style={{ color: isSelected ? c.count : 'var(--text-3)' }}
                  >
                    {count} 字
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
                className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border transition-all font-semibold"
                style={filterMode === 'custom_tag' ? {
                  backgroundColor: 'var(--accent)',
                  borderColor: 'var(--accent)',
                  color: '#fff',
                } : {
                  backgroundColor: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-2)',
                }}
              >
                依標籤
              </button>
              <select
                value={customTag}
                onChange={e => { setCustomTag(e.target.value); setFilterMode('custom_tag'); }}
                className="flex-1 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-1)',
                }}
              >
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}（{getTagCount(tag)} 個）</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 2. 每回合題數 */}
        <div>
          <div className="text-xs font-semibold mb-2.5" style={{ color: 'var(--text-2)' }}>
            每回合題數
          </div>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15, 20, 30, 50, 999].map(count => (
              <button
                key={count}
                type="button"
                onClick={() => setWordCount(count)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
                style={wordCount === count ? {
                  backgroundColor: 'var(--accent)',
                  borderColor: 'var(--accent)',
                  color: '#fff',
                } : {
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-2)',
                }}
              >
                {count === 999 ? '全部' : `${count}`}
              </button>
            ))}
          </div>
        </div>

        {/* 3. 其他設定 */}
        <div
          className="p-4 rounded-xl flex flex-col gap-3"
          style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <div className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>其他設定</div>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
              <Volume2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              出題自動播放英文發音
            </span>
            <input
              type="checkbox"
              checked={autoPlayAudio}
              onChange={e => setAutoPlayAudio(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: 'var(--accent)' }}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm" style={{ color: 'var(--text-1)' }}>顯示音標提示</span>
            <input
              type="checkbox"
              checked={showPhoneticHint}
              onChange={e => setShowPhoneticHint(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: 'var(--accent)' }}
            />
          </label>

          <div className="pt-2 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
                <Headphones className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
                延遲顯示中文釋義
              </span>
              <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent)' }}>
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
                  className="py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all"
                  style={chineseDelaySeconds === sec ? {
                    borderColor: 'var(--accent)',
                    backgroundColor: 'var(--accent-dim)',
                    color: 'var(--accent)',
                  } : {
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-2)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 開始按鈕 */}
        <button
          type="button"
          onClick={handleStart}
          disabled={words.length === 0}
          className="w-full py-3.5 rounded-xl disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Play className="w-4 h-4 fill-current" />
          開始測驗
        </button>
      </div>
    </Modal>
  );
};
