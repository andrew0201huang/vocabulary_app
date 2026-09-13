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
  let colorVar = '--amber';
  let barColor = '#C47A00';
  let label = '極速精通';

  if (elapsedMs <= lightningMs) {
    colorVar = '--amber';
    barColor = '#C47A00';
    label = '極速精通';
  } else if (elapsedMs <= goodMs) {
    colorVar = '--green';
    barColor = '#1A7F56';
    label = '熟練反應';
  } else if (elapsedMs <= slowMs) {
    colorVar = '--accent';
    barColor = '#3B6FF0';
    label = '思考中';
  } else {
    colorVar = '--red';
    barColor = '#C8364A';
    label = '偏生疏，稍後重試';
  }

  // Calculate percentage of slowMs limit for progress gauge (0 to 100%)
  const maxScale = slowMs * 1.3;
  const progressPercent = Math.min(100, Math.max(2, (elapsedMs / maxScale) * 100));

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div className="flex items-center justify-between w-full text-xs px-1" style={{ color: 'var(--text-3)' }}>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>拼寫耗時</span>
        </div>
        <div
          className="px-2 py-0.5 rounded-full border text-xs font-semibold"
          style={{ color: `var(${colorVar})`, borderColor: `var(${colorVar})`, background: `var(${colorVar}-dim, rgba(0,0,0,0.05))` }}
        >
          {label}
        </div>
      </div>

      {/* Big Digital Stopwatch */}
      <div className="flex items-baseline justify-center gap-1 font-mono tracking-tight">
        <span
          className="text-3xl sm:text-4xl font-extrabold"
          style={{ color: 'var(--text-1)' }}
        >
          {seconds}
        </span>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-3)' }}>秒</span>
      </div>

      {/* Visual Threshold Bar */}
      <div
        className="w-full h-2 rounded-full overflow-hidden relative"
        style={{ background: 'var(--surface-2)' }}
      >
        {/* Threshold Markers */}
        <div
          className="absolute top-0 bottom-0 w-0.5 z-10 opacity-40"
          style={{ left: `${(lightningMs / maxScale) * 100}%`, background: '#C47A00' }}
          title="極速門檻"
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 z-10 opacity-40"
          style={{ left: `${(goodMs / maxScale) * 100}%`, background: '#1A7F56' }}
          title="熟練門檻"
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 z-10 opacity-40"
          style={{ left: `${(slowMs / maxScale) * 100}%`, background: '#3B6FF0' }}
          title="生疏門檻"
        />

        {/* Animated Fill Bar */}
        <div
          className="h-full transition-all duration-75 ease-out rounded-full"
          style={{ width: `${progressPercent}%`, background: barColor }}
        />
      </div>

      <div className="flex justify-between w-full text-[10px] px-0.5" style={{ color: 'var(--text-3)' }}>
        <span>0s</span>
        <span style={{ color: '#C47A00' }}>精通 &lt;{(lightningMs / 1000).toFixed(1)}s</span>
        <span style={{ color: '#1A7F56' }}>熟練 &lt;{(goodMs / 1000).toFixed(1)}s</span>
        <span style={{ color: '#C8364A' }}>生疏 &gt;{(slowMs / 1000).toFixed(1)}s</span>
      </div>
    </div>
  );
};
