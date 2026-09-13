import React, { useState, useMemo } from 'react';
import { Search, Plus, ClipboardPaste, BookMarked, Volume2, Edit2, Trash2, RotateCcw, Sparkles } from 'lucide-react';
import { WordItem, FamiliarityLevel, AppSettings } from '../../types/vocabulary';
import { getFamiliarityBadge } from '../../utils/textUtils';
import { formatSeconds } from '../../utils/timeUtils';
import { isWordDueForReview } from '../../services/spacedRepetition';
import { useSpeech } from '../../hooks/useSpeech';

interface WordBankViewProps {
  words: WordItem[];
  allTags: string[];
  settings: AppSettings;
  onAddWord: () => void;
  onBatchAdd: () => void;
  onImportExport: () => void;
  onEditWord: (word: WordItem) => void;
  onDeleteWord: (id: string) => void;
  onResetWordProgress: (id: string) => void;
  onStartRoundWithFiltered: (filteredWords: WordItem[]) => void;
}

const FAMILIARITY_TABS: { key: FamiliarityLevel | 'all' | 'due'; label: string }[] = [
  { key: 'all',        label: '全部' },
  { key: 'due',        label: '待複習' },
  { key: 'mastered',   label: '精通' },
  { key: 'familiar',   label: '熟練' },
  { key: 'learning',   label: '學習中' },
  { key: 'struggling', label: '生疏' },
  { key: 'new',        label: '新單字' },
];

const familiarity_style: Record<string, { color: string; bg: string }> = {
  mastered:   { color: 'var(--amber)', bg: 'var(--amber-dim)' },
  familiar:   { color: 'var(--accent)', bg: 'var(--accent-dim)' },
  learning:   { color: 'var(--text-2)', bg: 'var(--surface-2)' },
  struggling: { color: 'var(--red)', bg: 'var(--red-dim)' },
  new:        { color: 'var(--green)', bg: 'var(--green-dim)' },
};

export const WordBankView: React.FC<WordBankViewProps> = ({
  words,
  allTags,
  settings,
  onAddWord,
  onBatchAdd,
  onImportExport,
  onEditWord,
  onDeleteWord,
  onResetWordProgress,
  onStartRoundWithFiltered,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamiliarity, setSelectedFamiliarity] = useState<FamiliarityLevel | 'all' | 'due'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'alpha' | 'speed_fast' | 'speed_slow' | 'streak' | 'due'>('alpha');

  const { speak } = useSpeech(settings);

  const filteredWords = useMemo(() => {
    return words.filter(word => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (
          !word.word.toLowerCase().includes(q) &&
          !word.translation.toLowerCase().includes(q) &&
          !(word.tags || []).some(t => t.toLowerCase().includes(q))
        ) return false;
      }
      if (selectedFamiliarity === 'due') {
        if (!isWordDueForReview(word)) return false;
      } else if (selectedFamiliarity !== 'all') {
        if (word.familiarity !== selectedFamiliarity) return false;
      }
      if (selectedTag !== 'all') {
        if (!word.tags.includes(selectedTag)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'alpha')       return a.word.localeCompare(b.word);
      if (sortBy === 'speed_fast')  return (a.bestTimeMs || 999999) - (b.bestTimeMs || 999999);
      if (sortBy === 'speed_slow')  return (b.averageTimeMs || 0) - (a.averageTimeMs || 0);
      if (sortBy === 'streak')      return (b.consecutiveCorrect || 0) - (a.consecutiveCorrect || 0);
      if (sortBy === 'due') {
        const tA = a.nextReviewAt ? new Date(a.nextReviewAt).getTime() : 0;
        const tB = b.nextReviewAt ? new Date(b.nextReviewAt).getTime() : 0;
        return tA - tB;
      }
      return 0;
    });
  }, [words, searchQuery, selectedFamiliarity, selectedTag, sortBy]);

  const tabCounts = useMemo(() => ({
    all:        words.length,
    due:        words.filter(isWordDueForReview).length,
    mastered:   words.filter(w => w.familiarity === 'mastered').length,
    familiar:   words.filter(w => w.familiarity === 'familiar').length,
    learning:   words.filter(w => w.familiarity === 'learning').length,
    struggling: words.filter(w => w.familiarity === 'struggling').length,
    new:        words.filter(w => w.familiarity === 'new').length,
  }), [words]);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 px-4 py-6">

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
            單字庫
            <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-3)' }}>
              {words.length} 字
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddWord}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-[.97]"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Plus className="w-4 h-4" />
            新增
          </button>
          <button
            onClick={onBatchAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--surface)',
              color: 'var(--text-1)',
              border: '1px solid var(--border)',
            }}
          >
            <ClipboardPaste className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            批次貼上
          </button>
          <button
            onClick={onImportExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--surface)',
              color: 'var(--text-1)',
              border: '1px solid var(--border)',
            }}
          >
            <BookMarked className="w-4 h-4" style={{ color: 'var(--green)' }} />
            匯入/匯出
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="p-4 rounded-xl flex flex-col gap-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜尋單字、釋義或標籤"
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-1)',
              }}
            />
          </div>

          {/* Tag */}
          <select
            value={selectedTag}
            onChange={e => setSelectedTag(e.target.value)}
            className="py-2 px-3 rounded-lg text-sm"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
            }}
          >
            <option value="all">所有標籤</option>
            {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="py-2 px-3 rounded-lg text-sm"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
            }}
          >
            <option value="alpha">字母 A→Z</option>
            <option value="speed_fast">最佳時間</option>
            <option value="speed_slow">平均時間（慢優先）</option>
            <option value="streak">連續正確</option>
            <option value="due">複習到期</option>
          </select>
        </div>

        {/* Familiarity tabs */}
        <div className="flex flex-wrap gap-1.5 pt-2" style={{ borderTop: '1px solid var(--border-soft)' }}>
          {FAMILIARITY_TABS.map(tab => {
            const isActive = selectedFamiliarity === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedFamiliarity(tab.key as typeof selectedFamiliarity)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: isActive ? 'var(--accent)' : 'var(--bg)',
                  color: isActive ? '#fff' : 'var(--text-2)',
                  border: '1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)'),
                }}
              >
                {tab.label}
                <span className="ml-1 opacity-60">{tabCounts[tab.key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Result meta + start round */}
      {filteredWords.length > 0 && (
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>
            {filteredWords.length} 個結果
          </span>
          <button
            onClick={() => onStartRoundWithFiltered(filteredWords)}
            className="flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            以此結果開始測驗
          </button>
        </div>
      )}

      {/* Words list */}
      {filteredWords.length === 0 ? (
        <div
          className="py-16 text-center rounded-xl"
          style={{ border: '1px dashed var(--border)', color: 'var(--text-3)' }}
        >
          <p className="text-sm">沒有符合條件的單字</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedFamiliarity('all'); setSelectedTag('all'); }}
            className="mt-2 text-xs underline"
            style={{ color: 'var(--accent)' }}
          >
            重設搜尋條件
          </button>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          {filteredWords.map((word, index) => {
            const badge = getFamiliarityBadge(word.familiarity);
            const style = familiarity_style[word.familiarity] || { color: 'var(--text-2)', bg: 'var(--surface-2)' };
            const isLast = index === filteredWords.length - 1;

            return (
              <div
                key={word.id}
                className="flex items-center gap-3 px-4 py-3 group transition-colors"
                style={{
                  background: 'var(--surface)',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-soft)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
              >
                {/* Audio */}
                <button
                  onClick={() => speak(word.word)}
                  className="shrink-0 p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-3)' }}
                  title="聆聽發音"
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                {/* Word + translation */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                      {word.word}
                    </span>
                    {word.pos && (
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{word.pos}</span>
                    )}
                    {word.phonetic && (
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{word.phonetic}</span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>
                    {word.translation}
                  </div>
                </div>

                {/* Performance */}
                <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs">
                  <div className="text-right">
                    <div style={{ color: 'var(--amber)' }}>{formatSeconds(word.bestTimeMs)}</div>
                    <div style={{ color: 'var(--text-3)' }}>最佳</div>
                  </div>
                  <div className="text-right">
                    <div style={{ color: 'var(--text-2)' }}>{formatSeconds(word.averageTimeMs)}</div>
                    <div style={{ color: 'var(--text-3)' }}>均速</div>
                  </div>
                </div>

                {/* Familiarity badge */}
                <span
                  className="hidden sm:inline-block shrink-0 text-xs px-2 py-0.5 rounded-md font-medium"
                  style={{ color: style.color, background: style.bg }}
                >
                  {badge.label}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => onResetWordProgress(word.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    title="重設進度"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--amber)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onEditWord(word)}
                    className="p-1.5 rounded-lg transition-colors"
                    title="編輯"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`確定要刪除「${word.word}」？`)) onDeleteWord(word.id); }}
                    className="p-1.5 rounded-lg transition-colors"
                    title="刪除"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
