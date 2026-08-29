/**
 * Format milliseconds into seconds string with 2 decimal places (e.g. 1.42s)
 */
export function formatSeconds(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms)) return '--';
  return (ms / 1000).toFixed(2) + 's';
}

/**
 * Format milliseconds into human readable label (e.g. 1.4s or 2m 15s)
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${(ms / 1000).toFixed(1)} 秒`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} 分 ${seconds} 秒`;
}

/**
 * Format ISO date string into friendly localized date (e.g. 2026/08/29 13:45)
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--';
  }
}

/**
 * Format relative time (e.g. "剛剛", "2小時前", "3天後")
 */
export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return '從未複習';
  try {
    const target = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.round((target - now) / 1000);

    if (Math.abs(diffSec) < 60) return '剛剛';

    if (diffSec > 0) {
      // Future
      const diffHours = Math.round(diffSec / 3600);
      const diffDays = Math.round(diffSec / 86400);
      if (diffHours < 24) return `${diffHours} 小時後`;
      return `${diffDays} 天後`;
    } else {
      // Past
      const pastSec = -diffSec;
      const pastMin = Math.round(pastSec / 60);
      const pastHours = Math.round(pastSec / 3600);
      const pastDays = Math.round(pastSec / 86400);

      if (pastMin < 60) return `${pastMin} 分鐘前`;
      if (pastHours < 24) return `${pastHours} 小時前`;
      return `${pastDays} 天前`;
    }
  } catch {
    return '--';
  }
}
