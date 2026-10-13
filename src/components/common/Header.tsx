import React from 'react';
import { BookOpen, BarChart3, Zap, Settings, Trophy } from 'lucide-react';
import { SyncStatusBadge } from '../sync/SyncStatusBadge';
import { SyncStatus } from '../../types/vocabulary';
import { AuthState } from '../../types/auth';
import { CurrentPlayer } from '../../services/firebaseChallengeService';

export type TabType = 'test' | 'bank' | 'challenge' | 'stats';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  syncStatus: SyncStatus;
  authState: AuthState;
  currentPlayer?: CurrentPlayer | null;
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
  currentPlayer,
  onSyncClick,
  onUserClick,
  onOpenSettings,
  dueWordCount,
}) => {
  const isGoogleLoggedIn = Boolean(currentPlayer && !currentPlayer.isAnonymous);
  const displayName = isGoogleLoggedIn
    ? (currentPlayer?.displayName || 'Google 學習者')
    : (authState.user?.name || '一般使用者');
  const avatar = isGoogleLoggedIn
    ? currentPlayer?.photoURL
    : authState.user?.avatar;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'test',      label: '測驗',   icon: <Zap className="w-4 h-4" /> },
    { id: 'bank',      label: '單字庫', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'challenge', label: '競賽榜', icon: <Trophy className="w-4 h-4 text-amber-500" /> },
    { id: 'stats',     label: '統計',   icon: <BarChart3 className="w-4 h-4" /> },
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all"
            style={{
              color: 'var(--text-1)',
              border: isGoogleLoggedIn ? '1px solid #c7d2fe' : '1px solid var(--border)',
              background: isGoogleLoggedIn ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
            }}
            title={isGoogleLoggedIn ? `已登入 Google：${displayName}` : '訪客模式 / 點擊登入 Google'}
          >
            {avatar?.startsWith('http') ? (
              <img src={avatar} alt={displayName} className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <span className="text-sm leading-none">{avatar || '⚡'}</span>
            )}
            <span className="max-w-[100px] truncate text-xs hidden sm:inline font-medium">
              {displayName}
            </span>
            {isGoogleLoggedIn && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 hidden sm:inline-block shrink-0" title="Google 帳號已連線" />
            )}
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
