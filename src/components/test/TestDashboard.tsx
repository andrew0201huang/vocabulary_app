import React from 'react';
import { Play, Clock, RotateCcw, BookOpen } from 'lucide-react';
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
  const dueWords       = words.filter(isWordDueForReview);
  const strugglingWords = words.filter(w => w.familiarity === 'struggling');
  const latestRound    = roundHistory[0];

  const defaultConfig = (override: Partial<RoundConfig>): RoundConfig => ({
    wordCount: 15,
    filterMode: 'all',
    inputMode: settings.defaultInputMode || 'keyboard',
    autoPlayAudio: true,
    showPhoneticHint: false,
    handwritingSelfGrade: true,
    chineseDelaySeconds: settings.chineseDelaySeconds ?? 10,
    ...override,
  });

  const modes = [
    {
      icon: <Clock className="w-4 h-4" />,
      label: '到期複習',
      desc: '優先練習到達間隔記憶週期的單字',
      count: dueWords.length,
      countLabel: '個待複習',
      accentVar: '--accent',
      dimVar: '--accent-dim',
      onClick: () => onQuickStart(defaultConfig({ wordCount: 15, filterMode: 'due' })),
    },
    {
      icon: <RotateCcw className="w-4 h-4" />,
      label: '生疏衝刺',
      desc: '反應時間長或答錯次數多的單字',
      count: strugglingWords.length,
      countLabel: '個需加強',
      accentVar: '--red',
      dimVar: '--red-dim',
      onClick: () => onQuickStart(defaultConfig({ wordCount: 10, filterMode: 'struggling' })),
    },
    {
      icon: <BookOpen className="w-4 h-4" />,
      label: '教育部字彙',
      desc: '國小 / 國中核心字彙拼寫速度訓練',
      count: null,
      countLabel: '官方題庫',
      accentVar: '--green',
      dimVar: '--green-dim',
      onClick: () => onQuickStart(defaultConfig({ wordCount: 15, filterMode: 'elementary' })),
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 px-4 py-10 animate-fade-in">

      {/* Hero: due count + primary action */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div
            className="text-[64px] sm:text-[80px] font-bold leading-none"
            style={{ color: 'var(--accent)', letterSpacing: '-0.04em' }}
          >
            {dueWords.length}
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
            {dueWords.length === 0
              ? `字庫共 ${words.length} 字，今日已全部複習完畢`
              : `個單字待複習，共 ${words.length} 字`}
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <button
            onClick={onOpenSetupModal}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[.97]"
            style={{
              background: 'var(--accent)',
              color: '#fff',
            }}
          >
            <Play className="w-4 h-4 fill-current" />
            開始測驗回合
          </button>

          {dueWords.length > 0 && (
            <button
              onClick={() => onQuickStart(defaultConfig({ wordCount: Math.min(10, dueWords.length), filterMode: 'due' }))}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[.97]"
              style={{
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                border: '1px solid var(--accent-border)',
              }}
            >
              快速複習 {Math.min(10, dueWords.length)} 個到期字
            </button>
          )}
        </div>
      </div>

      {/* Last round summary */}
      {latestRound && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
            上一回合：
            <span className="font-semibold" style={{ color: 'var(--green)' }}>
              {' '}{latestRound.accuracyRate}% 正確
            </span>
            <span className="mx-1.5" style={{ color: 'var(--text-3)' }}>/</span>
            <span className="font-semibold" style={{ color: 'var(--amber)' }}>
              均 {formatSeconds(latestRound.averageTimeMs)}
            </span>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>
            {formatRelativeTime(latestRound.endedAt)}
          </div>
        </div>
      )}

      {/* Mode picker */}
      <div>
        <div
          className="text-xs font-medium mb-3"
          style={{ color: 'var(--text-3)' }}
        >
          快速開始
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {modes.map(mode => (
            <button
              key={mode.label}
              onClick={mode.onClick}
              className="flex flex-col gap-3 p-4 rounded-xl text-left transition-all active:scale-[.97] group"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = `var(${mode.accentVar})`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div className="flex items-center justify-between">
                <span style={{ color: `var(${mode.accentVar})` }}>{mode.icon}</span>
                <span
                  className="text-xs font-medium"
                  style={{ color: `var(${mode.accentVar})` }}
                >
                  {mode.count !== null ? `${mode.count} ${mode.countLabel}` : mode.countLabel}
                </span>
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                  {mode.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                  {mode.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {words.length === 0 && (
        <div
          className="text-center py-12 rounded-xl"
          style={{ border: '1px dashed var(--border)', color: 'var(--text-3)' }}
        >
          <p className="text-sm">單字庫空空的</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
            前往「單字庫」批次貼上或新增單字，即可開始測驗。
          </p>
        </div>
      )}
    </div>
  );
};
