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
          icon: <CloudCheck className="w-4 h-4 text-emerald-600" />,
          label: 'Google Drive 已同步',
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
        };
      case 'syncing':
        return {
          icon: <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />,
          label: '同步雲端中...',
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
        };
      case 'offline':
        return {
          icon: <CloudOff className="w-4 h-4 text-amber-500" />,
          label: '離線快取中',
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
        };
      case 'error':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
          label: '同步異常 (重試)',
          bg: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
        };
      case 'local_only':
      default:
        return {
          icon: <Cloud className="w-4 h-4 text-slate-500" />,
          label: '本機模式 (未登入)',
          bg: 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100',
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
