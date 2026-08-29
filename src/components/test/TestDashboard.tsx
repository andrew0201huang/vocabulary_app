import React from 'react';
import { Zap, Play, RotateCcw, Sparkles, BookOpen, Clock, ShieldCheck, Flame } from 'lucide-react';
import { WordItem, RoundSummary, AppSettings, RoundConfig } from '../../types/vocabulary';
import { formatSeconds, formatRelativeTime } from '../../utils/timeUtils';
import { isWordDueForReview } from '../../services/spacedRepetition';

interface TestDashboardProps {
  words: WordItem[];
  roundHistory: RoundSummary[];
  settings: AppSettings;
  onOpenSetupModal: () => void;
  onQuickStart: (config: RoundConfig) => void;
  onGoToBank: () => void;
}

export const TestDashboard: React.FC<TestDashboardProps> = ({
  words,
  roundHistory,
  settings,
  onOpenSetupModal,
  onQuickStart,
}) => {
  const dueWords = words.filter(isWordDueForReview);
  const strugglingWords = words.filter(w => w.familiarity === 'struggling');

  const latestRound = roundHistory[0];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 px-4 py-6 animate-fade-in">
      {/* Hero Action Card */}
      <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-indigo-900/60 via-slate-900 to-slate-950 border border-indigo-500/40 shadow-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Background glow & decorative elements */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 -top-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col gap-2 text-center md:text-left z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold w-fit mx-auto md:mx-0">
            <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>拼寫反應速度 × 艾賓浩斯記憶法</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            以「反應速度」決定單字熟練度
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm max-w-lg">
            不只看拼寫對錯，以毫秒精準計時。拼寫極快 (&lt; 1.8s) 判定為精通並延長複習週期；生疏或遲疑單字自動進入動態複習池。
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-2 justify-center md:justify-start text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Google Drive 雲端同步</span>
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>支援語音/手寫/打字</span>
            </span>
          </div>
        </div>

        {/* Start Button & Quick Config */}
        <div className="flex flex-col gap-3 w-full md:w-auto z-10">
          <button
            onClick={onOpenSetupModal}
            className="w-full md:w-56 py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-950/60 transition-all transform active:scale-95 group"
          >
            <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
            <span>開始測驗回合</span>
          </button>

          {dueWords.length > 0 && (
            <button
              onClick={() => onQuickStart({
                wordCount: 10,
                filterMode: 'due',
                inputMode: settings.defaultInputMode || 'keyboard',
                autoPlayAudio: true,
                showPhoneticHint: false,
                handwritingSelfGrade: true,
                chineseDelaySeconds: settings.chineseDelaySeconds ?? 10,
              })}
              className="w-full md:w-56 py-2.5 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <span>快速複習 {dueWords.length} 個到期字 ➔</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Quick Launch Modes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Mode 1: Due review */}
        <div
          onClick={() => onQuickStart({
            wordCount: 15,
            filterMode: 'due',
            inputMode: 'keyboard',
            autoPlayAudio: true,
            showPhoneticHint: false,
            handwritingSelfGrade: true,
            chineseDelaySeconds: settings.chineseDelaySeconds ?? 10,
          })}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300">
              {dueWords.length} 字待複習
            </span>
          </div>

          <div>
            <h3 className="font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
              📅 艾賓浩斯到期複習
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              優先複習到達間隔記憶週期的單字，強化長期記憶。
            </p>
          </div>

          <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            開始複習 →
          </span>
        </div>

        {/* Mode 2: Struggling Focus */}
        <div
          onClick={() => onQuickStart({
            wordCount: 10,
            filterMode: 'struggling',
            inputMode: 'keyboard',
            autoPlayAudio: true,
            showPhoneticHint: false,
            handwritingSelfGrade: true,
            chineseDelaySeconds: settings.chineseDelaySeconds ?? 10,
          })}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
              <RotateCcw className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300">
              {strugglingWords.length} 字需加強
            </span>
          </div>

          <div>
            <h3 className="font-bold text-slate-100 group-hover:text-rose-300 transition-colors">
              ⚠️ 生疏遲疑單字衝刺
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              專注練習先前反應時間過長或答錯的生疏單字。
            </p>
          </div>

          <span className="text-xs text-rose-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            加強練習 →
          </span>
        </div>

        {/* Mode 3: MOE Vocabulary Focus */}
        <div
          onClick={() => onQuickStart({
            wordCount: 15,
            filterMode: 'elementary',
            inputMode: 'keyboard',
            autoPlayAudio: true,
            showPhoneticHint: false,
            handwritingSelfGrade: true,
            chineseDelaySeconds: settings.chineseDelaySeconds ?? 10,
          })}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300">
              教育部官方題庫
            </span>
          </div>

          <div>
            <h3 className="font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
              🎒 國小 / 國中單字實戰
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              針對教育部基礎與會考核心字彙進行拼寫速度鍛鍊。
            </p>
          </div>

          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            進入挑戰 →
          </span>
        </div>
      </div>

      {/* Mini Stats Summary & Last Round Card */}
      {latestRound && (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400">上一回合表現</div>
              <div className="text-sm font-bold text-slate-200">
                正確率 <span className="text-emerald-400 font-mono">{latestRound.accuracyRate}%</span> · 平均反應時間 <span className="text-indigo-300 font-mono">{formatSeconds(latestRound.averageTimeMs)}</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {formatRelativeTime(latestRound.endedAt)}
          </div>
        </div>
      )}
    </div>
  );
};
