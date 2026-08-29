import React from 'react';
import { Clock } from 'lucide-react';
import { AppSettings } from '../../types/vocabulary';

interface SpeedGaugeProps {
  elapsedMs: number;
  settings: AppSettings;
  isPaused?: boolean;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({
  elapsedMs,
  settings,
}) => {
  const { lightningMs, goodMs, slowMs } = settings.speedThresholds;
  const seconds = (elapsedMs / 1000).toFixed(2);

  // Speed level & color calculation
  let colorClass = 'text-amber-400 border-amber-500/40 bg-amber-500/10';
  let barColor = 'bg-amber-400';
  let label = '⚡ 極速精通區';

  if (elapsedMs <= lightningMs) {
    colorClass = 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    barColor = 'bg-gradient-to-r from-amber-400 to-amber-500';
    label = '⚡ 極速精通';
  } else if (elapsedMs <= goodMs) {
    colorClass = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    barColor = 'bg-gradient-to-r from-emerald-400 to-emerald-500';
    label = '✨ 熟練反應';
  } else if (elapsedMs <= slowMs) {
    colorClass = 'text-blue-400 border-blue-500/40 bg-blue-500/10';
    barColor = 'bg-gradient-to-r from-blue-400 to-blue-500';
    label = '⏳ 思考中';
  } else {
    colorClass = 'text-rose-400 border-rose-500/40 bg-rose-500/10';
    barColor = 'bg-gradient-to-r from-rose-400 to-rose-600';
    label = '⚠️ 偏生疏 (將重試)';
  }

  // Calculate percentage of slowMs limit for progress gauge (0 to 100%)
  const maxScale = slowMs * 1.3;
  const progressPercent = Math.min(100, Math.max(2, (elapsedMs / maxScale) * 100));

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div className="flex items-center justify-between w-full text-xs font-medium text-slate-400 px-1">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>拼寫耗時</span>
        </div>
        <div className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${colorClass}`}>
          {label}
        </div>
      </div>

      {/* Big Digital Stopwatch */}
      <div className="flex items-baseline justify-center gap-1 font-mono tracking-tight">
        <span className="text-3xl sm:text-4xl font-extrabold text-slate-100 font-['Fira_Code',_monospace]">
          {seconds}
        </span>
        <span className="text-sm font-semibold text-slate-400">秒</span>
      </div>

      {/* Visual Threshold Bar */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
        {/* Threshold Markers */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400/60 z-10"
          style={{ left: `${(lightningMs / maxScale) * 100}%` }}
          title="極速門檻"
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-emerald-400/60 z-10"
          style={{ left: `${(goodMs / maxScale) * 100}%` }}
          title="熟練門檻"
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-400/60 z-10"
          style={{ left: `${(slowMs / maxScale) * 100}%` }}
          title="生疏門檻"
        />

        {/* Animated Fill Bar */}
        <div
          className={`h-full transition-all duration-75 ease-out rounded-full ${barColor}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex justify-between w-full text-[10px] text-slate-500 px-0.5">
        <span>0s (開始)</span>
        <span className="text-amber-400/80">&lt;{(lightningMs / 1000).toFixed(1)}s 精通</span>
        <span className="text-emerald-400/80">&lt;{(goodMs / 1000).toFixed(1)}s 熟練</span>
        <span className="text-rose-400/80">&gt;{(slowMs / 1000).toFixed(1)}s 生疏</span>
      </div>
    </div>
  );
};
