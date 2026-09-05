/**
 * Minimal on-screen debug logger for mobile devices (no DevTools access).
 * Usage: import { dbg } from './debugLogger'; dbg('message', value);
 * Show panel: tap the 🐛 button (only visible in debug mode).
 */

type LogEntry = { time: string; msg: string; color: string };
const MAX_LOGS = 60;

class DebugLogger {
  private logs: LogEntry[] = [];
  private listeners: Array<() => void> = [];
  public enabled = false;

  log(msg: string, data?: unknown, color = '#94a3b8') {
    const time = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    const text = data !== undefined ? `${msg}: ${JSON.stringify(data)}` : msg;
    this.logs.unshift({ time, msg: text, color });
    if (this.logs.length > MAX_LOGS) this.logs.pop();
    this.listeners.forEach(fn => fn());
    if (import.meta.env.DEV) console.log(`[DBG] ${text}`);
  }

  info(msg: string, data?: unknown)  { this.log(msg, data, '#60a5fa'); }
  ok(msg: string, data?: unknown)    { this.log(msg, data, '#34d399'); }
  warn(msg: string, data?: unknown)  { this.log(msg, data, '#fbbf24'); }
  error(msg: string, data?: unknown) { this.log(msg, data, '#f87171'); }

  getLogs() { return [...this.logs]; }
  clear()   { this.logs = []; this.listeners.forEach(fn => fn()); }

  subscribe(fn: () => void)   { this.listeners.push(fn); }
  unsubscribe(fn: () => void) { this.listeners = this.listeners.filter(l => l !== fn); }
}

export const dbg = new DebugLogger();
