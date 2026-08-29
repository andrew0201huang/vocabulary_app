import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Play, BookOpen, Volume2, Flame, RotateCcw } from 'lucide-react';
import { RoundSummary, AppSettings } from '../../types/vocabulary';
import { formatSeconds } from '../../utils/timeUtils';
import { getSpeedCategory } from '../../services/spacedRepetition';
import { getFamiliarityBadge } from '../../utils/textUtils';
import { useSpeech } from '../../hooks/useSpeech';

interface RoundResultViewProps {
  summary: RoundSummary;
  settings: AppSettings;
  onRetryStruggling: (wordIds: string[]) => void;
  onStartNewRound: () => void;
  onGoToBank: () => void;
}

export const RoundResultView: React.FC<RoundResultViewProps> = ({
  summary,
  settings,
  onRetryStruggling,
  onStartNewRound,
  onGoToBank,
}) => {
  const { speak } = useSpeech(settings);

  // Trigger confetti burst on mount if accuracy is good
  useEffect(() => {
    if (summary.accuracyRate >= 70) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#a855f7', '#38bdf8', '#fbbf24'],
        });
      } catch {
        // ignore
      }
    }
  }, [summary.accuracyRate]);

  const hasStrugglingWords = summary.strugglingWordIds.length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 px-4 py-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-indigo-900/40 via-slate-900 to-slate-950 border border-indigo-500/30 text-center flex flex-col items-center gap-3 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-amber-300 shadow-xl shadow-indigo-950/50">
          <Trophy className="w-9 h-9" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          回合測驗完成！
        </h2>
        <p className="text-sm text-slate-300">
          所有學習進度與拼寫反應時間已自動計算並同步至本地及雲端。
        </p>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mt-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
            <span className="text-xs text-slate-400 font-medium">準確率</span>
            <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
              {summary.accuracyRate}%
            </span>
            <span className="text-[10px] text-slate-500">
              {summary.correctCount} / {summary.totalTested} 正確
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
            <span className="text-xs text-slate-400 font-medium">平均反應時間</span>
            <span className="text-2xl font-extrabold text-indigo-300 font-mono mt-1">
              {formatSeconds(summary.averageTimeMs)}
            </span>
            <span className="text-[10px] text-slate-500">
              {summary.averageTimeMs < 2000 ? '⚡ 極速反應' : '穩定進步中'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
            <span className="text-xs text-slate-400 font-medium">最快反應速度</span>
            <span className="text-2xl font-extrabold text-amber-400 font-mono mt-1">
              {formatSeconds(summary.fastestTimeMs)}
            </span>
            <span className="text-[10px] text-slate-500">最佳單字紀錄</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
            <span className="text-xs text-slate-400 font-medium">已精通晉升</span>
            <span className="text-2xl font-extrabold text-cyan-400 font-mono mt-1">
              +{summary.masteredWordIds.length}
            </span>
            <span className="text-[10px] text-slate-500">晉升為精通單字</span>
          </div>
        </div>
      </div>

      {/* Tested Word Breakdown List */}
      <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 flex flex-col gap-3 shadow-lg">
        <div className="flex items-center justify-between px-1">
          <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Flame className="w-4 h-4 text-indigo-400" />
            <span>本次回合單字詳細反應清單 ({summary.results.length})</span>
          </div>
          <span className="text-xs text-slate-500">點擊單字可重聽發音</span>
        </div>

        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
          {summary.results.map((res, index) => {
            const speedCat = getSpeedCategory(res.responseTimeMs, settings);
            const badge = getFamiliarityBadge(res.newFamiliarity);

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => speak(res.word)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="聆聽發音"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 font-mono">{res.word}</span>
                      {res.isRetry && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">
                          複習
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{res.translation}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${speedCat.badgeBg}`}>
                    {formatSeconds(res.responseTimeMs)}
                  </span>

                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {hasStrugglingWords && (
          <button
            onClick={() => onRetryStruggling(summary.strugglingWordIds)}
            className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-rose-200 font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>複習本回生疏單字 ({summary.strugglingWordIds.length})</span>
          </button>
        )}

        <button
          onClick={onStartNewRound}
          className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 transition-all active:scale-[0.98]"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>再來一回合 (New Round)</span>
        </button>

        <button
          onClick={onGoToBank}
          className="w-full sm:w-auto py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <BookOpen className="w-4 h-4" />
          <span>返回題庫</span>
        </button>
      </div>
    </div>
  );
};
