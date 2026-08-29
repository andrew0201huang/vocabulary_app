import React from 'react';
import { BarChart3, Zap, Trophy, History } from 'lucide-react';
import { WordItem, RoundSummary, AppSettings } from '../../types/vocabulary';
import { formatSeconds, formatDateTime } from '../../utils/timeUtils';

interface StatsViewProps {
  words: WordItem[];
  roundHistory: RoundSummary[];
  settings: AppSettings;
  onStartRound: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  words,
  roundHistory,
  settings,
  onStartRound,
}) => {
  // Speed distribution buckets
  let fastCount = 0; // < 1.8s
  let goodCount = 0; // 1.8s - 3.5s
  let slowCount = 0; // 3.5s - 6.0s
  let overtimeCount = 0; // > 6.0s

  let masteredCount = 0;
  let familiarCount = 0;
  let learningCount = 0;
  let strugglingCount = 0;
  let newCount = 0;

  let totalPracticed = 0;
  let totalCorrect = 0;
  let fastestRecorded: number | null = null;
  let cumulativeTimeMs = 0;
  let cumulativeWordsCounted = 0;

  words.forEach(w => {
    switch (w.familiarity) {
      case 'mastered': masteredCount++; break;
      case 'familiar': familiarCount++; break;
      case 'learning': learningCount++; break;
      case 'struggling': strugglingCount++; break;
      case 'new': default: newCount++; break;
    }

    if (w.bestTimeMs) {
      if (w.bestTimeMs <= settings.speedThresholds.lightningMs) fastCount++;
      else if (w.bestTimeMs <= settings.speedThresholds.goodMs) goodCount++;
      else if (w.bestTimeMs <= settings.speedThresholds.slowMs) slowCount++;
      else overtimeCount++;

      if (fastestRecorded === null || w.bestTimeMs < fastestRecorded) {
        fastestRecorded = w.bestTimeMs;
      }
    }

    if (w.averageTimeMs) {
      cumulativeTimeMs += w.averageTimeMs;
      cumulativeWordsCounted++;
    }

    totalPracticed += w.totalPracticed || 0;
    totalCorrect += w.totalCorrect || 0;
  });

  const overallAvgTime = cumulativeWordsCounted > 0 ? Math.round(cumulativeTimeMs / cumulativeWordsCounted) : null;
  const overallAccuracy = totalPracticed > 0 ? Math.round((totalCorrect / totalPracticed) * 100) : 0;

  const totalEvaluated = fastCount + goodCount + slowCount + overtimeCount;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 px-4 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            <span>學習統計與反應時間分析</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            以毫秒級反應速度評估單字大腦直覺反射程度
          </p>
        </div>

        <button
          onClick={onStartRound}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950/40 transition-all active:scale-95"
        >
          開始新回合
        </button>
      </div>

      {/* 4 Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">總測驗次數</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1">
            {totalPracticed}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">累計作答單字</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">總體作答正確率</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono mt-1">
            {overallAccuracy}%
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">{totalCorrect} 次正確</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">平均反應時間</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-indigo-300 font-mono mt-1">
            {formatSeconds(overallAvgTime)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">全庫單字平均</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col">
          <span className="text-xs text-slate-400 font-medium">生涯極速紀錄</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono mt-1">
            {formatSeconds(fastestRecorded)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">最佳直覺拼寫</span>
        </div>
      </div>

      {/* Speed Distribution & Familiarity Pyramid in 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Speed Distribution */}
        <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 flex flex-col gap-4 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>反應速度分佈 (Speed Distribution)</span>
            </h2>
            <span className="text-xs text-slate-500">已測驗 {totalEvaluated} 字</span>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-400 font-semibold">⚡ 極速精通 (&lt; 1.8s)</span>
                <span className="font-mono text-slate-300">{fastCount} 字 ({totalEvaluated ? Math.round((fastCount / totalEvaluated) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${totalEvaluated ? (fastCount / totalEvaluated) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-400 font-semibold">✨ 熟練反應 (1.8s - 3.5s)</span>
                <span className="font-mono text-slate-300">{goodCount} 字 ({totalEvaluated ? Math.round((goodCount / totalEvaluated) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{ width: `${totalEvaluated ? (goodCount / totalEvaluated) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-blue-400 font-semibold">⏳ 尚可反應 (3.5s - 6.0s)</span>
                <span className="font-mono text-slate-300">{slowCount} 字 ({totalEvaluated ? Math.round((slowCount / totalEvaluated) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all"
                  style={{ width: `${totalEvaluated ? (slowCount / totalEvaluated) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-rose-400 font-semibold">⚠️ 生疏遲疑 (&gt; 6.0s / 錯誤)</span>
                <span className="font-mono text-slate-300">{overtimeCount} 字 ({totalEvaluated ? Math.round((overtimeCount / totalEvaluated) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all"
                  style={{ width: `${totalEvaluated ? (overtimeCount / totalEvaluated) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Familiarity Breakdown */}
        <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 flex flex-col gap-4 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-indigo-400" />
              <span>記憶熟悉度分級 (Mastery Pyramid)</span>
            </h2>
            <span className="text-xs text-slate-500">總庫存 {words.length} 字</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div>
                <div className="text-xs text-amber-300 font-bold">精通 (Mastered)</div>
                <div className="text-[10px] text-slate-400">極速直覺反射</div>
              </div>
              <span className="text-xl font-bold font-mono text-amber-400">{masteredCount}</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-300 font-bold">熟練 (Familiar)</div>
                <div className="text-[10px] text-slate-400">快速且穩定</div>
              </div>
              <span className="text-xl font-bold font-mono text-emerald-400">{familiarCount}</span>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-300 font-bold">學習中 (Learning)</div>
                <div className="text-[10px] text-slate-400">需稍微回想</div>
              </div>
              <span className="text-xl font-bold font-mono text-blue-400">{learningCount}</span>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
              <div>
                <div className="text-xs text-rose-300 font-bold">生疏 (Struggling)</div>
                <div className="text-[10px] text-slate-400">常超時或拼錯</div>
              </div>
              <span className="text-xl font-bold font-mono text-rose-400">{strugglingCount}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 text-xs text-slate-400 flex items-center justify-between">
            <span>🌱 尚未測驗之新單字</span>
            <span className="font-mono font-bold text-slate-200">{newCount} 個</span>
          </div>
        </div>
      </div>

      {/* Recent Round History */}
      <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 flex flex-col gap-3 shadow-md">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <span>近期測驗紀錄 (Recent Rounds)</span>
        </h2>

        {roundHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            尚無回合紀錄，完成測驗後將在此顯示歷史圖表。
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar">
            {roundHistory.map((round) => (
              <div
                key={round.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center font-mono font-bold text-indigo-300">
                    {round.accuracyRate}%
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">
                      測驗 {round.totalTested} 題 ({round.correctCount} 正確)
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatDateTime(round.startedAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-slate-400">平均耗時：</span>
                    <span className="font-mono font-bold text-indigo-300 ml-1">
                      {formatSeconds(round.averageTimeMs)}
                    </span>
                  </div>

                  {round.fastestTimeMs && (
                    <div className="text-right hidden sm:block">
                      <span className="text-slate-400">最快：</span>
                      <span className="font-mono font-bold text-amber-400 ml-1">
                        {formatSeconds(round.fastestTimeMs)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
