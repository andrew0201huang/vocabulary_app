import React from 'react';
import { Zap, BookOpen, BarChart3, Settings } from 'lucide-react';
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

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onTabChange('test')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-900/30 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                  SpeedVocab
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hidden sm:inline-block">
                  反應時間
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block -mt-1 hidden sm:block">
                拼寫直覺反射單字庫
              </span>
            </div>
          </div>

          {/* Cloud Sync Status */}
          <div className="hidden sm:block ml-2">
            <SyncStatusBadge status={syncStatus} onSyncClick={onSyncClick} />
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onTabChange('test')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'test'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>測驗</span>
            {dueWordCount > 0 && activeTab !== 'test' && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 font-mono text-[10px]">
                {dueWordCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('bank')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'bank'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>單字庫</span>
          </button>

          <button
            onClick={() => onTabChange('stats')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'stats'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>統計</span>
          </button>
        </nav>

        {/* User Profile & Settings */}
        <div className="flex items-center gap-2">
          {/* Clickable User Profile Pill */}
          <button
            onClick={onUserClick}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl px-2.5 py-1.5 transition-all text-xs font-semibold text-slate-200"
            title="點擊切換使用者或設定雲端同步"
          >
            {user?.avatar?.startsWith('http') ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <span className="text-sm">{user?.avatar || '⚡'}</span>
            )}
            <span className="max-w-[85px] sm:max-w-[110px] truncate">
              {user?.name || '一般使用者'}
            </span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="偏好設定"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile sub-bar for sync badge */}
      <div className="sm:hidden px-4 py-1 bg-slate-900/60 border-t border-slate-800/40 flex justify-center">
        <SyncStatusBadge status={syncStatus} onSyncClick={onSyncClick} />
      </div>
    </header>
  );
};
