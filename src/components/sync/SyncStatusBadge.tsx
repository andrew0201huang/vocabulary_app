import React from 'react';
import { Cloud, CloudCheck, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { SyncStatus } from '../../types/vocabulary';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  onSyncClick?: () => void;
  isInteractive?: boolean;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  onSyncClick,
  isInteractive = true,
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: <CloudCheck className="w-4 h-4 text-emerald-400" />,
          label: 'Google Drive 已同步',
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20',
        };
      case 'syncing':
        return {
          icon: <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />,
          label: '同步雲端中...',
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
        };
      case 'offline':
        return {
          icon: <CloudOff className="w-4 h-4 text-amber-400" />,
          label: '離線快取中',
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
        };
      case 'error':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
          label: '同步異常 (重試)',
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20',
        };
      case 'local_only':
      default:
        return {
          icon: <Cloud className="w-4 h-4 text-slate-400" />,
          label: '本機模式 (未登入)',
          bg: 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/80',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <button
      onClick={onSyncClick}
      disabled={!isInteractive || status === 'syncing'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${config.bg} ${
        isInteractive ? 'cursor-pointer' : 'cursor-default'
      }`}
      title={status === 'local_only' ? '登入 Google 帳號即可將進度同步至 Google Drive' : '點擊手動同步'}
    >
      {config.icon}
      <span>{config.label}</span>
    </button>
  );
};
