import React, { useState, useMemo } from 'react';
import { Search, Plus, ClipboardPaste, BookMarked, Volume2, Edit2, Trash2, RotateCcw, Filter, Sparkles } from 'lucide-react';
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

  // Filter and Sort words
  const filteredWords = useMemo(() => {
    return words.filter(word => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesWord = word.word.toLowerCase().includes(q);
        const matchesTranslation = word.translation.toLowerCase().includes(q);
        const matchesTag = (word.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchesWord && !matchesTranslation && !matchesTag) return false;
      }

      // Familiarity / Due filter
      if (selectedFamiliarity === 'due') {
        if (!isWordDueForReview(word)) return false;
      } else if (selectedFamiliarity !== 'all') {
        if (word.familiarity !== selectedFamiliarity) return false;
      }

      // Tag filter
      if (selectedTag !== 'all') {
        if (!word.tags.includes(selectedTag)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'alpha') {
        return a.word.localeCompare(b.word);
      }
      if (sortBy === 'speed_fast') {
        return (a.bestTimeMs || 999999) - (b.bestTimeMs || 999999);
      }
      if (sortBy === 'speed_slow') {
        return (b.averageTimeMs || 0) - (a.averageTimeMs || 0);
      }
      if (sortBy === 'streak') {
        return (b.consecutiveCorrect || 0) - (a.consecutiveCorrect || 0);
      }
      if (sortBy === 'due') {
        const timeA = a.nextReviewAt ? new Date(a.nextReviewAt).getTime() : 0;
        const timeB = b.nextReviewAt ? new Date(b.nextReviewAt).getTime() : 0;
        return timeA - timeB;
      }
      return 0;
    });
  }, [words, searchQuery, selectedFamiliarity, selectedTag, sortBy]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-5 px-4 py-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>單字庫管理</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300">
              共 {words.length} 字
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            精準記錄拼寫反應時間、連續答對次數與艾賓浩斯複習曲線
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAddWord}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/40 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>單筆新增</span>
          </button>

          <button
            onClick={onBatchAdd}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ClipboardPaste className="w-4 h-4 text-indigo-400" />
            <span>Excel 批次貼上</span>
          </button>

          <button
            onClick={onImportExport}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <BookMarked className="w-4 h-4 text-emerald-400" />
            <span>匯入/匯出題庫</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-3 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋英文單字、中文釋義或標籤..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Tag Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="all">所有標籤分類 ({allTags.length})</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="alpha">依單字字母 A → Z</option>
              <option value="speed_fast">依最佳反應時間 (極速優先)</option>
              <option value="speed_slow">依平均反應時間 (生疏優先)</option>
              <option value="streak">依連續正確次數</option>
              <option value="due">依複習到期時間</option>
            </select>
          </div>
        </div>

        {/* Familiarity Level Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
          {[
            { key: 'all', label: '全部', count: words.length },
            { key: 'due', label: '📅 待複習', count: words.filter(isWordDueForReview).length },
            { key: 'mastered', label: '⚡ 精通', count: words.filter(w => w.familiarity === 'mastered').length },
            { key: 'familiar', label: '✨ 熟練', count: words.filter(w => w.familiarity === 'familiar').length },
            { key: 'learning', label: '⏳ 學習中', count: words.filter(w => w.familiarity === 'learning').length },
            { key: 'struggling', label: '⚠️ 生疏', count: words.filter(w => w.familiarity === 'struggling').length },
            { key: 'new', label: '🌱 新單字', count: words.filter(w => w.familiarity === 'new').length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedFamiliarity(tab.key as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedFamiliarity === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label} <span className="opacity-75 font-mono">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Start Round button for filtered selection */}
      {filteredWords.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-slate-400">
            符合條件單字：<strong className="text-indigo-400 font-mono">{filteredWords.length}</strong> 個
          </span>

          <button
            onClick={() => onStartRoundWithFiltered(filteredWords)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>以此篩選結果開始測驗回合 →</span>
          </button>
        </div>
      )}

      {/* Words Grid / List */}
      {filteredWords.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 flex flex-col items-center gap-3">
          <Filter className="w-8 h-8 text-slate-600" />
          <span>沒有符合條件的單字</span>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedFamiliarity('all');
              setSelectedTag('all');
            }}
            className="text-xs text-indigo-400 underline"
          >
            重設搜尋條件
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredWords.map((word) => {
            const badge = getFamiliarityBadge(word.familiarity);

            return (
              <div
                key={word.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3 shadow-md group"
              >
                {/* Header: Word & Audio */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => speak(word.word)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 transition-colors"
                        title="聆聽發音"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      <div>
                        <span className="font-extrabold text-base sm:text-lg text-slate-100 font-mono tracking-tight">
                          {word.word}
                        </span>
                        {word.pos && (
                          <span className="text-xs font-mono text-indigo-400 ml-1.5">
                            {word.pos}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Translation & Phonetic */}
                  <div className="text-sm font-semibold text-slate-200 mt-2">
                    {word.translation}
                  </div>

                  {word.phonetic && (
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      {word.phonetic}
                    </div>
                  )}

                  {word.exampleEn && (
                    <div className="text-xs text-slate-400/90 italic mt-1.5 border-l-2 border-slate-700 pl-2">
                      "{word.exampleEn}"
                    </div>
                  )}
                </div>

                {/* Performance Metrics Footer */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div className="p-1.5 rounded-lg bg-slate-950/60">
                      <span className="text-[10px] text-slate-500 block">最佳耗時</span>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {formatSeconds(word.bestTimeMs)}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-950/60">
                      <span className="text-[10px] text-slate-500 block">平均耗時</span>
                      <span className="text-xs font-mono font-bold text-indigo-300">
                        {formatSeconds(word.averageTimeMs)}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-950/60">
                      <span className="text-[10px] text-slate-500 block">連對次數</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {word.consecutiveCorrect} 次
                      </span>
                    </div>
                  </div>

                  {/* Tags & Action Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-wrap gap-1">
                      {(word.tags || []).slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onResetWordProgress(word.id)}
                        className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors"
                        title="重設學習進度"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onEditWord(word)}
                        className="p-1 rounded text-slate-500 hover:text-indigo-400 transition-colors"
                        title="編輯單字"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`確定要刪除單字「${word.word}」嗎？`)) {
                            onDeleteWord(word.id);
                          }
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        title="刪除單字"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
