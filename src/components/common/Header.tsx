import React from 'react';
import { BookOpen, BarChart3, Zap, Settings } from 'lucide-react';
import { SyncStatusBadge } from '../sync/SyncStatusBadge';
import { SyncStatus } from '../../types/vocabulary';
import { AuthState } from '../../types/auth';

export type TabType = 'test' | 'bank' | 'stats';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  syncStatus: SyncStatus;
  authState: AuthState;
  onSyncClick: () => void;
  onUserClick: () => void;
  onOpenSettings: () => void;
  dueWordCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  syncStatus,
  authState,
  onSyncClick,
  onUserClick,
  onOpenSettings,
  dueWordCount,
}) => {
  const user = authState.user;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'test',  label: '測驗',   icon: <Zap className="w-4 h-4" /> },
    { id: 'bank',  label: '單字庫', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'stats', label: '統計',   icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Brand */}
        <button
          onClick={() => onTabChange('test')}
          className="flex items-center gap-2 shrink-0 group"
          style={{ color: 'var(--text-1)' }}
        >
          <span
            className="font-bold text-base tracking-tight group-hover:opacity-80 transition-opacity"
            style={{ letterSpacing: '-0.025em' }}
          >
            SpeedVocab
          </span>
        </button>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-0.5">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                  background: isActive ? 'var(--surface-2)' : 'transparent',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'test' && dueWordCount > 0 && !isActive && (
                  <span
                    className="text-[10px] font-bold px-1 rounded"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                  >
                    {dueWordCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: sync + user + settings */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block">
            <SyncStatusBadge status={syncStatus} onSyncClick={onSyncClick} />
          </div>

          <button
            onClick={onUserClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              color: 'var(--text-2)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
            title="使用者 / 雲端同步"
          >
            {user?.avatar?.startsWith('http') ? (
              <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full" />
            ) : (
              <span className="text-sm leading-none">{user?.avatar || '⚡'}</span>
            )}
            <span className="max-w-[90px] truncate text-xs hidden sm:inline" style={{ color: 'var(--text-1)' }}>
              {user?.name || '一般使用者'}
            </span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg transition-colors"
            style={{
              color: 'var(--text-2)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
            title="偏好設定"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
